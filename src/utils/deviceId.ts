import { SITE_CONFIG } from '../siteConfig';

const DEVICE_ID_KEY = `${SITE_CONFIG.brandWordmark.toLowerCase()}_device_id`;

export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return 'dev_server_side';
  try {
    let devId = localStorage.getItem(DEVICE_ID_KEY);
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 12);
      localStorage.setItem(DEVICE_ID_KEY, devId);
    }
    return devId;
  } catch {
    return 'dev_browser_session';
  }
};
