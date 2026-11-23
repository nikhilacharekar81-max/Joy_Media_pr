/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createHash } from 'crypto';
import { pathToFileURL } from 'url';
import type { Express, Request, Response } from 'express';
import { isGigPublic, sanitizePublicGig, isUserPublic, sanitizePublicUser, isProjectPublic, sanitizePublicProject } from './publicData.js';
import { slugify } from '../src/utils/slugify.js';
import { PRIVATE_ROUTES, RESERVED_ROUTES } from '../src/shared/routes.js';

interface SsrHtmlCacheEntry {
  statusCode: number;
  rawBuf: Buffer;
  gzipBuf: Buffer;
  etag: string;
  expiresAt: number;
  hydrated: boolean;
}

const SSR_HTML_CACHE_TTL_MS = 30_000;
const ssrHtmlCache = new Map<string, SsrHtmlCacheEntry>();
const CACHEABLE_PUBLIC_PATHS = new Set([
  '/',
  '/gigs',
  '/projects',
  '/search-projects',
  '/project-search',
  '/freelance-jobs',
  '/freelancers',
  '/search-freelancers',
  '/freelancer-search',
  '/terms',
  '/privacy',
  '/refund-policy'
]);

export function invalidateSsrHtmlCache() {
  ssrHtmlCache.clear();
}

function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

function getGigUrl(gig: any) {
  const uname = (gig.freelancerUsername || slugify(gig.freelancerName)).toLowerCase();
  const gslug = (gig.slug || slugify(gig.title)).toLowerCase();
  return `/${uname}/${gslug}`;
}

function getLatestMtimeMs(targetPath: string): number {
  let latest = 0;
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isFile()) return stat.mtimeMs;
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(targetPath, { withFileTypes: true });
      for (const entry of entries) {
        const sub = getLatestMtimeMs(path.join(targetPath, entry.name));
        if (sub > latest) latest = sub;
      }
    }
  } catch {}
  return latest;
}

/**
 * Strip `crossorigin` ONLY from local `/assets/*` tags so proxy cookies are sent,
 * while preserving `crossorigin` on external preconnect links (e.g. fonts.gstatic.com).
 */
function stripLocalAssetCrossorigin(html: string): string {
  return html.replace(/<(script|link)\b[^>]*>/gi, (tag) => {
    if (/href=["']https?:\/\//i.test(tag) || /src=["']https?:\/\//i.test(tag)) {
      return tag;
    }
    return tag.replace(/\s+crossorigin(?:=["'][^"']*["'])?/gi, '');
  });
}

function sendCachedEntry(req: Request, res: Response, entry: SsrHtmlCacheEntry) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('ETag', entry.etag);
  res.setHeader('Vary', 'Accept-Encoding');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

  if (req.headers['if-none-match'] === entry.etag) {
    return res.status(304).end();
  }

  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Length', String(entry.gzipBuf.length));
    return res.status(entry.statusCode).end(entry.gzipBuf);
  }

  res.setHeader('Content-Length', String(entry.rawBuf.length));
  return res.status(entry.statusCode).end(entry.rawBuf);
}

