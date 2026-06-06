/**
 * AFAD deprem risk modeli — parse, doğrulama ve il/ilçe agregasyonu.
 */
import { resolveSeismicBaseRisk } from './turkey-seismic-zones.js';

export const AFAD_EARTHQUAKE_ACTIVITY_LEVELS = Object.freeze([
  'sakin',
  'düşük',
  'orta',
  'yüksek',
  'çok yüksek'
]);

export const AFAD_EARTHQUAKE_RISK_LEVELS = Object.freeze(['düşük', 'orta', 'yüksek']);

function normalizeTurkishText(value = '') {
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

function safeMagnitude(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * @param {unknown} event
 */
export function isValidAfadEarthquakeEvent(event) {
  if (!event || typeof event !== 'object') return false;
  const magnitude = safeMagnitude(event.magnitude);
  if (magnitude == null) return false;
  const hasLocation =
    Boolean(String(event.province || event.city || '').trim()) ||
    Boolean(String(event.location || '').trim());
  return hasLocation;
}

/**
 * @param {unknown} payload
 * @returns {object[]}
 */
export function parseAfadEarthquakeEvents(payload) {
  if (Array.isArray(payload)) return payload.filter(isValidAfadEarthquakeEvent);
  if (payload && typeof payload === 'object') {
    const buckets = [payload.data, payload.items, payload.events];
    for (const bucket of buckets) {
      if (Array.isArray(bucket)) {
        return bucket.filter(isValidAfadEarthquakeEvent);
      }
    }
  }
  return [];
}

/**
 * @param {object[]} events
 * @param {{ province?: string, district?: string }} location
 */
export function filterAfadEventsByLocation(events = [], location = {}) {
  const provinceNorm = normalizeTurkishText(location.province);
  const districtNorm = normalizeTurkishText(location.district);
  if (!provinceNorm && !districtNorm) return [];

  return events.filter((event) => {
    const eventProvince = normalizeTurkishText(event?.province || event?.city || '');
    const eventDistrict = normalizeTurkishText(event?.district || '');

    if (districtNorm) {
      if (eventDistrict === districtNorm || eventDistrict.includes(districtNorm)) return true;
    }
    if (provinceNorm && (eventProvince === provinceNorm || eventProvince.includes(provinceNorm))) {
      return true;
    }
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
  return clampScore(score);
}

function buildEarthquakeSummary({
  locationLabel,
  province,
  district,
  count,
  maxMagnitude,
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

/**
 * Geçersiz/boş veri için statik fallback model.
 * @param {{ province?: string, district?: string, reason?: string }} [location]
 */
export function buildAfadEarthquakeFallbackModel(location = {}) {
  const province = String(location.province || '').trim();
  const district = String(location.district || '').trim();
  const seismicBase = resolveSeismicBaseRisk(province);
  const earthquakeRiskScore = clampScore(seismicBase);
  const earthquakeActivityLevel = 'sakin';
  const locationLabel = [province, district].filter(Boolean).join(' / ') || 'Seçilen bölge';

  return {
    province: province || null,
    district: district || null,
    locationLabel,
    seismicBaseRisk: seismicBase,
    activityScore: 0,
    earthquakeRiskScore,
    earthquakeActivityLevel,
    riskLevel: riskLevelFromScore(earthquakeRiskScore),
    eventCount: 0,
    maxMagnitude: 0,
    avgMagnitude: 0,
    significantCount: 0,
    recentEvents: [],
    hasLiveActivity: false,
    earthquakeSummary: buildEarthquakeSummary({
      locationLabel,
      province,
      district,
      count: 0,
      maxMagnitude: 0,
      earthquakeRiskScore,
      earthquakeActivityLevel,
      seismicBase
    }),
    fallbackReason: location.reason || 'invalid_or_unavailable_data'
  };
}

/**
 * İl/ilçe deprem risk modeli.
 * @param {{ province?: string, district?: string, events?: object[] }} params
 */
export function buildAfadEarthquakeRiskModel({ province = '', district = '', events = [] } = {}) {
  const validEvents = (events || []).filter(isValidAfadEarthquakeEvent);
  const scopedEvents = filterAfadEventsByLocation(validEvents, { province, district });

  const magnitudes = scopedEvents.map((e) => safeMagnitude(e.magnitude)).filter((m) => m != null);
  const count = scopedEvents.length;
  const maxMagnitude = magnitudes.length ? Math.max(...magnitudes) : 0;
  const avgMagnitude = magnitudes.length
    ? magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length
    : 0;
  const significantCount = magnitudes.filter((m) => m >= 4).length;

  const seismicBase = resolveSeismicBaseRisk(province);
  const activityScore = activityScoreFromStats({ count, maxMagnitude, avgMagnitude, significantCount });
  const earthquakeRiskScore = clampScore(seismicBase * 0.62 + activityScore * 0.38);
  const earthquakeActivityLevel = activityLevelFromStats({ count, maxMagnitude, significantCount });
  const locationLabel = [province, district].filter(Boolean).join(' / ') || 'Seçilen bölge';

  const recentEvents = scopedEvents
    .slice()
    .sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')))
    .slice(0, 3)
    .map((event) => ({
      eventID: event?.eventID || null,
      magnitude: safeMagnitude(event?.magnitude),
      depth: safeMagnitude(event?.depth),
      location: event?.location || null,
      province: event?.province || null,
      district: event?.district || null,
      date: event?.date || null
    }));

  return {
    province: province || null,
    district: district || null,
    locationLabel,
    seismicBaseRisk: seismicBase,
    activityScore,
    earthquakeRiskScore,
    earthquakeActivityLevel,
    riskLevel: riskLevelFromScore(earthquakeRiskScore),
    eventCount: count,
    maxMagnitude,
    avgMagnitude: Number(avgMagnitude.toFixed(2)),
    significantCount,
    recentEvents,
    hasLiveActivity: count > 0,
    earthquakeSummary: buildEarthquakeSummary({
      locationLabel,
      province,
      district,
      count,
      maxMagnitude,
      earthquakeRiskScore,
      earthquakeActivityLevel,
      seismicBase
    }),
    fallbackReason: null
  };
}
