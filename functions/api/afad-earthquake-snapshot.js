/**
 * Public AFAD deprem snapshot (sanitized). Upstream fetch stays server-side only.
 */
import {
  AFAD_EARTHQUAKE_CACHE_DEFAULT_TTL_MS,
  buildAfadEarthquakeCacheKey,
  getAfadEarthquakeCacheEntry,
  setAfadEarthquakeCacheEntry
} from '../../js/data/afad-earthquake-cache.js';
import {
  buildAfadEarthquakeFallbackModel,
  buildAfadEarthquakeRiskModel,
  parseAfadEarthquakeEvents
} from '../../js/data/afad-earthquake-model.js';
import {
  buildAfadEarthquakeFilterUrl,
  isAfadEarthquakeEnabled
} from '../../js/data/afad-earthquake-service.js';
import { resolveCorsOrigin } from '../_shared/cors-origins.js';
import { jsonApiHead, jsonApiResponse, logApiEvent } from '../_shared/api-response.js';

const SNAPSHOT_CACHE_NAMESPACE = 'afad-api-snapshot';
const NATIONAL_EVENTS_NAMESPACE = 'afad-api-events';
const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_EVENT_LIMIT = 2500;
const PUBLIC_EARTHQUAKE_LIMIT = 25;
const PUBLIC_REGIONAL_LIMIT = 12;
const REQUEST_TIMEOUT_MS = 12_000;

/** @type {object|null} */
let lastGoodNationalSnapshot = null;

const corsHeaders = (origin = null) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=1800, stale-while-revalidate=21600'
});

const AFAD_ATTRIBUTION = Object.freeze({
  provider: 'AFAD Deprem Dairesi',
  url: 'https://www.afad.gov.tr/',
  disclaimer:
    'Bilgilendirme amaçlı deprem aktivite verisi; resmi uyarı veya acil durum bildirimi değildir.'
});

function normalizeProvinceKey(value = '') {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/** @param {unknown} event */
export function sanitizePublicEarthquakeEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const magnitude = Number(event.magnitude);
  const depth = Number(event.depth);
  return {
    date: event.date ? String(event.date) : null,
    magnitude: Number.isFinite(magnitude) ? magnitude : null,
    depth: Number.isFinite(depth) ? depth : null,
    location: event.location ? String(event.location) : null,
    province: event.province || event.city ? String(event.province || event.city) : null,
    district: event.district ? String(event.district) : null
  };
}

/** @param {object} model */
export function sanitizeRegionalSignal(model = {}, { province = null, district = null } = {}) {
  return {
    province: model.province || province || null,
    district: model.district || district || null,
    locationLabel: model.locationLabel || null,
    eventCount: Number(model.eventCount) || 0,
    maxMagnitude: Number(model.maxMagnitude) || 0,
    avgMagnitude: Number(model.avgMagnitude) || 0,
    significantCount: Number(model.significantCount) || 0,
    activityLevel: model.earthquakeActivityLevel || 'sakin',
    hasLiveActivity: Boolean(model.hasLiveActivity),
    summary: model.earthquakeSummary || null,
    fallbackReason: model.fallbackReason || null
  };
}

function hasUsableEarthquakes(earthquakes = []) {
  return Array.isArray(earthquakes) && earthquakes.some((event) => event?.magnitude != null);
}

/** Public API source: healthy AFAD data surfaces as "afad". */
export function toPublicAfadSource(snapshot = {}) {
  const internal = snapshot.source;
  if (internal === 'live' || internal === 'cache') return 'afad';
  if (internal === 'stale' && hasUsableEarthquakes(snapshot.earthquakes)) return 'afad';
  if (internal === 'disabled') return 'disabled';
  return 'fallback';
}

export function buildAfadFallbackReason(snapshot = {}, env = {}) {
  const internal = snapshot.source;
  const featureEnabled = isAfadEarthquakeEnabled(env);

  if (!featureEnabled) {
    return 'AFAD_EARTHQUAKE_ENABLED (veya AFAD_EARTHQUAKE_FEATURE_ENABLED) kapalı';
  }
  if (internal === 'stale') {
    const detail = snapshot.errors?.[0]?.message || 'upstream_unavailable';
    return `Canlı AFAD yanıtı alınamadı; önbellekteki son veri kullanılıyor (${detail})`;
  }
  if (internal === 'fallback') {
    const detail = snapshot.errors?.[0]?.message;
    return detail ? `AFAD canlı veri çekilemedi (${detail})` : 'AFAD canlı veri çekilemedi';
  }
  return null;
}

