/**
 * Lightweight cookie consent for static corporate HTML pages (same key as main SPA).
 */
import {
  acceptAnalyticsConsent,
  bootAnalyticsMeasurement,
  declineAnalyticsConsent,
  hasAnalyticsConsent
} from './analytics-consent-boot.js';
import { STORAGE_KEYS, readStorageRaw } from '../core/storage-keys.js';

function readConsent() {
  return readStorageRaw(STORAGE_KEYS.COOKIE_CONSENT);
}

function initStaticCookieConsent() {
  const banner = document.getElementById('static-cookie-consent');
  if (!banner) return;

  const existing = readConsent();
  if (existing === 'accepted') {
    banner.hidden = true;
    void bootAnalyticsMeasurement();
    return;
  }
  if (existing === 'declined') {
    banner.hidden = true;
    return;
  }

  banner.hidden = false;
  banner.querySelector('[data-static-cookie-accept]')?.addEventListener('click', () => {
    acceptAnalyticsConsent();
    banner.hidden = true;
  });
  banner.querySelector('[data-static-cookie-decline]')?.addEventListener('click', () => {
    declineAnalyticsConsent();
    banner.hidden = true;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStaticCookieConsent);
} else {
  initStaticCookieConsent();
}

export { hasAnalyticsConsent };
