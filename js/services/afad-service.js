/**
 * AFAD Deprem Olay Servisi — server-side only.
 * Resmi kaynak: servisnet.afad.gov.tr apigateway
 */
import { resolveSeismicBaseRisk } from '../data/turkey-seismic-zones.js';

export const AFAD_EVENT_FILTER_URL =
  'https://servisnet.afad.gov.tr/apigateway/deprem/apiv2/event/filter';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REGION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;
const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_EVENT_LIMIT = 2500;

let eventsCache = null;
/** @type {Map<string, { snapshot: object, fetchedAt: number }>} */
const regionCache = new Map();
let lastGoodRegionalSnapshot = null;

function logAfad(level, event, fields = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    service: 'afad',
    ...fields
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
}

export function normalizeTurkishText(value = '') {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ');
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

export function buildAfadFilterUrl({
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
  return `${AFAD_EVENT_FILTER_URL}?${params.toString()}`;
}

function safeMagnitude(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * @param {unknown} payload
 * @returns {object[]}
 */
export function parseAfadEvents(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.events)) return payload.events;
  }
  return [];
}

/**
 * @param {object[]} events
 * @param {{ province?: string, district?: string }} location
 */
export function filterEventsByLocation(events = [], location = {}) {
  const provinceNorm = normalizeTurkishText(location.province);
  const districtNorm = normalizeTurkishText(location.district);

  if (!provinceNorm && !districtNorm) return [];

  return events.filter((event) => {
    const eventProvince = normalizeTurkishText(event?.province || event?.city || '');
    const eventDistrict = normalizeTurkishText(event?.district || '');

    if (districtNorm) {
      if (eventDistrict && eventDistrict === districtNorm) return true;
      if (eventDistrict && eventDistrict.includes(districtNorm)) return true;
      if (districtNorm.includes('merkez') && eventDistrict === 'merkez' && eventProvince === provinceNorm) {
        return true;
      }
    }

    if (provinceNorm && eventProvince === provinceNorm) return true;
    if (provinceNorm && eventProvince.includes(provinceNorm)) return true;
    return false;
  });
}

function activityLevelFromStats({ count = 0, maxMagnitude = 0, significantCount = 0 } = {}) {
  if (maxMagnitude >= 5 || significantCount >= 3) return 'çok yüksek';
  if (maxMagnitude >= 4 || count >= 25 || significantCount >= 1) return 'yüksek';
  if (count >= 8 || maxMagnitude >= 3) return 'orta';
  if (count >= 1) return 'düşük';
  return 'sakin';
}

function riskLevelFromScore(score) {
  if (score >= 75) return 'yüksek';
  if (score >= 55) return 'orta';
  return 'düşük';
}

function activityScoreFromStats({ count = 0, maxMagnitude = 0, avgMagnitude = 0, significantCount = 0 } = {}) {
  let score = 0;
  score += Math.min(35, count * 1.2);
  score += Math.min(40, Math.max(0, maxMagnitude - 1.5) * 12);
  score += Math.min(15, avgMagnitude * 4);
  score += Math.min(20, significantCount * 8);
  return Math.round(Math.min(100, score));
}

/**
 * İl/ilçe deprem risk agregasyonu.
 * @param {{ province?: string, district?: string, events?: object[], baseRisk?: number }} params
 */