function buildRegionalSignalsFromEvents(events = [], { province = '', district = '' } = {}) {
  const provinceNorm = normalizeProvinceKey(province);
  const districtNorm = normalizeProvinceKey(district);

  if (provinceNorm || districtNorm) {
    const model = buildAfadEarthquakeRiskModel({
      province: province.trim(),
      district: district.trim(),
      events
    });
    return [sanitizeRegionalSignal(model, { province, district })];
  }

  const byProvince = new Map();
  for (const event of events) {
    const key = String(event?.province || event?.city || '').trim();
    if (!key) continue;
    const bucket = byProvince.get(key) || [];
    bucket.push(event);
    byProvince.set(key, bucket);
  }

  return [...byProvince.entries()]
    .map(([prov, scopedEvents]) => {
      const model = buildAfadEarthquakeRiskModel({ province: prov, events: scopedEvents });
      return sanitizeRegionalSignal(model, { province: prov });
    })
    .sort((a, b) => b.eventCount - a.eventCount || b.maxMagnitude - a.maxMagnitude)
    .slice(0, PUBLIC_REGIONAL_LIMIT);
}

function buildFallbackRegionalSignals({ province = '', district = '', reason = 'upstream_unavailable' } = {}) {
  const model = buildAfadEarthquakeFallbackModel({
    province: province.trim(),
    district: district.trim(),
    reason
  });
  return [sanitizeRegionalSignal(model, { province, district })];
}

function buildDisabledPayload() {
  return {
    status: 'disabled',
    source: 'disabled',
    fetchedAt: null,
    dataDate: null,
    earthquakes: [],
    regionalSignals: [],
    attribution: {
      ...AFAD_ATTRIBUTION,
      disclaimer: 'AFAD deprem veri katmanı bu ortamda etkin değil.'
    }
  };
}

