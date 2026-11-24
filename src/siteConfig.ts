export const SITE_CONFIG = {
  brandName: 'Joy Media PR',
  brandWordmark: 'JoyMediaPR',
  domain: 'joymediapr.com',
  baseUrl: 'https://joymediapr.com',
  emails: {
    hello: 'hello@joymediapr.com',
    support: 'support@joymediapr.com',
    privacy: 'privacy@joymediapr.com',
    notifications: 'notifications@joymediapr.com',
  },
  business: {
    legalName: '',
    address: '',
    taxId: '',
    supportPhone: '',
  },
  tagline: 'Digital PR, Media Placement & Growth Agency',
  copyright: '© 2026 Joy Media PR. All rights reserved.',
  AGENCY_MODE: true,
} as const;

export const AGENCY_MODE = SITE_CONFIG.AGENCY_MODE;
