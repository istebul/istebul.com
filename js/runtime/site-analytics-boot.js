import { analytics } from '../core/analytics.js';
import { initSiteAnalyticsPage } from '../platform/site-analytics.js';

function boot() {
  if (!analytics.hasConsent()) return;
  initSiteAnalyticsPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

document.addEventListener('cookieConsentAccepted', boot, { once: false });