export async function setupSSR(
  app: Express,
  isProd: boolean,
  root: string,
  getData: (pathname?: string) => Promise<{ gigs: any[]; users: any[]; projects: any[]; categories: any[]; hydrated?: boolean }> | { gigs: any[]; users: any[]; projects: any[]; categories: any[]; hydrated?: boolean }
) {
  let vite: any;
  let templateHtml: string = '';
  let devTransformedTemplate: string | null = null;
  let devCompiledCss: string | null = null;
  let ssrRender: any;
  let ssrRenderPromise: Promise<any> | null = null;

  const stripDefaultMetaTags = (html: string) =>
    html
      .replace(/<title>.*?<\/title>/gi, '')
      .replace(/<meta\s+name=["']description["'].*?>/gi, '')
      .replace(/<meta\s+name=["']robots["'].*?>/gi, '')
      .replace(/<link\s+rel=["']canonical["'].*?>/gi, '')
      .replace(/<meta\s+property=["']og:.*?["'].*?>/gi, '')
      .replace(/<meta\s+name=["']twitter:.*?["'].*?>/gi, '');

  const stripDevCssLink = (html: string) =>
    html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']\/src\/index\.css["'][^>]*\/?>/gi, '');

  const stripUnusedViteClient = (html: string) =>
    html.replace(/<script\s+[^>]*src=["']\/@vite\/client["'][^>]*><\/script>\s*/gi, '');

  const distPath = path.resolve(root, 'dist');
  const clientDist = path.resolve(distPath, 'client');
  const serverDist = path.resolve(distPath, 'server');
  const clientIndexHtml = path.resolve(clientDist, 'index.html');
  const assetsDir = path.resolve(clientDist, 'assets');
  const publicDir = path.resolve(root, 'public');
  const isTest = process.env.NODE_ENV === 'test';

  let hasProdBuild = false;
  if (!isTest && fs.existsSync(clientIndexHtml) && fs.existsSync(assetsDir)) {
    if (isProd) {
      hasProdBuild = true;
    } else {
      const distMtime = getLatestMtimeMs(clientIndexHtml);
      const srcMtime = Math.max(
        getLatestMtimeMs(path.resolve(root, 'src')),
        getLatestMtimeMs(path.resolve(root, 'index.html'))
      );
      // Allow 2s tolerance for build steps finishing right after file writes
      hasProdBuild = distMtime + 2000 >= srcMtime;
    }
  }

  const renderAndBuildHtml = async (pathname: string, query: string | undefined) => {
    const pathParts = pathname.split('/').filter(Boolean);

    // 1. Load current PUBLIC data
    const rawData = await getData(pathname);
    const isDataHydrated = rawData.hydrated !== false;
    const PUBLIC_GIGS = rawData.gigs.filter(isGigPublic).map(sanitizePublicGig);
    const PUBLIC_USERS = rawData.users.filter(isUserPublic).map(sanitizePublicUser);
    const PUBLIC_PROJECTS = rawData.projects.filter(isProjectPublic).map(sanitizePublicProject);
    const PUBLIC_CATEGORIES = rawData.categories || [];

    let initialData: any = {
      ...(query !== undefined ? { query } : {}),
      ssrHydrated: isDataHydrated,
      gigs: PUBLIC_GIGS,
      users: PUBLIC_USERS,
      projects: PUBLIC_PROJECTS,
      ...(PUBLIC_CATEGORIES.length > 0 ? { categories: PUBLIC_CATEGORIES } : {})
    };

    let notFound = false;
    let isPrivate = false;

    // 2. Determine pageType and matching entity
    const isPrivateRoute = (p: string) => {
      const parts = p.split('/').filter(Boolean);
      return parts.length > 0 && PRIVATE_ROUTES.some(pr => parts[0].toLowerCase() === pr.toLowerCase());
    };

    if (isPrivateRoute(pathname)) {
      isPrivate = true;
      initialData.isPrivate = true;
      initialData.pageType = 'private';
    } else if (pathname === '/' || pathname === '') {
      initialData.pageType = 'home';
    } else if (pathname === '/gigs') {
      initialData.pageType = 'gigs';
    } else if (pathname.startsWith('/categories/')) {
      initialData.pageType = 'gigs';
    } else if (['/projects', '/search-projects', '/project-search', '/freelance-jobs'].includes(pathname)) {
      initialData.pageType = 'projects';
    } else if (['/freelancers', '/search-freelancers', '/freelancer-search'].includes(pathname)) {
      initialData.pageType = 'freelancers';
    } else if (['/terms', '/privacy', '/refund-policy'].includes(pathname)) {
      initialData.pageType = 'legal';
      initialData.legalType = pathname.slice(1);
    } else if (pathParts.length >= 2 && (pathParts[0].toLowerCase() === 'gig' || pathParts[0].toLowerCase() === 'gigs')) {
      const gigId = pathParts[1];
      const subSlug = pathParts[2];
      const matchedGig = PUBLIC_GIGS.find(g => g.id === gigId || (g.slug && g.slug.toLowerCase() === gigId.toLowerCase()) || (subSlug && g.slug && g.slug.toLowerCase() === subSlug.toLowerCase()));
      if (matchedGig) {
        initialData.pageType = 'gig_detail';
        initialData.gig = matchedGig;
      } else {
        notFound = true;
      }
    } else if (pathParts.length === 2 && (pathParts[0].toLowerCase() === 'projects' || pathParts[0].toLowerCase() === 'project')) {
      const projId = pathParts[1];
      const matchedProj = PUBLIC_PROJECTS.find(p => p.id === projId || (p.slug && p.slug.toLowerCase() === projId.toLowerCase()));
      if (matchedProj) {
        initialData.pageType = 'project_detail';
        initialData.project = matchedProj;
      } else {
        notFound = true;
      }
    } else if (pathParts.length === 2 && RESERVED_ROUTES.includes(pathParts[0].toLowerCase())) {
      notFound = true;
    } else if (pathParts.length === 2) {
      const [username, gigSlug] = pathParts;
      const matchedGig = PUBLIC_GIGS.find(g => {
        const gUrl = getGigUrl(g).toLowerCase();
        const target = `/${username.toLowerCase()}/${gigSlug.toLowerCase()}`;
        return gUrl === target || (g.slug && g.slug.toLowerCase() === gigSlug.toLowerCase()) || g.id === gigSlug;
      });
      if (matchedGig) {
        initialData.pageType = 'gig_detail';
        initialData.gig = matchedGig;
      } else {
        notFound = true;
      }
    } else if (pathParts.length === 1) {
      const usernameParam = pathParts[0];
      const matchedUser = PUBLIC_USERS.find(u => (u.username && u.username.toLowerCase() === usernameParam.toLowerCase()) || slugify(u.name) === usernameParam.toLowerCase() || u.id === usernameParam);
      if (matchedUser) {
        initialData.pageType = 'freelancer_profile';
        initialData.profileUser = matchedUser;
      } else {
        notFound = true;
      }
    } else {
      notFound = true;
    }

    if (notFound) {
      initialData.notFound = true;
    }

    // 3. Prepare HTML template
    let template = templateHtml || fs.readFileSync(path.resolve(root, 'index.html'), 'utf-8');
    if (!hasProdBuild && vite) {
      if (!devTransformedTemplate) {
        const transformed = await vite.transformIndexHtml('/', template);
        devTransformedTemplate = stripUnusedViteClient(stripDefaultMetaTags(transformed));
      }
      template = devTransformedTemplate;
      if (!devCompiledCss) {
        try {
          const cssRes = await vite.transformRequest('/src/index.css?direct');
          if (cssRes?.code && !cssRes.code.startsWith('import ')) {
            devCompiledCss = cssRes.code;
          }
        } catch {}
      }
    }

    // 4. React SSR render full HTML
    let renderFn = ssrRender;
    if (!renderFn && ssrRenderPromise) {
      renderFn = await ssrRenderPromise;
    }
    if (!renderFn && !hasProdBuild && vite) {
      const mod = await vite.ssrLoadModule('/src/entry-server.tsx');
      renderFn = mod.render;
      ssrRender = renderFn;
    }

    const rendered = renderFn ? renderFn(pathname, initialData) : { html: '', head: '' };

    const serializedInitialData = JSON.stringify(initialData)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    // Only inline compiled CSS in unbundled Vite dev fallback; built assets use immutable cached <link rel="stylesheet">
    const inlineCssTag = (!hasProdBuild && devCompiledCss) ? `\n<style id="ssr-dev-css">${devCompiledCss}</style>` : '';
    const cleanedTemplate = (!hasProdBuild && devCompiledCss) ? stripDevCssLink(template) : template;

    const finalHtml = cleanedTemplate
      .replace('</head>', () => `${rendered.head}${inlineCssTag}\n</head>`)
      .replace(
        '<div id="root"></div>',
        () => `<div id="root">${rendered.html}</div>\n<script>window.__INITIAL_DATA__ = ${serializedInitialData};</script>`
      );

    return {
      finalHtml,
      statusCode: notFound ? 404 : 200,
      isPrivate,
      notFound,
      hydrated: isDataHydrated
    };
  };

  if (isTest) {
    templateHtml = stripDefaultMetaTags(fs.readFileSync(path.resolve(root, 'index.html'), 'utf-8'));
    const mod = await import('../src/entry-server.tsx');
    ssrRender = mod.render;
  } else if (!hasProdBuild) {
    const { createServer } = await import('vite');
    vite = await createServer({
      root,
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
        allowedHosts: true
      },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir, { index: false, maxAge: '1h' }));
    }
    templateHtml = fs.readFileSync(path.resolve(root, 'index.html'), 'utf-8');

    // Pre-warm HTML transform, CSS bundle & SSR entry module in background
    vite.transformIndexHtml('/', templateHtml).then((transformed: string) => {
      devTransformedTemplate = stripUnusedViteClient(stripDefaultMetaTags(transformed));
    }).catch(() => {});

    ssrRenderPromise = vite.ssrLoadModule('/src/entry-server.tsx').then(async (mod: any) => {
      ssrRender = mod.render;
      try {
        const cssRes = await vite.transformRequest('/src/index.css?direct');
        if (cssRes?.code && !cssRes.code.startsWith('import ')) {
          devCompiledCss = cssRes.code;
        }
      } catch {}
      return ssrRender;
    }).catch((err: any) => {
      console.warn('Vite SSR module load warning:', err);
      return null;
    });
  } else {
    // Serve hashed Vite bundles with 1-year immutable caching (including /assets/index-*.css)
    app.use('/assets', express.static(assetsDir, { index: false, maxAge: '1y', immutable: true }));
    app.use('/assets', (_req, res, next) => {
      // Never cache missing hashed chunk 404s across rebuilds
      res.setHeader('Cache-Control', 'no-store');
      next();
    });
    if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir, { index: false, maxAge: '1h' }));
    }

    const rawBuiltHtml = stripLocalAssetCrossorigin(stripDefaultMetaTags(fs.readFileSync(clientIndexHtml, 'utf-8')));
    templateHtml = rawBuiltHtml;

    // Load dist/server/entry-server.js asynchronously so server.listen() binds immediately without waiting 470ms
    const loadServerEntry = async () => {
      if (fs.existsSync(serverDist)) {
        const serverEntryFiles = fs.readdirSync(serverDist);
        const entryFile = serverEntryFiles.find(f => f.startsWith('entry-server') && (f.endsWith('.js') || f.endsWith('.mjs')));
        if (entryFile) {
          const ssrModule = await import(pathToFileURL(path.resolve(serverDist, entryFile)).href);
          ssrRender = ssrModule.render;
          return ssrRender;
        }
      }
      const mod = await import('../src/entry-server.tsx');
      ssrRender = mod.render;
      return ssrRender;
    };

    ssrRenderPromise = loadServerEntry()
      .then(async (renderFn) => {
        // Immediately pre-warm and pre-compress `/` into RAM so even the very first hit is < 0.3ms
        try {
          const result = await renderAndBuildHtml('/', undefined);
          if (!result.isPrivate && !result.notFound) {
            const rawBuf = Buffer.from(result.finalHtml, 'utf8');
            const gzipBuf = zlib.gzipSync(rawBuf, { level: 6 });
            const etag = `W/"${createHash('sha1').update(rawBuf).digest('base64url').slice(0, 16)}"`;
            ssrHtmlCache.set('/', {
              statusCode: result.statusCode,
              rawBuf,
              gzipBuf,
              etag,
              expiresAt: Date.now() + SSR_HTML_CACHE_TTL_MS,
              hydrated: result.hydrated
            });
          }
        } catch {}
        return renderFn;
      })
      .catch((err) => {
        console.error('[SSR] Failed to load server entry:', err);
        return null;
      });
  }

  // Single SSR Flow: Express gets request -> checks pre-compressed RAM cache -> else renders & caches
  app.use('*', async (req: Request, res: Response, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }

    const [rawPathname, query] = req.originalUrl.split('?');
    let pathname = safeDecodeURIComponent(rawPathname);
    if (pathname.endsWith('/index.html')) {
      pathname = pathname.slice(0, -11) || '/';
    } else if (pathname.endsWith('.html')) {
      pathname = pathname.slice(0, -5) || '/';
    }

    const ext = path.extname(pathname);
    const accept = req.headers.accept || '';
    const secFetchDest = req.headers['sec-fetch-dest'] || '';

    const isViteOrAssetPath =
      pathname.startsWith('/@vite') ||
      pathname.startsWith('/@id') ||
      pathname.startsWith('/@fs') ||
      pathname.startsWith('/@react-refresh') ||
      pathname.startsWith('/node_modules') ||
      pathname.startsWith('/src') ||
      (Boolean(ext) && ext !== '.html');

    const isNonHtmlAccept =
      Boolean(accept) &&
      !accept.includes('text/html') &&
      !accept.includes('*/*');

    const isSubresourceFetch =
      secFetchDest !== '' && secFetchDest !== 'document' && secFetchDest !== 'iframe' && secFetchDest !== 'empty';

    if (!hasProdBuild && (isViteOrAssetPath || isNonHtmlAccept || isSubresourceFetch)) {
      return next();
    }

    if (ext && ext !== '.html') {
      return next();
    }

    try {
      const normalizedPath = pathname.replace(/\/+$/, '').toLowerCase() || '/';
      const canUseHtmlCache = !isTest && !query && CACHEABLE_PUBLIC_PATHS.has(normalizedPath);

      if (canUseHtmlCache) {
        const cached = ssrHtmlCache.get(normalizedPath);
        if (cached && cached.expiresAt > Date.now()) {
          return sendCachedEntry(req, res, cached);
        }
      }

      const result = await renderAndBuildHtml(pathname, query);

      if (canUseHtmlCache && !result.isPrivate && !result.notFound) {
        const rawBuf = Buffer.from(result.finalHtml, 'utf8');
        const gzipBuf = zlib.gzipSync(rawBuf, { level: 6 });
        const etag = `W/"${createHash('sha1').update(rawBuf).digest('base64url').slice(0, 16)}"`;
        const entry: SsrHtmlCacheEntry = {
          statusCode: result.statusCode,
          rawBuf,
          gzipBuf,
          etag,
          expiresAt: Date.now() + SSR_HTML_CACHE_TTL_MS,
          hydrated: result.hydrated
        };
        ssrHtmlCache.set(normalizedPath, entry);
        return sendCachedEntry(req, res, entry);
      }

      if (result.isPrivate) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }

      return res.status(result.statusCode).setHeader('Content-Type', 'text/html; charset=utf-8').end(result.finalHtml);

    } catch (e: any) {
      if (!isProd && vite) {
        try {
          vite.ssrFixStacktrace(e);
        } catch {}
      }
      console.error('SSR Error:', e);
      try {
        let template = templateHtml || fs.readFileSync(path.resolve(root, 'index.html'), 'utf-8');
        if (!hasProdBuild && vite) {
          try {
            template = await vite.transformIndexHtml('/', template);
          } catch {
            // Keep template as is if transformIndexHtml fails
          }
        }
        return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').end(template);
      } catch {
        next(e);
      }
    }
  });
}
