/**
 * Site-wide standard analytics — homepage + all decision verticals.
 * Legacy Auto / vertical events are preserved; this layer adds canonical names.
 */
import { analytics } from '../core/analytics.js';

export const SITE_CATEGORIES = Object.freeze([
  'auto',
  'konut',
  'tatil',
  'finansman',
  'sigorta',
  'kasko',
  'home',
  'platform',
  'ai',
  'garson',
  'business'
]);

const PATH_CATEGORY = [
  [/^\/auto\/?/i, 'auto'],
  [/^\/konut\/?/i, 'konut'],
  [/^\/tatil\/?/i, 'tatil'],
  [/^\/finans\/?/i, 'finansman'],
  [/^\/sigorta\/?/i, 'sigorta'],
  [/^\/kasko\/?/i, 'kasko'],
  [/^\/ai\/?/i, 'ai'],
  [/^\/garson\/?/i, 'garson'],
  [/^\/business\/?/i, 'business']
];

const HOME_CATEGORY_MAP = Object.freeze({
  araba: 'auto',
  konut: 'konut',
  tatil: 'tatil',
  finansman: 'finansman',
  sigorta: 'sigorta',
  kasko: 'kasko'
});

/** @type {Record<string, string>} legacy event_name → canonical site event */
export const LEGACY_TO_SITE_EVENT = Object.freeze({
  auto_page_view: 'category_page_view',
  auto_form_started: 'analysis_started',
  auto_analysis_started: 'analysis_started',
  auto_form_submitted: 'analysis_completed',
  auto_wizard_complete: 'analysis_completed',
  auto_results_rendered: 'results_viewed',
  auto_results_view: 'results_viewed',
  auto_modal_open: 'lead_form_opened',
  auto_lead_submit: 'lead_submitted',
  finance_funnel_start: 'analysis_started',
  finance_funnel_complete: 'analysis_completed',
  finance_page_view: 'category_page_view',
  finans_start: 'analysis_started',
  konut_start: 'analysis_started',
  vacation_start: 'analysis_started',
  finans_results_view: 'results_viewed',
  finans_lead_submit: 'lead_submitted',
  vacation_page_view: 'category_page_view',
  vacation_results_view: 'results_viewed',
  vacation_lead_submit: 'lead_submitted',
  home_analysis_start: 'analysis_started',
  home_wizard_complete: 'analysis_completed',
  home_results_view: 'results_viewed',
  home_lead_open: 'lead_form_opened',
  home_lead_submit: 'lead_submitted',
  housing_page_view: 'category_page_view',
  insurance_page_view: 'category_page_view',
  insurance_analysis_started: 'analysis_started',
  insurance_results_view: 'results_viewed',
  insurance_lead_submit: 'lead_submitted',
  insurance_pdf_download: 'pdf_downloaded',
  insurance_interest: 'lead_form_opened',
  vacation_wizard_complete: 'analysis_completed',
  vacation_lead_open: 'lead_form_opened',
  kasko_page_view: 'category_page_view',
  kasko_analysis_started: 'analysis_started',
  kasko_results_view: 'results_viewed',
  kasko_wizard_complete: 'analysis_completed',
  kasko_lead_submit: 'lead_submitted',
  lead_submit: 'lead_submitted',
  landing_visit: 'homepage_view',
  hero_cta_click: 'cta_clicked',
  cta_click: 'cta_clicked',
  page_view: 'category_page_view'
});

function normalizeCategory(raw) {
  const key = String(raw || '').toLowerCase();
  if (SITE_CATEGORIES.includes(key)) return key;
  if (HOME_CATEGORY_MAP[key]) return HOME_CATEGORY_MAP[key];
  if (key === 'finans') return 'finansman';
  if (key === 'araba') return 'auto';
  return key || null;
}

export function categoryFromPath(path = '') {
  const p = String(path || '');
  for (const [re, cat] of PATH_CATEGORY) {
    if (re.test(p)) return cat;
  }
  if (p === '/' || p === '/index.html') return 'platform';
  return null;
}

function attributionPayload() {
  const attr = analytics.getAttribution?.() || {};
  return {
    utm_source: attr.utm_source || null,
    utm_medium: attr.utm_medium || null,
    utm_campaign: attr.utm_campaign || null,
    referrer: attr.referrer || null,
    landing_page: attr.landing_path || window.location.pathname
  };
}

