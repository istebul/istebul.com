/**
 * AFAD deprem veri servisi — feature-flag foundation (UI/scoring entegrasyonu yok).
 */
import {
  AFAD_EARTHQUAKE_CACHE_DEFAULT_TTL_MS,
  buildAfadEarthquakeCacheKey,
  clearAfadEarthquakeCache,
  getAfadEarthquakeCacheEntry,
  resetAfadEarthquakeCacheForTests,
  setAfadEarthquakeCacheEntry
} from './afad-earthquake-cache.js';
import {
  buildAfadEarthquakeFallbackModel,
  buildAfadEarthquakeRiskModel,
  parseAfadEarthquakeEvents
} from './afad-earthquake-model.js';

export const AFAD_EARTHQUAKE_EVENT_FILTER_URL =
  'https://servisnet.afad.gov.tr/apigateway/deprem/apiv2/event/filter';

export const AFAD_EARTHQUAKE_FEATURE_FLAG_KEYS = Object.freeze([
  'AFAD_EARTHQUAKE_ENABLED',
  'AFAD_EARTHQUAKE_FEATURE_ENABLED'
]);

const EVENTS_CACHE_NAMESPACE = 'afad-events';
const REGION_CACHE_NAMESPACE = 'afad-region';
const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_EVENT_LIMIT = 2500;
const REQUEST_TIMEOUT_MS = 12_000;

/** @type {boolean|null} */
let runtimeFeatureOverride = null;

function readTruthy(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'on' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'off' || raw === 'no') return false;
  return null;
}

function readBrowserEnvFlag() {
  try {
    const env = typeof globalThis !== 'undefined' ? globalThis.window?.__env : null;
    if (!env || typeof env !== 'object') return null;
    for (const key of AFAD_EARTHQUAKE_FEATURE_FLAG_KEYS) {
      const parsed = readTruthy(env[key]);
      if (parsed != null) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * AFAD deprem canlı veri katmanı etkin mi?
 * Varsayılan: kapalı (progressive rollout).
 * @param {Record<string, string|undefined>} [env]
 */
export function isAfadEarthquakeEnabled(env = {}) {
  if (runtimeFeatureOverride === false) return false;
  if (runtimeFeatureOverride === true) return true;

  for (const key of AFAD_EARTHQUAKE_FEATURE_FLAG_KEYS) {
    const parsed = readTruthy(env?.[key]);
    if (parsed != null) return parsed;
  }

  const browserFlag = readBrowserEnvFlag();
  if (browserFlag != null) return browserFlag;

  return false;
}

/** @param {boolean} enabled */
export function setAfadEarthquakeFeatureOverride(enabled) {
  runtimeFeatureOverride = Boolean(enabled);
}

export function clearAfadEarthquakeFeatureOverride() {
  runtimeFeatureOverride = null;
}

function formatAfadDateTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function startDateDaysAgo(days = DEFAULT_LOOKBACK_DAYS) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return formatAfadDateTime(d);
}

export function buildAfadEarthquakeFilterUrl({
  start,
  end,
  limit = DEFAULT_EVENT_LIMIT,
  orderby = 'timedesc'
} = {}) {
  const params = new URLSearchParams({
    start: start || startDateDaysAgo(DEFAULT_LOOKBACK_DAYS),
    end: end || formatAfadDateTime(),
    limit: String(limit),
    orderby
  });
  return `${AFAD_EARTHQUAKE_EVENT_FILTER_URL}?${params.toString()}`;
}

function buildDisabledSnapshot(location = {}) {
  const province = String(location.province || '').trim();
  const district = String(location.district || '').trim();
  const model = buildAfadEarthquakeFallbackModel({
    province,
    district,
    reason: 'feature_disabled'
  });

  return {
    enabled: false,
    source: 'disabled',
    fetchedAt: new Date().toISOString(),
    dataDate: null,
    location: { province: province || null, district: district || null },
    model,
    errors: []
  };
}

function buildResponseSnapshot({
  enabled = true,
  source = 'live',
  fetchedAt = new Date().toISOString(),
  dataDate = null,
  location = {},
  model = null,
  errors = []
} = {}) {
  return {
    enabled,
    source,
    fetchedAt,
    dataDate,
    location: {
      province: location.province || null,
      district: location.district || null
    },
    model,
    errors
  };
}

async function fetchAfadEarthquakeEvents(fetchImpl = fetch, options = {}) {
  const url = buildAfadEarthquakeFilterUrl(options);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'isteBul-AFAD-Foundation/1.0'
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`AFAD HTTP ${response.status}`);
    }

    const contentType = response.headers?.get?.('content-type') || '';
    const bodyText = await response.text();
    const looksLikeJson =
      contentType.toLowerCase().includes('json') ||
      bodyText.trim().startsWith('[') ||
      bodyText.trim().startsWith('{');
    if (!looksLikeJson) {
      throw new Error('AFAD non-JSON response');
    }

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      throw new Error('AFAD non-JSON response');
    }
    const events = parseAfadEarthquakeEvents(payload);
    if (!events.length) {
      throw new Error('AFAD returned no valid earthquake events');
    }

    const latestDate = events
      .map((event) => String(event?.date || ''))
      .filter(Boolean)
      .sort()
      .pop();

    return {
      events,
      fetchedAt: new Date().toISOString(),
      dataDate: latestDate || null
    };
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