function buildSnapshotPayload(snapshot = {}) {
  const publicSource = toPublicAfadSource(snapshot);
  const status =
    publicSource === 'afad'
      ? 'connected'
      : publicSource === 'disabled'
        ? 'disabled'
        : 'degraded';

  return {
    status,
    source: publicSource,
    fetchedAt: snapshot.fetchedAt || null,
    dataDate: snapshot.dataDate || null,
    earthquakes: snapshot.earthquakes || [],
    regionalSignals: snapshot.regionalSignals || [],
    attribution: {
      ...AFAD_ATTRIBUTION,
      disclaimer:
        publicSource === 'afad'
          ? AFAD_ATTRIBUTION.disclaimer
          : 'Veri geçici olarak kullanılamıyor.'
    }
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
        'User-Agent': 'isteBul-AFAD-Snapshot/1.0'
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

async function getCachedNationalEvents(options = {}) {
  const cacheKey = buildAfadEarthquakeCacheKey(NATIONAL_EVENTS_NAMESPACE, {
    lookbackDays: options.lookbackDays || DEFAULT_LOOKBACK_DAYS,
    limit: options.limit || DEFAULT_EVENT_LIMIT
  });

  if (!options.forceRefresh) {
    const cached = getAfadEarthquakeCacheEntry(cacheKey);
    if (cached) return { ...cached, source: 'cache' };
  }

  const pulled = await fetchAfadEarthquakeEvents(options.fetchImpl || fetch, options);
  const snapshot = { ...pulled, source: 'live' };
  setAfadEarthquakeCacheEntry(
    cacheKey,
    snapshot,
    options.cacheTtlMs || AFAD_EARTHQUAKE_CACHE_DEFAULT_TTL_MS
  );
  return snapshot;
}

function buildNationalSnapshotBody(eventsSnapshot, { province = '', district = '' } = {}) {
  const events = eventsSnapshot.events || [];
  const earthquakes = events
    .slice()
    .sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')))
    .slice(0, PUBLIC_EARTHQUAKE_LIMIT)
    .map(sanitizePublicEarthquakeEvent)
    .filter(Boolean);

  return {
    source: eventsSnapshot.source || 'live',
    fetchedAt: eventsSnapshot.fetchedAt,
    dataDate: eventsSnapshot.dataDate,
    earthquakes,
    regionalSignals: buildRegionalSignalsFromEvents(events, { province, district }),
    errors: []
  };
}

/**
 * Server-side AFAD national snapshot with cache + stale fallback.
 * @param {Record<string, string|undefined>} env
 * @param {{ fetchImpl?: typeof fetch, forceRefresh?: boolean, province?: string, district?: string }} [options]
 */
export async function fetchAfadEarthquakeNationalSnapshot(env = {}, options = {}) {
  const province = String(options.province || '').trim();
  const district = String(options.district || '').trim();
  const locationKey = buildAfadEarthquakeCacheKey(SNAPSHOT_CACHE_NAMESPACE, { province, district });

  if (!options.forceRefresh) {
    const cached = getAfadEarthquakeCacheEntry(locationKey);
    if (cached) return { ...cached, source: 'cache' };
  }

  try {
    const eventsSnapshot = await getCachedNationalEvents(options);
    const snapshot = buildNationalSnapshotBody(eventsSnapshot, { province, district });
    lastGoodNationalSnapshot = snapshot;
    setAfadEarthquakeCacheEntry(
      locationKey,
      snapshot,
      options.cacheTtlMs || AFAD_EARTHQUAKE_CACHE_DEFAULT_TTL_MS
    );
    return snapshot;
  } catch (error) {
    const message = error?.message || 'afad_unavailable';
    if (lastGoodNationalSnapshot) {
      return {
        ...lastGoodNationalSnapshot,
        source: 'stale',
        errors: [{ message }]
      };
    }

    return {
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      dataDate: null,
      earthquakes: [],
      regionalSignals: buildFallbackRegionalSignals({
        province,
        district,
        reason: message
      }),
      errors: [{ message }]
    };
  }
}

function responseContainsSecrets(bodyText, env = {}) {
  const needles = [
    'AFAD_EARTHQUAKE_ENABLED',
    'AFAD_EARTHQUAKE_FEATURE_ENABLED',
    'api_key',
    'apikey',
    'authorization',
    'bearer ',
    'secret'
  ];
  const lower = String(bodyText || '').toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

/** @internal test helper */
export function __resetAfadSnapshotStateForTests() {
  lastGoodNationalSnapshot = null;
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestHead(context) {
  const origin = context.request.headers.get('Origin');
  return jsonApiHead(corsHeaders(origin));
}

export async function onRequestGet(context) {
  const origin = context.request.headers.get('Origin');
  const url = new URL(context.request.url);
  const province = url.searchParams.get('province') || '';
  const district = url.searchParams.get('district') || '';

  if (!isAfadEarthquakeEnabled(context.env)) {
    const payload = buildDisabledPayload();
    const meta = {
      featureEnabled: false,
      fallbackReason: buildAfadFallbackReason({ source: 'disabled' }, context.env)
    };

    logApiEvent('info', 'afad_earthquake_snapshot_disabled', {
      status: payload.status,
      source: payload.source
    });

    return jsonApiResponse({ ok: false, data: payload, meta }, 200, corsHeaders(origin));
  }

  try {
    const snapshot = await fetchAfadEarthquakeNationalSnapshot(context.env, { province, district });
    const payload = buildSnapshotPayload(snapshot);
    const fallbackReason = buildAfadFallbackReason(snapshot, context.env);
    const meta = {
      stale: snapshot.source === 'stale',
      errorCount: snapshot.errors?.length || 0,
      sourceDetail: snapshot.source,
      featureEnabled: true
    };
    if (fallbackReason) {
      meta.fallbackReason = fallbackReason;
    }

    logApiEvent('info', 'afad_earthquake_snapshot_served', {
      status: payload.status,
      source: payload.source,
      sourceDetail: snapshot.source,
      earthquakeCount: payload.earthquakes.length,
      regionalSignalCount: payload.regionalSignals.length
    });

    const body = { ok: payload.status === 'connected', data: payload, meta };
    const serialized = JSON.stringify(body);
    if (responseContainsSecrets(serialized, context.env)) {
      logApiEvent('error', 'afad_earthquake_snapshot_secret_leak_blocked');
      const safePayload = buildSnapshotPayload({
        source: 'fallback',
        fetchedAt: null,
        dataDate: null,
        earthquakes: [],
        regionalSignals: buildFallbackRegionalSignals({ province, district, reason: 'sanitization_error' })
      });
      return jsonApiResponse(
        {
          ok: false,
          data: safePayload,
          meta: { ...meta, fallbackReason: 'Yanıt sanitize edilemedi' }
        },
        200,
        corsHeaders(origin)
      );
    }

    return jsonApiResponse(body, 200, corsHeaders(origin));
  } catch (error) {
    const message = error?.message || 'unknown';
    logApiEvent('error', 'afad_earthquake_snapshot_handler_error', { message });

    const payload = buildSnapshotPayload({
      source: 'fallback',
      fetchedAt: null,
      dataDate: null,
      earthquakes: [],
      regionalSignals: buildFallbackRegionalSignals({
        province,
        district,
        reason: message
      }),
      errors: [{ message }]
    });
    const meta = {
      degraded: true,
      fallbackReason: `API işleyici hatası (${message})`,
      featureEnabled: true
    };

    return jsonApiResponse({ ok: false, data: payload, meta }, 200, corsHeaders(origin));
  }
}
