/**
 * B2B partner platform — acquisition funnel, rate card, analytics helpers.
 */
import { analytics } from '../../core/analytics.js';
import { renderProductTierCards } from './partner-offers.js';

export const PARTNER_ROUTE_LABELS = Object.freeze({
  dealer_partner: 'Bayi / Galeri',
  finance_partner: 'Finansman',
  insurance_partner: 'Sigorta',
  premium_report: 'Premium rapor',
  general_sales: 'Genel satış'
});

/** @deprecated Use PARTNER_PRODUCT_TIERS — kept for tests and legacy imports. */
export { PARTNER_PRODUCT_TIERS as PARTNER_RATE_CARD } from './partner-offers.js';

export const PARTNER_FUNNEL_EVENTS = Object.freeze({
  LANDING_VIEW: 'partner_landing_view',
  APPLICATION_START: 'partner_application_start',
  APPLICATION_SUBMIT: 'partner_application_submit',
  DOCS_VIEW: 'partner_docs_view',
  ONBOARDING_VIEW: 'partner_onboarding_view',
  WEBHOOK_DRAFT_SAVED: 'partner_webhook_draft_saved',
  FUNNEL_QUALIFICATION: 'partner_funnel_qualification',
  FUNNEL_LEAD_NEEDS: 'partner_funnel_lead_needs',
  FUNNEL_WEBHOOK: 'partner_funnel_webhook',
  FUNNEL_TEST_PAYLOAD: 'partner_funnel_test_payload',
  ONBOARDING_COMPLETE: 'partner_onboarding_complete',
  PRICING_VIEW: 'partner_pricing_view',
  PRICING_CTA: 'partner_pricing_cta'
});

function sessionKey(step) {
  return `ib_partner_funnel:${step}`;
}

export function trackPartnerFunnel(eventName, properties = {}, options = {}) {
  if (!analytics.hasConsent() && !options.force) return;

  const once = options.oncePerSession !== false;
  if (once) {
    try {
      if (sessionStorage.getItem(sessionKey(eventName))) return;
      sessionStorage.setItem(sessionKey(eventName), '1');
    } catch {
      /* ignore */
    }
  }

  analytics.track(eventName, properties, {
    category: 'partner',
    funnel: 'partner_acquisition',
    funnel_step: eventName
  });
}

export function capturePartnerAttribution() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    ref: params.get('ref')
  };
}

export function buildOnboardingUrl(token, step = 2) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com';
  const params = new URLSearchParams({ token, step: String(step) });
  return `${base}/partner-basvuru.html?${params}`;
}

export function renderRateCardHtml(options = {}) {
  const origin = options.origin
    ?? (typeof window !== 'undefined' ? window.location.origin : undefined);
  return renderProductTierCards({
    origin,
    showPilot: options.showPilot !== false
  });
}
