/**
 * Canonical growth funnel events — consent-gated, session-deduped, channel-enriched.
 */
import { analytics } from '../../core/analytics.js';

/** Lightweight channel resolver (avoids circular import with growth-engine). */
function resolveGrowthChannel(attribution = {}) {
  const ref = attribution.ref || attribution.referral_code;
  if (ref) return 'referral';

  const medium = String(attribution.utm_medium || '').toLowerCase();
  const source = String(attribution.utm_source || '').toLowerCase();

  if (medium === 'organic' || source === 'google') return 'seo';
  if (medium === 'cpc' || medium === 'paid' || attribution.gclid) return 'paid';
  if (medium === 'email' || medium === 'lifecycle') return 'lifecycle_email';
  if (medium === 'reactivation' || source === 'crm') return 'crm_reactivation';
  if (medium === 'abandon' || source === 'recovery') return 'abandoned_lead';
  if (medium === 'display' || source === 'retargeting') return 'retargeting';
  if (medium === 'share' || source === 'viral') return 'viral';
  if (source === 'referral' || medium === 'invite') return 'referral';
  if (source === 'partner') return 'partner';

  return source || 'direct';
}

/** Standard acquisition → monetization funnel (event_name = funnel_step). */
export const GROWTH_FUNNEL_EVENTS = Object.freeze({
  LANDING_VISIT: 'landing_visit',
  HERO_CTA_CLICK: 'hero_cta_click',
  AUTO_START: 'auto_start',
  WIZARD_STEP: 'wizard_step',
  WIZARD_COMPLETE: 'wizard_complete',
  RESULTS_VIEW: 'results_view',
  LEAD_SUBMIT: 'lead_submit',
  PRICING_VIEW: 'pricing_view',
  CHECKOUT_START: 'checkout_start',
  CHECKOUT_COMPLETE: 'checkout_complete',
  PAID_CONVERSION: 'paid_conversion'
});

const SESSION_PREFIX = 'ib_growth_funnel';

function sessionDedupeToken(step, dedupeKey) {
  return `${SESSION_PREFIX}:${step}:${dedupeKey}`;
}

function hasSessionDedupe(step, dedupeKey) {
  try {
    return Boolean(sessionStorage.getItem(sessionDedupeToken(step, dedupeKey)));
  } catch {
    return false;
  }
}

function markSessionDedupe(step, dedupeKey) {
  try {
    sessionStorage.setItem(sessionDedupeToken(step, dedupeKey), '1');
  } catch {
    /* ignore */
  }
}

/**
 * Fire a canonical funnel event (no-op without analytics consent).
 * @param {string} step — event name from GROWTH_FUNNEL_EVENTS
 * @param {Record<string, unknown>} [properties]
 * @param {{ dedupeKey?: string, oncePerSession?: boolean, funnel?: string, idempotencyKey?: string, revenueCents?: number }} [options]
 */
export function trackGrowthFunnel(step, properties = {}, options = {}) {
  if (!analytics.hasConsent()) return;

  const dedupeKey = options.dedupeKey ?? 'default';
  const oncePerSession = options.oncePerSession !== false;

  if (oncePerSession && hasSessionDedupe(step, dedupeKey)) {
    return;
  }

  const attribution = analytics.getAttribution();
  const growthChannel = resolveGrowthChannel(attribution);

  analytics.track(step, {
    ...properties,
    growth_channel: growthChannel
  }, {
    category: 'growth',
    funnel: options.funnel || 'acquisition',
    funnel_step: step,
    idempotency_key: options.idempotencyKey || null,
    revenue_cents: options.revenueCents || 0
  });

  if (oncePerSession) {
    markSessionDedupe(step, dedupeKey);
  }

  trackPlausibleGoal(step);
}

/** Plausible custom goals — only after cookie consent (script loaded separately). */
export function trackPlausibleGoal(goal) {
  if (!analytics.hasConsent()) return;
  if (typeof window === 'undefined') return;

  const fn = window.plausible;
  if (typeof fn === 'function') {
    fn(goal, { props: { growth_channel: resolveGrowthChannel(analytics.getAttribution()) } });
  }
}

export function isLandingPath(pathname = '') {
  const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
  return path === '/' || path === '/index.html';
}

export function isAutoPath(pathname = '') {
  const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
  return path.startsWith('/auto');
}

export function trackLandingVisit() {
  if (!isLandingPath()) return;
  trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.LANDING_VISIT, {
    path: typeof window !== 'undefined' ? window.location.pathname : '/'
  }, { dedupeKey: 'home', funnel: 'acquisition' });
}

export function trackHeroCtaClick(ctaId, properties = {}) {
  trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.HERO_CTA_CLICK, {
    cta_id: ctaId,
    ...properties
  }, {
    oncePerSession: false,
    dedupeKey: ctaId || 'hero',
    funnel: 'acquisition'
  });
}

export function trackAutoStart(source = 'auto') {
  trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.AUTO_START, { source }, {
    dedupeKey: 'session',
    funnel: 'auto'
  });
}

export function trackWizardStep(stepIndex, properties = {}) {
  trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.WIZARD_STEP, {
    step: stepIndex + 1,
    ...properties
  }, {
    dedupeKey: `step:${stepIndex}`,
    funnel: 'auto'
  });
}

export function trackWizardComplete(properties = {}) {
  trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.WIZARD_COMPLETE, properties, {
    dedupeKey: 'session',
    funnel: 'auto'
  });
}

export function trackResultsView(properties = {}) {
  trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.RESULTS_VIEW, properties, {
    dedupeKey: 'session',
    funnel: 'auto'
  });
}

export function trackPricingViewFunnel(placement = 'pricing') {
  trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.PRICING_VIEW, { placement }, {
    dedupeKey: placement,
    funnel: 'subscription'
  });
}

export function trackCheckoutStart(properties = {}) {
  trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.CHECKOUT_START, properties, {
    dedupeKey: properties.checkout_key || properties.billing_interval || 'default',
    oncePerSession: false,
    funnel: 'subscription'
  });
}

export function trackCheckoutComplete(properties = {}) {
  trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.CHECKOUT_COMPLETE, properties, {
    dedupeKey: properties.idempotency_key || properties.stripe_session_id || 'session',
    funnel: 'subscription',
    revenueCents: properties.revenue_cents
  });
}

export function trackPaidConversion(properties = {}) {
  trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.PAID_CONVERSION, properties, {
    dedupeKey: properties.idempotency_key || properties.stripe_session_id || 'paid',
    funnel: 'subscription',
    revenueCents: properties.revenue_cents
  });
}

/** Map legacy auto_* telemetry to canonical funnel (single fire per dedupe rules). */
export function mirrorLegacyAutoFunnel(legacyEvent, metadata = {}) {
  switch (legacyEvent) {
    case 'auto_form_started':
      trackAutoStart('form');
      break;
    case 'auto_wizard_step':
      if (metadata.step != null) {
        trackWizardStep(Number(metadata.step) - 1, metadata);
      }
      break;
    case 'auto_wizard_complete':
      trackWizardComplete(metadata);
      break;
    case 'auto_results_view':
    case 'auto_results_rendered':
      trackResultsView(metadata);
      break;
    default:
      break;
  }
}