function siteMeta(category, extra = {}) {
  const cat = normalizeCategory(category);
  return {
    category: 'growth',
    funnel: 'site',
    funnel_step: extra.funnel_step || null,
    properties: {
      category: cat,
      ...attributionPayload(),
      ...extra
    }
  };
}

export function trackSiteEvent(eventName, { category, ...props } = {}) {
  if (!analytics.hasConsent()) return;
  const cat = normalizeCategory(category) || categoryFromPath(window.location.pathname);
  analytics.track(
    eventName,
    {
      category: cat,
      path: window.location.pathname,
      ...props
    },
    siteMeta(cat, { funnel_step: eventName, ...props })
  );
}

export function trackSiteEventUnique(eventName, key, options = {}) {
  if (!analytics.hasConsent()) return;
  const cat = normalizeCategory(options.category);
  analytics.trackUnique(
    eventName,
    { category: cat, path: window.location.pathname, ...options },
    key || `${eventName}:${cat}:${window.location.pathname}`,
    siteMeta(cat, { funnel_step: eventName })
  );
}

export function mirrorLegacySiteEvent(legacyEventName, metadata = {}) {
  const canonical = LEGACY_TO_SITE_EVENT[legacyEventName];
  if (!canonical) return;
  const category =
    normalizeCategory(metadata.category) ||
    categoryFromPath(metadata.path || window.location.pathname);
  trackSiteEvent(canonical, { category, legacy_event: legacyEventName, ...metadata });
}

export function trackHomepageView() {
  trackSiteEventUnique('homepage_view', 'homepage_view', { category: 'platform' });
}

/** Distinct surface visit markers (page_view itself comes from analytics.init path key). */
export function trackPlatformSurfaceView(surface = 'platform') {
  const cat = normalizeCategory(surface) || categoryFromPath(window.location.pathname) || 'platform';
  trackSiteEventUnique(`surface_view:${cat}`, `surface_view:${cat}`, {
    category: cat,
    surface: cat
  });
}

export function trackCategoryCardClick(categoryId, meta = {}) {
  const category = normalizeCategory(HOME_CATEGORY_MAP[categoryId] || categoryId);
  trackSiteEvent('category_card_click', {
    category,
    source: 'category_card',
    card_id: categoryId,
    ...meta
  });
}

export function trackCategoryPageView(category) {
  const cat = normalizeCategory(category) || categoryFromPath(window.location.pathname);
  trackSiteEventUnique('category_page_view', `category_page_view:${cat}`, {
    category: cat
  });
}

export function trackAnalysisStarted(category, meta = {}) {
  trackSiteEvent('analysis_started', { category, ...meta });
}

export function trackAnalysisCompleted(category, meta = {}) {
  trackSiteEvent('analysis_completed', { category, ...meta });
}

export function trackResultsViewed(category, meta = {}) {
  trackSiteEvent('results_viewed', { category, ...meta });
}

export function trackLeadFormOpened(category, meta = {}) {
  trackSiteEvent('lead_form_opened', { category, ...meta });
}

export function trackLeadSubmitted(category, meta = {}) {
  trackSiteEvent('lead_submitted', { category, ...meta });
}

export function trackPdfDownloaded(category, meta = {}) {
  trackSiteEvent('pdf_downloaded', { category, ...meta });
}

export function trackCtaClicked({ source, category, ...meta } = {}) {
  trackSiteEvent('cta_clicked', {
    source: source || 'unknown',
    category: category ? normalizeCategory(category) : null,
    ...meta
  });
}

export function initSiteAnalyticsPage() {
  if (!analytics.hasConsent()) return;
  const path = window.location.pathname;
  if (path === '/' || path === '/index.html') {
    trackHomepageView();
    trackPlatformSurfaceView('platform');
    return;
  }
  if (/^\/ai\/?/i.test(path)) {
    trackPlatformSurfaceView('ai');
    return;
  }
  if (/^\/garson\/?/i.test(path)) {
    trackPlatformSurfaceView('garson');
    return;
  }
  if (/^\/business\/?/i.test(path)) {
    trackPlatformSurfaceView('business');
    return;
  }
  const cat = categoryFromPath(path);
  if (cat && !['platform', 'home', 'ai', 'garson', 'business'].includes(cat)) {
    trackCategoryPageView(cat);
  }
}
