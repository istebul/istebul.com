/**
 * Growth engine — channel registry, attribution enrichment, predictable loops.
 */
import { analytics } from '../../core/analytics.js';
import { readStorageRaw, writeStorageRaw, STORAGE_KEYS } from '../../core/storage-keys.js';

export const GROWTH_CHANNELS = Object.freeze({
  SEO: 'seo',
  PAID: 'paid',
  REFERRAL: 'referral',
  PARTNER: 'partner',
  LIFECYCLE_EMAIL: 'lifecycle_email',
  CRM_REACTIVATION: 'crm_reactivation',
  ABANDONED_LEAD: 'abandoned_lead',
  RETARGETING: 'retargeting',
  VIRAL: 'viral'
});

/** Map utm_medium / ref to growth channel id */
export function resolveGrowthChannel(attribution = {}) {
  const ref = attribution.ref || attribution.referral_code;
  if (ref) return GROWTH_CHANNELS.REFERRAL;

  const medium = String(attribution.utm_medium || '').toLowerCase();
  const source = String(attribution.utm_source || '').toLowerCase();

  if (medium === 'organic' || source === 'google') return GROWTH_CHANNELS.SEO;
  if (medium === 'cpc' || medium === 'paid' || attribution.gclid) return GROWTH_CHANNELS.PAID;
  if (medium === 'email' || medium === 'lifecycle') return GROWTH_CHANNELS.LIFECYCLE_EMAIL;
  if (medium === 'reactivation' || source === 'crm') return GROWTH_CHANNELS.CRM_REACTIVATION;
  if (medium === 'abandon' || source === 'recovery') return GROWTH_CHANNELS.ABANDONED_LEAD;
  if (medium === 'display' || source === 'retargeting') return GROWTH_CHANNELS.RETARGETING;
  if (medium === 'share' || source === 'viral') return GROWTH_CHANNELS.VIRAL;
  if (source === 'referral' || medium === 'invite') return GROWTH_CHANNELS.REFERRAL;
  if (source === 'partner') return GROWTH_CHANNELS.PARTNER;

  return source || 'direct';
}

export function getStoredReferralCode() {
  return readStorageRaw(STORAGE_KEYS.REFERRAL_CODE) || '';
}

export function storeReferralCode(code) {
  const normalized = String(code || '').trim().slice(0, 32);
  if (!normalized) return;
  writeStorageRaw(STORAGE_KEYS.REFERRAL_CODE, normalized);
}

/**
 * Context attached to leads and high-value events.
 */
export function getGrowthContext() {
  const attribution = analytics.getAttribution();
  return {
    ...attribution,
    referral_code: getStoredReferralCode() || attribution.ref || null,
    growth_channel: resolveGrowthChannel(attribution),
    growth_campaign: attribution.growth_campaign || attribution.utm_campaign || null
  };
}

export function enrichLeadMetadata(metadata = {}) {
  return {
    ...metadata,
    growth: getGrowthContext()
  };
}

export function trackGrowth(eventName, properties = {}, meta = {}) {
  analytics.track(eventName, properties, {
    category: 'growth',
    funnel: meta.funnel || properties.growth_channel || resolveGrowthChannel(),
    funnel_step: meta.funnel_step || eventName,
    ...meta
  });
}

export function buildReferralUrl(code, path = '/auto/') {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com';
  const url = new URL(path, base);
  url.searchParams.set('ref', code);
  url.searchParams.set('utm_source', 'referral');
  url.searchParams.set('utm_medium', 'invite');
  return url.toString();
}

export function buildRecoveryUrl(campaign = 'abandon_lead') {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com';
  const url = new URL('/auto/', base);
  url.searchParams.set('utm_source', 'recovery');
  url.searchParams.set('utm_medium', 'abandon');
  url.searchParams.set('growth_campaign', campaign);
  return url.toString();
}

export const GROWTH_LOOPS = Object.freeze([
  {
    id: 'content_to_lead',
    trigger: 'SEO landing → Auto wizard',
    metric: 'organic_leads / 1000 sessions'
  },
  {
    id: 'lead_to_partner',
    trigger: 'Lead submit → partner dispatch',
    metric: 'dispatch_success_rate'
  },
  {
    id: 'abandon_to_recovery',
    trigger: 'Modal open w/o submit → email/SMS',
    metric: 'recovery_conversion_rate'
  },
  {
    id: 'referral_viral',
    trigger: 'Success screen → share link ?ref=',
    metric: 'invites_per_winner'
  },
  {
    id: 'crm_reactivation',
    trigger: 'Stale lead → outbound → return visit',
    metric: 'reactivated_leads / week'
  }
]);
