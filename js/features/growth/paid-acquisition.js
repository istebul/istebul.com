/**
 * P5.1 — Paid acquisition readiness (Google, Meta, TikTok, YouTube, retargeting).
 */
import { analytics } from '../../core/analytics.js';
import { trackGrowth } from './growth-engine.js';
import { trackGrowthFunnel, GROWTH_FUNNEL_EVENTS } from './growth-funnel.js';

export const PAID_PLATFORMS = Object.freeze({
  GOOGLE_SEARCH: 'google_search',
  META: 'meta',
  TIKTOK: 'tiktok',
  YOUTUBE: 'youtube',
  RETARGETING: 'retargeting'
});

/** Click / attribution keys captured first-touch. */
export const PAID_CLICK_KEYS = Object.freeze([
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'ttclid',
  'twclid',
  'li_fat_id'
]);

/** Canonical funnel step → ads manager conversion label. */
export const PAID_FUNNEL_MAP = Object.freeze({
  paid_landing_view: { google: 'page_view', meta: 'ViewContent', tiktok: 'ViewContent', label: 'Landing' },
  hero_cta_click: { google: 'click', meta: 'Lead', tiktok: 'ClickButton', label: 'Hero CTA' },
  auto_start: { google: 'begin_checkout', meta: 'InitiateCheckout', tiktok: 'SubmitForm', label: 'Auto start' },
  lead_submit: { google: 'generate_lead', meta: 'Lead', tiktok: 'SubmitForm', label: 'Qualified lead' },
  pricing_view: { google: 'view_item', meta: 'ViewContent', tiktok: 'ViewContent', label: 'Pricing view' },
  checkout_start: { google: 'begin_checkout', meta: 'InitiateCheckout', tiktok: 'InitiateCheckout', label: 'Checkout start' },
  checkout_complete: { google: 'purchase', meta: 'Purchase', tiktok: 'CompletePayment', label: 'Checkout complete' },
  paid_conversion: { google: 'purchase', meta: 'Purchase', tiktok: 'CompletePayment', label: 'Paid conversion' }
});

let paidChannelsCache = null;

export async function loadPaidChannelsConfig() {
  if (paidChannelsCache) return paidChannelsCache;
  try {
    const res = await fetch('/data/growth/paid-channels.json');
    if (!res.ok) return { platforms: [], primaryLanding: '/karar-asistani/' };
    paidChannelsCache = await res.json();
    return paidChannelsCache;
  } catch {
    return { platforms: [], primaryLanding: '/karar-asistani/' };
  }
}

/**
 * Resolve paid ads platform from attribution (more granular than growth_channel=paid).
 */
export function resolvePaidPlatform(attribution = {}) {
  const source = String(attribution.utm_source || '').toLowerCase();
  const medium = String(attribution.utm_medium || '').toLowerCase();

  if (medium === 'display' || source === 'retargeting' || attribution.paid_platform === 'retargeting') {
    return PAID_PLATFORMS.RETARGETING;
  }
  if (source === 'tiktok' || attribution.ttclid) return PAID_PLATFORMS.TIKTOK;
  if (source === 'youtube' || medium === 'video') return PAID_PLATFORMS.YOUTUBE;
  if (source === 'facebook' || source === 'meta' || source === 'instagram' || attribution.fbclid) {
    return PAID_PLATFORMS.META;
  }
  if (
    attribution.gclid ||
    attribution.gbraid ||
    attribution.wbraid ||
    source === 'google' ||
    medium === 'cpc'
  ) {
    return PAID_PLATFORMS.GOOGLE_SEARCH;
  }
  if (medium === 'paid_social' || medium === 'paid') {
    if (source === 'tiktok') return PAID_PLATFORMS.TIKTOK;
    if (source === 'meta' || source === 'facebook') return PAID_PLATFORMS.META;
    return PAID_PLATFORMS.GOOGLE_SEARCH;
  }

  return null;
}

export function isPaidAttribution(attribution = {}) {
  return Boolean(resolvePaidPlatform(attribution));
}

export function hasPaidClickId(attribution = {}) {
  return PAID_CLICK_KEYS.some((key) => Boolean(attribution[key]));
}

function mergeAttribution(patch) {
  analytics.captureAttribution();
  const current = analytics.getAttribution();
  const merged = {
    ...current,
    ...patch,
    paid_platform: patch.paid_platform || resolvePaidPlatform({ ...current, ...patch })
  };
  try {
    localStorage.setItem('istebul_attribution', JSON.stringify(merged));
  } catch {
    /* ignore */
  }
  return merged;
}

/**
 * Capture paid click IDs + platform into first-touch attribution.
 */
