import { Router, Request, Response } from 'express';
import { store } from '../store.js';
import { isGigPublic } from '../publicData.js';
import { slugify } from '../../src/utils/slugify.js';
import { SITE_CONFIG } from '../../src/siteConfig.js';

export const rootRouter = Router();

rootRouter.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /workstream/\nDisallow: /checkout/\nDisallow: /payments/\nDisallow: /wallet/\nDisallow: /add-service\n\nSitemap: ${SITE_CONFIG.baseUrl}/sitemap.xml\n`
  );
});

rootRouter.get('/sitemap.xml', async (_req, res) => {
  try {
    const baseUrl = SITE_CONFIG.baseUrl;
    const rawGigs = await store.listGigs();
    const gigs = rawGigs.filter(isGigPublic);
    const staticEntries = [
      { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/services`, changefreq: 'daily', priority: '0.9' },
      { loc: `${baseUrl}/categories/seo`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/categories/pr-press-releases`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/categories/ugc-ai-videos`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/categories/web-development`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/categories/ecommerce`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/categories/software-development`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/support`, changefreq: 'monthly', priority: '0.6' },
      { loc: `${baseUrl}/terms`, changefreq: 'monthly', priority: '0.5' },
      { loc: `${baseUrl}/privacy`, changefreq: 'monthly', priority: '0.5' },
      { loc: `${baseUrl}/refund-policy`, changefreq: 'monthly', priority: '0.5' }
    ];
    const gigEntries = gigs.map((g) => {
      const gslug = (g.slug || slugify(g.title || '')).toLowerCase();
      return { loc: `${baseUrl}/services/${gslug}`, changefreq: 'weekly', priority: '0.7' };
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      [...staticEntries, ...gigEntries]
        .map(u => `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
        .join('\n') +
      `\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

