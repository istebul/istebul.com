/**
 * EPIC-003 — Consent-gated analytics boot for standalone Platform product surfaces
 * (/ai/, /garson/, /business/). Emits distinct page_view via analytics.init() path key.
 */
import { initAnalyticsConsentRuntime } from './analytics-consent-boot.js';

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAnalyticsConsentRuntime(), { once: true });
  } else {
    initAnalyticsConsentRuntime();
  }
}