export function capturePaidAttribution() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const patch = {};

  for (const key of PAID_CLICK_KEYS) {
    const val = params.get(key);
    if (val) patch[key] = val;
  }

  const explicitPlatform = params.get('paid_platform') || params.get('utm_platform');
  if (explicitPlatform) patch.paid_platform = explicitPlatform;

  if (!Object.keys(patch).length) return analytics.getAttribution();

  const merged = mergeAttribution(patch);
  const platform = resolvePaidPlatform(merged);

  if (analytics.hasConsent()) {
    trackGrowth('paid_click_capture', {
      ...patch,
      paid_platform: platform,
      growth_channel: 'paid'
    }, {
      funnel: 'paid',
      funnel_step: 'click_capture',
      idempotency_key: `paid_click:${analytics.getSessionId()}:${platform || 'unknown'}`
    });
  }

  return merged;
}

/**
 * Recommended landing path for current paid platform.
 */
export function resolvePaidLandingPath(attribution = {}, fallback = '/karar-asistani/') {
  const platform = resolvePaidPlatform(attribution);
  if (!platform) return fallback;

  const landings = {
    [PAID_PLATFORMS.GOOGLE_SEARCH]: '/karar-asistani/',
    [PAID_PLATFORMS.META]: '/karar-asistani/',
    [PAID_PLATFORMS.TIKTOK]: '/karar-asistani/',
    [PAID_PLATFORMS.YOUTUBE]: '/karar-asistani/',
    [PAID_PLATFORMS.RETARGETING]: '/planlar'
  };

  return landings[platform] || fallback;
}

/**
 * Build campaign URL for a paid platform.
 */
export function buildPaidCampaignUrl(platformId, options = {}) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com';
  const path = options.path || resolvePaidLandingPath({ paid_platform: platformId });
  const url = new URL(path, base);

  const utmByPlatform = {
    google_search: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: options.campaign || 'search_auto_tco' },
    meta: { utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: options.campaign || 'meta_auto_lead' },
    tiktok: { utm_source: 'tiktok', utm_medium: 'paid_social', utm_campaign: options.campaign || 'tiktok_auto_wizard' },
    youtube: { utm_source: 'youtube', utm_medium: 'video', utm_campaign: options.campaign || 'youtube_auto_awareness' },
    retargeting: { utm_source: 'retargeting', utm_medium: 'display', utm_campaign: options.campaign || 'rm_checkout_abandon' }
  };

  const utm = utmByPlatform[platformId] || { utm_source: platformId, utm_medium: 'cpc' };
  Object.entries(utm).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('paid_platform', platformId);
  if (options.content) url.searchParams.set('utm_content', options.content);

  return url.toString();
}

export function trackPaidLandingView() {
  const attribution = analytics.getAttribution();
  const platform = resolvePaidPlatform(attribution);
  if (!platform && !hasPaidClickId(attribution)) return;

  trackGrowth('paid_landing_view', {
    paid_platform: platform,
    landing_path: window.location.pathname,
    recommended_landing: resolvePaidLandingPath(attribution)
  }, {
    funnel: 'paid',
    funnel_step: 'landing',
    idempotency_key: `paid_land:${analytics.getSessionId()}:${platform}`
  });

  if (isLandingPathPaidEligible()) {
    trackGrowthFunnel(GROWTH_FUNNEL_EVENTS.LANDING_VISIT, {
      paid_platform: platform,
      surface: 'paid'
    }, { dedupeKey: `paid:${platform}`, funnel: 'paid_acquisition' });
  }
}

function isLandingPathPaidEligible() {
  const path = window.location.pathname;
  return path === '/' || path === '/index.html' || path.startsWith('/auto');
}

/**
 * Map funnel step to platform conversion + fire paid_conversion_signal.
 */
export function trackPaidFunnelStep(step, properties = {}) {
  const attribution = analytics.getAttribution();
  const platform = resolvePaidPlatform(attribution);
  if (!platform && !hasPaidClickId(attribution)) return;

  const mapping = PAID_FUNNEL_MAP[step] || { label: step };

  const platformKey = platform === PAID_PLATFORMS.META
    ? 'meta'
    : platform === PAID_PLATFORMS.TIKTOK
      ? 'tiktok'
      : 'google';

  trackGrowth('paid_funnel_step', {
    step,
    paid_platform: platform,
    platform_event: mapping[platformKey] || mapping.label || step,
    ...properties
  }, {
    funnel: 'paid',
    funnel_step: step
  });

  trackGrowth('paid_conversion_signal', {
    step,
    paid_platform: platform,
    gclid: attribution.gclid || null,
    fbclid: attribution.fbclid || null,
    msclkid: attribution.msclkid || null,
    ttclid: attribution.ttclid || null,
    utm_campaign: attribution.utm_campaign || null,
    ...properties
  }, {
    funnel: 'paid',
    funnel_step: step
  });
}

/** @deprecated use capturePaidAttribution */
export function capturePaidClickIds() {
  return capturePaidAttribution();
}

/** @deprecated use trackPaidFunnelStep */
export function trackPaidConversionSignal(step, properties = {}) {
  trackPaidFunnelStep(step, properties);
}
