import { bootAnalyticsMeasurement, hasAnalyticsConsent } from './analytics-consent-boot.js';

function boot() {
  if (!hasAnalyticsConsent()) return;
  void bootAnalyticsMeasurement();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
