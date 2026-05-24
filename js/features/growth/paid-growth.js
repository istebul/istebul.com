/**
 * Paid growth readiness — click ID capture + conversion signals for ads ops.
 */
import { analytics } from '../../core/analytics.js';
import { resolveGrowthChannel } from './growth-engine.js';
import { trackGrowth } from './growth-engine.js';

const PAID_CLICK_KEYS = ['gclid', 'fbclid', 'msclkid', 'ttclid'];

export function hasPaidClickId(attribution = {}) {
  return PAID_CLICK_KEYS.some((key) => Boolean(attribution[key]));
}

/**
 * Persist extended paid click ids into attribution (first-touch).
 */
export function capturePaidClickIds() {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const patch = {};
  for (const key of PAID_CLICK_KEYS) {
    const val = params.get(key);
    if (val) patch[key] = val;
  }
  if (!Object.keys(patch).length) return;

  analytics.captureAttribution();
  const current = analytics.getAttribution();
  const merged = { ...current, ...patch };
  try {
    localStorage.setItem('istebul_attribution', JSON.stringify(merged));
  } catch {
    /* ignore */
  }

  if (analytics.hasConsent()) {
    trackGrowth('paid_click_capture', {
      ...patch,
      growth_channel: resolveGrowthChannel(merged)
    }, {
      funnel: 'paid',
      funnel_step: 'click_capture',
      idempotency_key: `paid_click:${analytics.getSessionId()}`
    });
  }
}

/**
 * Fired on checkout start / complete for paid channel attribution export.
 */
export function trackPaidConversionSignal(step, properties = {}) {
  const attribution = analytics.getAttribution();
  if (resolveGrowthChannel(attribution) !== 'paid' && !hasPaidClickId(attribution)) {
    return;
  }

  trackGrowth('paid_conversion_signal', {
    step,
    ...properties,
    gclid: attribution.gclid || null,
    fbclid: attribution.fbclid || null,
    msclkid: attribution.msclkid || null,
    utm_campaign: attribution.utm_campaign || null
  }, {
    funnel: 'paid',
    funnel_step: step
  });
}
