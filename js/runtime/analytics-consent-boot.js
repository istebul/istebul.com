/**
 * Shared analytics boot after cookie consent (SPA, static HTML, verticals).
 */
import { analytics } from '../core/analytics.js';
import { initSiteAnalyticsPage } from '../platform/site-analytics.js';
import { STORAGE_KEYS, readStorageRaw, writeStorageRaw } from '../core/storage-keys.js';

export function hasAnalyticsConsent() {
  return readStorageRaw(STORAGE_KEYS.COOKIE_CONSENT) === 'accepted';
}

let measurementBooted = false;

export async function bootAnalyticsMeasurement() {
  if (!hasAnalyticsConsent() || measurementBooted) return;
  measurementBooted = true;

  console.info('[Consent]', readStorageRaw(STORAGE_KEYS.COOKIE_CONSENT));

  try {
    const { updateGa4ConsentGranted, loadThirdPartyMeasurement } = await import(
      '../core/third-party-analytics.js'
    );
    updateGa4ConsentGranted();
    loadThirdPartyMeasurement();
  } catch {
    /* optional providers */
  }

  analytics.init();
  initSiteAnalyticsPage();

  document.dispatchEvent(new CustomEvent('cookieConsentAccepted'));
}

export function acceptAnalyticsConsent() {
  writeStorageRaw(STORAGE_KEYS.COOKIE_CONSENT, 'accepted');
  console.info('[Consent]', readStorageRaw(STORAGE_KEYS.COOKIE_CONSENT));
  void bootAnalyticsMeasurement();
}

export function declineAnalyticsConsent() {
  writeStorageRaw(STORAGE_KEYS.COOKIE_CONSENT, 'declined');
}

const VERTICAL_COOKIE_BANNER_ID = 'vertical-cookie-consent';

/**
 * Minimal consent UI for vertical pages that omit the homepage banner.
 */
function ensureCookieConsentStyles() {
  if (document.querySelector('link[data-cookie-consent-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/static-cookie-consent-v1.css?v=1';
  link.dataset.cookieConsentCss = '1';
  document.head.appendChild(link);
}

export function ensureVerticalCookieBanner() {
  if (hasAnalyticsConsent() || readStorageRaw(STORAGE_KEYS.COOKIE_CONSENT) === 'declined') {
    return;
  }
  if (document.getElementById('cookie-consent') || document.getElementById('static-cookie-consent')) {
    return;
  }
  if (document.getElementById(VERTICAL_COOKIE_BANNER_ID)) return;

  ensureCookieConsentStyles();

  const banner = document.createElement('div');
  banner.id = VERTICAL_COOKIE_BANNER_ID;
  banner.className = 'static-cookie-consent';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Çerez tercihi');
  banner.innerHTML = `
    <p>Çerez ve analitik tercihinizi yönetin.
      <a href="/cerez-politikasi.html">Çerez politikası</a>
      · <a href="/">Ana sayfa tercih paneli</a>
    </p>
    <div class="static-cookie-consent__actions">
      <button type="button" class="btn btn-primary btn-sm" data-vertical-cookie-accept>Kabul et</button>
      <button type="button" class="btn btn-outline btn-sm" data-vertical-cookie-decline>Reddet</button>
    </div>`;

  banner.querySelector('[data-vertical-cookie-accept]')?.addEventListener('click', () => {
    acceptAnalyticsConsent();
    banner.remove();
  });
  banner.querySelector('[data-vertical-cookie-decline]')?.addEventListener('click', () => {
    declineAnalyticsConsent();
    banner.remove();
  });

  document.body.appendChild(banner);
}

export function initAnalyticsConsentRuntime() {
  ensureVerticalCookieBanner();
  if (hasAnalyticsConsent()) {
    void bootAnalyticsMeasurement();
  }
}
