/**
 * Standalone rehber pages — AdSense after cookie consent (see cerez-politikasi).
 */
import { initRehberAds } from '../core/adsense.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initRehberAds());
} else {
  initRehberAds();
}

document.addEventListener('cookieConsentAccepted', () => initRehberAds());
