/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PRIVATE_ROUTES = [
  'admin', 'messages', 'workstream', 'workstreams', 'workspace', 'orders', 'payments', 
  'wallet', 'settings', 'edit-profile', 'login', 'signup', 'forgot-password', 'verify', 
  'wishlist', 'notifications', 'switch-user', 'post-project', 'add-service', 'create-gig', 'post-gig', 'support', 'freelancer', 'freelance-activity', 'buyer-activity',
  'checkout'
];

export const RESERVED_ROUTES = [
  ...PRIVATE_ROUTES,
  'services', 'service', 'gigs', 'gig', 'projects', 'search-projects', 'project-search', 'freelance-jobs', 'categories', 'freelancers', 'search-freelancers', 'freelancer-search', 'profile',
  'terms', 'privacy', 'refund-policy'
];
