import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';

const configuredBucketName = process.env.GCS_BUCKET_NAME || process.env.CLOUD_STORAGE_BUCKET;
const bucketName = configuredBucketName || 'workperhour-uploads-bucket';

let cachedBucketPromise: Promise<any> | null = null;
function getGcsBucket(): Promise<any> {
  if (!cachedBucketPromise) {
    cachedBucketPromise = import('@google-cloud/storage')
      .then(({ Storage }) => {
        const storage = new Storage();
        return storage.bucket(bucketName);
      })
      .catch((err) => {
        cachedBucketPromise = null;
        throw err;
      });
  }
  return cachedBucketPromise;
}

function assertProductionBucketConfigured(): void {
  if (process.env.NODE_ENV === 'production' && !configuredBucketName) {
    throw new Error('Cloud storage configuration missing: GCS_BUCKET_NAME or CLOUD_STORAGE_BUCKET must be set in production.');
  }
}

export async function uploadFileToCloudStorage(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
  const safeFilename = path.basename(filename);
  const isTestOrLocal = process.env.NODE_ENV === 'test' || (!configuredBucketName && !process.env.GOOGLE_CLOUD_PROJECT && process.env.NODE_ENV !== 'production');
  
  if (isTestOrLocal) {
    const localDir = path.join(process.cwd(), 'data', 'uploads', 'workstream');
    await fs.promises.mkdir(localDir, { recursive: true });
    const localPath = path.join(localDir, safeFilename);
    await fs.promises.writeFile(localPath, buffer);
    return `/uploads/workstream/${safeFilename}`;
  }

  assertProductionBucketConfigured();

  try {
    const bucket = await getGcsBucket();
    const file = bucket.file(`workstream/${safeFilename}`);
    await file.save(buffer, {
      contentType: mimeType,
      resumable: false,
    });
    return `https://storage.googleapis.com/${bucketName}/workstream/${safeFilename}`;
  } catch (err) {
    console.error('[CloudStorage ERROR] Failed to upload file to GCS:', err);
    throw err;
  }
}

export async function deleteFileFromCloudStorage(filename: string): Promise<void> {
  const safeFilename = path.basename(filename);
  const isTestOrLocal = process.env.NODE_ENV === 'test' || (!configuredBucketName && !process.env.GOOGLE_CLOUD_PROJECT && process.env.NODE_ENV !== 'production');
  if (isTestOrLocal) {
    const localPath = path.join(process.cwd(), 'data', 'uploads', 'workstream', safeFilename);
    try { await fs.promises.unlink(localPath); } catch {}
    return;
  }

  assertProductionBucketConfigured();

  try {
    const bucket = await getGcsBucket();
    const file = bucket.file(`workstream/${safeFilename}`);
    await file.delete({ ignoreNotFound: true });
  } catch (err) {
    console.error('[CloudStorage ERROR] Failed to delete file from GCS:', err);
  }
}

export function openCloudFileStream(
  filename: string,
  authUser?: any,
  checkAccess?: (user: any, filename: string) => boolean
) {
  assertProductionBucketConfigured();
  const safeFilename = path.basename(filename);
  if (checkAccess && (!authUser || !checkAccess(authUser, safeFilename))) {
    throw new Error('Unauthorized file access');
  }
  const passThrough = new PassThrough();
  getGcsBucket()
    .then((bucket) => {
      const readStream = bucket.file(`workstream/${safeFilename}`).createReadStream();
      readStream.on('error', (err: any) => passThrough.destroy(err));
      readStream.pipe(passThrough);
    })
    .catch((err) => {
      passThrough.destroy(err);
    });
  return passThrough;
}

