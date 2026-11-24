/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.tsx';
import { slugify } from './utils/slugify.js';
import { SITE_CONFIG } from './siteConfig.js';

function escapeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function render(url: string, initialData?: any) {
  const html = renderToString(<App initialPath={url} initialData={initialData} />);
  
  let headTags: string[] = [];
  const pageType = initialData?.pageType;
  const gig = initialData?.gig;
  const profileUser = initialData?.profileUser;
  const notFound = initialData?.notFound;
  const isPrivate = initialData?.isPrivate;

  const baseUrl = SITE_CONFIG.baseUrl;
  const cleanUrlPath = url.split('?')[0];
  const canonical = gig
    ? `${baseUrl}/services/${(gig.slug || slugify(gig.title || '')).toLowerCase()}`
    : (pageType === 'gigs' && (cleanUrlPath === '/gigs' || cleanUrlPath === '/services'))
      ? `${baseUrl}/services`
      : `${baseUrl}${cleanUrlPath}`;

  // Robots
  if (notFound || isPrivate || pageType === 'private') {
    headTags.push('<meta name="robots" content="noindex, nofollow" />');
  } else {
    headTags.push('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />');
  }

  headTags.push(`<meta property="og:site_name" content="${SITE_CONFIG.brandName}" />`);

  // Title & Description
  if (notFound) {
    headTags.push(`<title>Page Not Found | ${SITE_CONFIG.brandName}</title>`);
    headTags.push('<meta name="description" content="The requested page could not be found." />');
  } else if (isPrivate || pageType === 'private') {
    headTags.push(`<title>Client Area | ${SITE_CONFIG.brandName}</title>`);
    headTags.push(`<meta name="description" content="Secure ${SITE_CONFIG.brandName} client area." />`);
  } else if (gig) {
    const strippedGigTitle = (gig.title || '').trim().replace(/^i\s+will\s+/i, '').trim();
    const cleanTitle = strippedGigTitle
      ? strippedGigTitle.charAt(0).toUpperCase() + strippedGigTitle.slice(1)
      : (gig.title || '');
    const title = `${escapeHtml(cleanTitle)} | ${SITE_CONFIG.brandName}`;
    headTags.push(`<title>${title}</title>`);
    headTags.push(`<meta name="description" content="${escapeHtml((gig.description || '').slice(0, 160))}" />`);
    
    // JSON-LD
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": cleanTitle,
      "description": gig.description,
      "provider": { "@type": "Organization", "name": SITE_CONFIG.brandName },
      "offers": { "@type": "Offer", "price": gig.price, "priceCurrency": "USD" }
    };
    if (gig.reviewsCount > 0 && gig.rating) {
      (jsonLd as any).aggregateRating = { "@type": "AggregateRating", "ratingValue": gig.rating, "reviewCount": gig.reviewsCount };
    }
    headTags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`);
  } else if (profileUser) {
    headTags.push(`<title>${escapeHtml(profileUser.name)} - ${escapeHtml(profileUser.title)} | ${SITE_CONFIG.brandName}</title>`);
    headTags.push(`<meta name="description" content="${escapeHtml((profileUser.bio || '').slice(0, 160))}" />`);
  } else if (pageType === 'gigs') {
    headTags.push(`<title>Our Services | ${SITE_CONFIG.brandName}</title>`);
    headTags.push(`<meta name="description" content="Explore guest posting, press releases, UGC AI videos, custom web development, Shopify solutions, and digital products by ${SITE_CONFIG.brandName}." />`);
    if (initialData?.gigs) {
      const itemList = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": initialData.gigs.map((g: any, i: number) => ({
          "@type": "ListItem", "position": i + 1, "url": `${baseUrl}/services/${(g.slug || slugify(g.title)).toLowerCase()}`
        }))
      };
      headTags.push(`<script type="application/ld+json">${JSON.stringify(itemList).replace(/</g, '\\u003c')}</script>`);
    }
  } else if (pageType === 'projects') {
    headTags.push(`<title>Custom Requests | ${SITE_CONFIG.brandName}</title>`);
    headTags.push(`<meta name="description" content="Submit and manage custom project briefs with ${SITE_CONFIG.brandName}." />`);
  } else if (pageType === 'freelancers') {
    headTags.push(`<title>Our Team | ${SITE_CONFIG.brandName}</title>`);
    headTags.push(`<meta name="description" content="Meet the digital PR and growth specialists at ${SITE_CONFIG.brandName}." />`);
  } else if (pageType === 'legal') {
    const docTitle = initialData?.legalType === 'privacy'
      ? 'Privacy Policy'
      : initialData?.legalType === 'refund-policy'
      ? 'Refund Policy'
      : 'Terms of Service';
    headTags.push(`<title>${docTitle} | ${SITE_CONFIG.brandName}</title>`);
    headTags.push(`<meta name="description" content="Terms, privacy and refund information for ${SITE_CONFIG.brandName}." />`);
  } else {
    headTags.push(`<title>${SITE_CONFIG.brandName} | ${escapeHtml(SITE_CONFIG.tagline)}</title>`);
    headTags.push(`<meta name="description" content="${SITE_CONFIG.brandName} delivers guest posting, press releases, UGC AI videos, custom web development, Shopify solutions, and digital products." />`);
  }

  headTags.push(`<link rel="canonical" href="${canonical}" />`);

  return { html, head: headTags.join('\n') };
}