async function getCachedAfadEvents(options = {}) {
  const cacheKey = buildAfadEarthquakeCacheKey(EVENTS_CACHE_NAMESPACE, {
    lookbackDays: options.lookbackDays || DEFAULT_LOOKBACK_DAYS,
    limit: options.limit || DEFAULT_EVENT_LIMIT
  });

  if (!options.forceRefresh) {
    const cached = getAfadEarthquakeCacheEntry(cacheKey);
    if (cached) return { ...cached, source: 'cache' };
  }

  const pulled = await fetchAfadEarthquakeEvents(options.fetchImpl || fetch, options);
  const snapshot = { ...pulled, source: 'live' };
  setAfadEarthquakeCacheEntry(cacheKey, snapshot, options.cacheTtlMs || AFAD_EARTHQUAKE_CACHE_DEFAULT_TTL_MS);
  return snapshot;
}

/**
 * AFAD deprem risk snapshot'ı — feature flag + cache + model.
 * @param {{ province?: string, district?: string }} location
 * @param {{ env?: Record<string, string|undefined>, fetchImpl?: typeof fetch, forceRefresh?: boolean }} [options]
 */
export async function fetchAfadEarthquakeRiskSnapshot(location = {}, options = {}) {
  const province = String(location.province || '').trim();
  const district = String(location.district || '').trim();
  const env = options.env || {};

  if (!isAfadEarthquakeEnabled(env)) {
    return buildDisabledSnapshot({ province, district });
  }

  const regionCacheKey = buildAfadEarthquakeCacheKey(REGION_CACHE_NAMESPACE, { province, district });
  if (!options.forceRefresh) {
    const cachedRegion = getAfadEarthquakeCacheEntry(regionCacheKey);
    if (cachedRegion) {
      return { ...cachedRegion, source: 'cache' };
    }
  }

  try {
    const eventsSnapshot = await getCachedAfadEvents(options);
    const model = buildAfadEarthquakeRiskModel({
      province,
      district,
      events: eventsSnapshot.events || []
    });

    const snapshot = buildResponseSnapshot({
      enabled: true,
      source: eventsSnapshot.source || 'live',
      fetchedAt: eventsSnapshot.fetchedAt,
      dataDate: eventsSnapshot.dataDate,
      location: { province, district },
      model,
      errors: []
    });

    setAfadEarthquakeCacheEntry(regionCacheKey, snapshot, options.cacheTtlMs || AFAD_EARTHQUAKE_CACHE_DEFAULT_TTL_MS);
    return snapshot;
  } catch (error) {
    const model = buildAfadEarthquakeFallbackModel({
      province,
      district,
      reason: error?.message || 'upstream_unavailable'
    });

    return buildResponseSnapshot({
      enabled: true,
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      dataDate: null,
      location: { province, district },
      model,
      errors: [{ message: error?.message || 'afad_unavailable' }]
    });
  }
}

export {
  resetAfadEarthquakeCacheForTests,
  clearAfadEarthquakeCache
};
