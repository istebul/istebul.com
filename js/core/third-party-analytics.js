/**
 * Consent-gated third-party measurement (Plausible, Cloudflare Web Analytics, GA4).
 * First-party product analytics remain in analytics.js → analytics-ingest.
 */
import { analytics } from './analytics.js';

function envValue(key) {
  return String(typeof window !== 'undefined' ? window.__env?.[key] || '' : '').trim();
}

function loadPlausible(domain) {
  if (document.querySelector('script[data-analytics-provider="plausible"]')) return;
  const script = document.createElement('script');
  script.async = true;
  script.defer = true;
  script.dataset.analyticsProvider = 'plausible';
  script.dataset.domain = domain || 'istebul.com';
  script.src = 'https://plausible.io/js/plausible.js';
  document.head.appendChild(script);
}

function loadCloudflareBeacon(token) {
  if (!token || document.querySelector('script[data-analytics-provider="cf-beacon"]')) return;
  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.dataset.analyticsProvider = 'cf-beacon';
  script.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  document.head.appendChild(script);
}

function loadClarity(projectId) {
  if (!projectId || typeof window.clarity === 'function') return;
  const script = document.createElement('script');
  script.async = true;
  script.dataset.analyticsProvider = 'clarity';
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  document.head.appendChild(script);
}

function loadGa4(measurementId) {
  if (!measurementId) return;

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    return;
  }

  if (document.querySelector('script[data-analytics-provider="ga4"]')) return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
  window.gtag('js', new Date());
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  window.gtag('config', measurementId, { anonymize_ip: true });

  const script = document.createElement('script');
  script.async = true;
  script.dataset.analyticsProvider = 'ga4';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

/**
 * Load optional external analytics after cookie consent.
 */
export function loadThirdPartyMeasurement() {
  if (!analytics.hasConsent()) return;

  loadPlausible(envValue('PLAUSIBLE_DOMAIN') || 'istebul.com');
  loadCloudflareBeacon(envValue('CF_WEB_ANALYTICS_TOKEN'));
  loadGa4(envValue('GA4_MEASUREMENT_ID'));
  loadClarity(envValue('CLARITY_PROJECT_ID'));
}
