import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

if (process.env.NODE_ENV === 'test' || process.env.SKIP_ENSURE_DIST === '1') {
  process.exit(0);
}

function getLatestMtimeMs(targetPath) {
  let latest = 0;
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isFile()) return stat.mtimeMs;
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(targetPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const sub = getLatestMtimeMs(path.join(targetPath, entry.name));
        if (sub > latest) latest = sub;
      }
    }
  } catch {}
  return latest;
}

function hasFreshBuild() {
  const clientIndex = path.join(root, 'dist', 'client', 'index.html');
  const clientAssets = path.join(root, 'dist', 'client', 'assets');
  const serverDir = path.join(root, 'dist', 'server');

  if (!fs.existsSync(clientIndex) || !fs.existsSync(clientAssets) || !fs.existsSync(serverDir)) {
    return false;
  }

  let hasServerEntry = false;
  try {
    hasServerEntry = fs
      .readdirSync(serverDir)
      .some((f) => f.startsWith('entry-server') && (f.endsWith('.js') || f.endsWith('.mjs')));
  } catch {
    return false;
  }
  if (!hasServerEntry) return false;

  const distMtime = getLatestMtimeMs(clientIndex);
  const srcMtime = Math.max(
    getLatestMtimeMs(path.join(root, 'src')),
    getLatestMtimeMs(path.join(root, 'index.html')),
    getLatestMtimeMs(path.join(root, 'vite.config.ts'))
  );

  // Match 2s tolerance used in server/ssr.ts
  return distMtime + 2000 >= srcMtime;
}

if (hasFreshBuild()) {
  process.exit(0);
}

console.log('[ensure-dist] Pre-built dist/ missing or stale. Running production bundle build...');
const startedAt = Date.now();
try {
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
  console.log(`[ensure-dist] Build ready in ${Date.now() - startedAt}ms.`);
} catch (err) {
  console.warn('[ensure-dist] Build failed; falling back to Vite dev middleware:', err?.message || err);
}
