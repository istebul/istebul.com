/**
 * Lightweight cookie consent for static corporate HTML pages (same key as main SPA).
 */
const STORAGE_KEY = 'istebul_cookie_consent';

function readConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeConsent(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

function initStaticCookieConsent() {
  const banner = document.getElementById('static-cookie-consent');
  if (!banner) return;

  const existing = readConsent();
  if (existing) {
    banner.hidden = true;
    return;
  }

  banner.hidden = false;
  banner.querySelector('[data-static-cookie-accept]')?.addEventListener('click', () => {
    writeConsent('accepted');
    banner.hidden = true;
  });
  banner.querySelector('[data-static-cookie-decline]')?.addEventListener('click', () => {
    writeConsent('declined');
    banner.hidden = true;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStaticCookieConsent);
} else {
  initStaticCookieConsent();
}
