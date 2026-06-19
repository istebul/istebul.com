/**
 * P10 — Client-side revenue ops triggers (upgrade prompts, recovery CTAs).
 */
import { enrollLifecycle } from '../lifecycle/lifecycle-client.js';
import { analytics } from '../../core/analytics.js';

/**
 * @param {Record<string, unknown>} [meta]
 */
export function enrollUpgradePrompt(meta = {}) {
  analytics.track(
    'revops_upgrade_prompt_requested',
    { source: meta.source || 'web' },
    { category: 'subscription', funnel: 'revenue', funnel_step: 'upgrade_prompt' }
  );
  return enrollLifecycle('upgrade_prompt', {
    email: meta.email,
    user_id: meta.user_id,
    service_opt_in: true,
    context: meta,
    trigger_source: meta.trigger_source || 'upgrade_prompt_impression'
  });
}

/**
 * After pricing page view without active subscription.
 * @param {Record<string, unknown>} meta
 */
export function trackPricingViewForUpgrade(meta = {}) {
  analytics.track(
    'pricing_view',
    { plan: meta.plan || 'pro' },
    { category: 'subscription', funnel: 'revenue', funnel_step: 'pricing_view' }
  );
  if (meta.user_id || meta.email) {
    return enrollUpgradePrompt({
      ...meta,
      trigger_source: 'pricing_view'
    });
  }
  return Promise.resolve({ ok: false, skipped: true });
}

/**
 * Pro upsell banner / modal impression.
 */
export function trackProUpsellImpression(meta = {}) {
  analytics.track(
    'pro_upsell_impression',
    { placement: meta.placement || 'unknown' },
    { category: 'subscription', funnel: 'revenue', funnel_step: 'upsell_impression' }
  );
}