export function aggregateEarthquakeRisk({
  province = '',
  district = '',
  events = [],
  baseRisk = null
} = {}) {
  const scopedEvents = filterEventsByLocation(events, { province, district });
  const magnitudes = scopedEvents.map((e) => safeMagnitude(e?.magnitude)).filter((m) => m != null);
  const count = scopedEvents.length;
  const maxMagnitude = magnitudes.length ? Math.max(...magnitudes) : 0;
  const avgMagnitude = magnitudes.length
    ? magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length
    : 0;
  const significantCount = magnitudes.filter((m) => m >= 4).length;

  const seismicBase = baseRisk ?? resolveSeismicBaseRisk(province);
  const activityScore = activityScoreFromStats({ count, maxMagnitude, avgMagnitude, significantCount });
  const earthquakeRiskScore = Math.round(
    Math.min(100, Math.max(0, seismicBase * 0.62 + activityScore * 0.38))
  );
  const earthquakeActivityLevel = activityLevelFromStats({ count, maxMagnitude, significantCount });
  const riskLevel = riskLevelFromScore(earthquakeRiskScore);

  const locationLabel = [province, district].filter(Boolean).join(' / ') || 'Seçilen bölge';
  const recentSample = scopedEvents
    .slice()
    .sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')))
    .slice(0, 3)
    .map((e) => ({
      eventID: e?.eventID || null,
      magnitude: safeMagnitude(e?.magnitude),
      depth: safeMagnitude(e?.depth),
      location: e?.location || null,
      province: e?.province || null,
      district: e?.district || null,
      date: e?.date || null
    }));

  const earthquakeSummary = buildEarthquakeSummary({
    locationLabel,
    province,
    district,
    count,
    maxMagnitude,
    avgMagnitude,
    earthquakeRiskScore,
    earthquakeActivityLevel,
    seismicBase
  });

  return {
    province: province || null,
    district: district || null,
    locationLabel,
    seismicBaseRisk: seismicBase,
    activityScore,
    earthquakeRiskScore,
    earthquakeActivityLevel,
    riskLevel,
    eventCount: count,
    maxMagnitude,
    avgMagnitude: Number(avgMagnitude.toFixed(2)),
    significantCount,
    recentEvents: recentSample,
    earthquakeSummary,
    hasLiveActivity: count > 0
  };
}

function buildEarthquakeSummary({
  locationLabel,
  province,
  district,
  count,
  maxMagnitude,
  avgMagnitude,
  earthquakeRiskScore,
  earthquakeActivityLevel,
  seismicBase
}) {
  const scope = district ? `${district} (${province})` : province || locationLabel;
  const activityText =
    count > 0
      ? `Son dönemde ${scope} için AFAD kayıtlarında ${count} deprem olayı izlendi; en yüksek büyüklük ${maxMagnitude.toFixed(1)}.`
      : `Son dönemde ${scope} için kayıtlı mikro-deprem aktivitesi sınırlı; bölgesel zemin riski statik profilden değerlendirildi.`;

  const band =
    earthquakeRiskScore >= 75
      ? 'yüksek deprem risk bandında'
      : earthquakeRiskScore >= 55
        ? 'orta deprem risk bandında'
        : 'görece düşük deprem risk bandında';

  return `AFAD deprem istihbaratı: ${scope} ${band} (skor ${earthquakeRiskScore}/100). Aktivite seviyesi: ${earthquakeActivityLevel}. ${activityText} Temel bölgesel risk skoru ${seismicBase}/100.`;
}

function emptyRegionalSnapshot(location = {}) {
  const province = location.province || '';
  const district = location.district || '';
  const fallbackAgg = aggregateEarthquakeRisk({ province, district, events: [] });

  return {
    configured: true,
    source: 'fallback',
    fetchedAt: new Date().toISOString(),
    dataDate: null,
    location: {
      province: province || null,
      district: district || null
    },
    ...fallbackAgg,
    errors: []
  };
}

function buildRegionalSnapshot({
  source = 'live',
  fetchedAt = new Date().toISOString(),
  dataDate = null,
  location = {},
  aggregation = {},
  errors = []
} = {}) {
  return {
    configured: true,
    source,
    fetchedAt,
    dataDate,
    location: {
      province: location.province || null,
      district: location.district || null
    },
    ...aggregation,
    errors
  };
}

function regionCacheKey(location = {}) {
  return `${normalizeTurkishText(location.province)}|${normalizeTurkishText(location.district)}`;
}

async function fetchAfadEvents(fetchImpl = fetch, options = {}) {
  const url = buildAfadFilterUrl({
    start: options.start,
    end: options.end,
    limit: options.limit,
    orderby: options.orderby
  });
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'isteBul-AFAD-Client/1.0'
        },
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timer);

      if (!response.ok) {
        lastError = new Error(`AFAD HTTP ${response.status}`);
        logAfad('warn', 'afad_events_http_error', { status: response.status, attempt });
        continue;
      }

      const contentType = response.headers?.get?.('content-type') || '';
      const bodyText = await response.text();
      if (!contentType.toLowerCase().includes('json') && !bodyText.trim().startsWith('[')) {
        lastError = new Error('AFAD non-JSON response');
        continue;
      }

      const json = JSON.parse(bodyText);
      const events = parseAfadEvents(json);
      if (!events.length) {
        lastError = new Error('AFAD returned no earthquake events');
        continue;
      }

      const latestDate = events
        .map((e) => String(e?.date || ''))
        .filter(Boolean)
        .sort()
        .pop();

      return {
        events,
        fetchedAt: new Date().toISOString(),
        dataDate: latestDate || null,
        eventCount: events.length
      };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      logAfad('warn', 'afad_events_fetch_failed', {
        attempt,
        message: error?.message || String(error)
      });
    }
  }

  throw lastError || new Error('AFAD events fetch failed');
}

/**
 * Son deprem olaylarını önbelleğe alır.
 * @param {{ fetchImpl?: typeof fetch, forceRefresh?: boolean }} [options]
 */
export async function fetchAfadEventsSnapshot(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const now = Date.now();

  if (
    !options.forceRefresh &&
    eventsCache?.events?.length &&
    now - (eventsCache.fetchedAtMs || 0) < CACHE_TTL_MS
  ) {
    return { ...eventsCache, source: 'cache' };
  }

  try {
    const pulled = await fetchAfadEvents(fetchImpl, options);
    eventsCache = { ...pulled, source: 'live', fetchedAtMs: now };
    logAfad('info', 'afad_events_snapshot_ok', { eventCount: pulled.eventCount });
    return { ...eventsCache, source: 'live' };
  } catch (error) {
    logAfad('error', 'afad_events_snapshot_failed', { message: error?.message || String(error) });
    if (eventsCache?.events?.length) {
      return { ...eventsCache, source: 'stale', errors: [{ message: 'upstream_unavailable' }] };
    }
    return {
      events: [],
      fetchedAt: new Date().toISOString(),
      dataDate: null,
      eventCount: 0,
      source: 'fallback',
      errors: [{ message: error?.message || 'afad_unavailable' }]
    };
  }
}

/**
 * İl/ilçe deprem risk snapshot'ı.
 * @param {{ province?: string, district?: string }} location
 * @param {{ fetchImpl?: typeof fetch, forceRefresh?: boolean }} [options]
 */
export async function fetchAfadRegionalRisk(location = {}, options = {}) {
  const province = String(location.province || '').trim();
  const district = String(location.district || '').trim();
  const cacheKey = regionCacheKey({ province, district });
  const now = Date.now();

  if (
    !options.forceRefresh &&
    regionCache.has(cacheKey) &&
    now - regionCache.get(cacheKey).fetchedAt < REGION_CACHE_TTL_MS
  ) {
    return { ...regionCache.get(cacheKey).snapshot, source: 'cache' };
  }

  try {
    const eventsSnapshot = await fetchAfadEventsSnapshot(options);
    const aggregation = aggregateEarthquakeRisk({
      province,
      district,
      events: eventsSnapshot.events || []
    });

    const snapshot = buildRegionalSnapshot({
      source: eventsSnapshot.source || 'live',
      fetchedAt: eventsSnapshot.fetchedAt,
      dataDate: eventsSnapshot.dataDate,
      location: { province, district },
      aggregation,
      errors: eventsSnapshot.errors || []
    });

    regionCache.set(cacheKey, { snapshot, fetchedAt: now });
    lastGoodRegionalSnapshot = snapshot;
    return snapshot;
  } catch (error) {
    logAfad('error', 'afad_regional_risk_failed', { message: error?.message || String(error) });
    if (lastGoodRegionalSnapshot && normalizeTurkishText(lastGoodRegionalSnapshot.province) === normalizeTurkishText(province)) {
      return {
        ...lastGoodRegionalSnapshot,
        source: 'stale',
        errors: [{ message: 'upstream_unavailable' }]
      };
    }
    return emptyRegionalSnapshot({ province, district });
  }
}

/** @internal test helpers */
export function __resetAfadCacheForTests() {
  eventsCache = null;
  regionCache.clear();
  lastGoodRegionalSnapshot = null;
}
