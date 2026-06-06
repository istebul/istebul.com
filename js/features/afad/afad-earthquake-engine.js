/**
 * AFAD Earthquake Engine — konut karar motoru için resmi deprem istihbaratı.
 * AFAD verisi yoksa mevcut manuel skor korunur (null / hasData: false).
 */
import { withTimeout } from '../../core/async-utils.js';
import { clampScore } from '../results/results-engine.js';

const AFAD_SNAPSHOT_TIMEOUT_MS = 6000;

/** @typedef {{
 *   earthquakeRiskScore?: number|null,
 *   earthquakeActivityLevel?: string,
 *   earthquakeSummary?: string,
 *   riskLevel?: string,
 *   eventCount?: number,
 *   maxMagnitude?: number,
 *   recentEvents?: object[]
 * }} AfadRiskSnapshot */

export const AFAD_MAX_DECISION_IMPACT_RATIO = 0.08;

function safeNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * AFAD API yanıtını normalize eder.
 * @param {object} data
 * @returns {AfadRiskSnapshot|null}
 */
export function normalizeAfadRiskSnapshot(data = {}) {
  if (!data || typeof data !== 'object') return null;
  const score = safeNumber(data.earthquakeRiskScore);
  if (score == null) return null;

  return {
    earthquakeRiskScore: clampScore(score),
    earthquakeActivityLevel: String(data.earthquakeActivityLevel || 'sakin'),
    earthquakeSummary: String(data.earthquakeSummary || '').trim(),
    riskLevel: String(data.riskLevel || 'orta'),
    seismicBaseRisk: safeNumber(data.seismicBaseRisk),
    activityScore: safeNumber(data.activityScore),
    eventCount: safeNumber(data.eventCount) ?? 0,
    maxMagnitude: safeNumber(data.maxMagnitude) ?? 0,
    avgMagnitude: safeNumber(data.avgMagnitude) ?? 0,
    significantCount: safeNumber(data.significantCount) ?? 0,
    recentEvents: Array.isArray(data.recentEvents) ? data.recentEvents : [],
    location: data.location || {},
    source: data.source || null,
    status: data.status || null,
    fetchedAt: data.fetchedAt || null,
    dataDate: data.dataDate || null
  };
}

/**
 * AFAD verisi kullanılabilir mi?
 * @param {AfadRiskSnapshot|null} snapshot
 */
export function hasAfadData(snapshot = null) {
  return snapshot != null && safeNumber(snapshot.earthquakeRiskScore) != null;
}

/**
 * Manuel ve AFAD deprem skorlarını harmanlar (AFAD öncelikli, manuel yedek).
 * @param {number|null} manualScore
 * @param {AfadRiskSnapshot|null} afadSnapshot
 */
export function blendEarthquakeRiskScore(manualScore, afadSnapshot = null) {
  const manual = safeNumber(manualScore);
  const afad = safeNumber(afadSnapshot?.earthquakeRiskScore);

  if (afad != null && manual != null) {
    return clampScore(Math.round(afad * 0.75 + manual * 0.25));
  }
  if (afad != null) return clampScore(afad);
  if (manual != null) return clampScore(manual);
  return 40;
}

/**
 * AFAD skor ayarlamasını sınırlar.
 * @param {number} baseScore
 * @param {number} rawAdjustment
 */
export function capAfadScoreImpact(baseScore, rawAdjustment) {
  const base = clampScore(typeof baseScore === 'number' && Number.isFinite(baseScore) ? baseScore : 70);
  const raw = Number(rawAdjustment);
  if (!Number.isFinite(raw) || raw === 0) return 0;
  const maxAbs = Math.max(1, Math.round(base * AFAD_MAX_DECISION_IMPACT_RATIO));
  return clamp(Math.round(raw), -maxAbs, maxAbs);
}

/**
 * AFAD deprem istihbaratını karar context'ine uygular.
 * @param {object} context
 * @param {AfadRiskSnapshot|null} afadSnapshot
 */
export function applyAfadToDecisionContext(context = {}, afadSnapshot = null) {
  if (!context || !hasAfadData(afadSnapshot)) return context;

  const factors = context.scoreFactors || [];
  const warnings = context.warnings || [];
  const score = safeNumber(afadSnapshot.earthquakeRiskScore);
  const manual = safeNumber(context.earthquakeRisk);
  const delta = manual != null ? score - manual : 0;
  const adjustment = capAfadScoreImpact(context.legacyScore ?? 70, Math.round(delta * 0.15));

  context.afadEarthquake = afadSnapshot;
  context.earthquakeRisk = blendEarthquakeRiskScore(manual, afadSnapshot);
  context.afadScoreAdjustment = adjustment;
  context.earthquakeSource = 'afad';

  if (adjustment !== 0) {
    factors.push({
      label: 'Deprem riski (AFAD)',
      impact: adjustment > 0 ? `+${adjustment}` : String(adjustment),
      reason: afadSnapshot.earthquakeSummary.split('.')[0] || 'AFAD deprem istihbaratı'
    });
  }

  if (score >= 75) {
    warnings.push('AFAD verilerine göre deprem riski yüksek seviyede.');
  } else if (afadSnapshot.earthquakeActivityLevel === 'yüksek' || afadSnapshot.earthquakeActivityLevel === 'çok yüksek') {
    warnings.push('Bölgede son dönemde artan deprem aktivitesi izleniyor.');
  }

  context.scoreFactors = factors;
  context.warnings = warnings;
  context.earthquakeAssessment = afadSnapshot.earthquakeSummary;
  return context;
}

/**
 * AI özetine beslenecek deprem değerlendirme metni.
 * @param {AfadRiskSnapshot|null} snapshot
 */
export function buildAfadAssessmentText(snapshot = null) {
  if (!hasAfadData(snapshot)) return '';
  return snapshot.earthquakeSummary || '';
}

function buildAfadQuery(city = '', district = '') {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (district) params.set('district', district);
  return `/api/afad-earthquake-snapshot?${params.toString()}`;
}

/**
 * Tarayıcıda AFAD snapshot çeker.
 * @param {{ city?: string, district?: string }} location
 * @param {Function} [fetchImpl]
 * @param {number} [timeoutMs]
 * @returns {Promise<AfadRiskSnapshot|null>}
 */
export async function fetchAfadRiskForEngine(
  location = {},
  fetchImpl = globalThis.fetch,
  timeoutMs = AFAD_SNAPSHOT_TIMEOUT_MS
) {
  const city = String(location.city || location.province || '').trim();
  const district = String(location.district || '').trim();
  if (!city || typeof fetchImpl !== 'function') return null;

  try {
    const res = await withTimeout(
      fetchImpl(buildAfadQuery(city, district), { credentials: 'same-origin' }),
      timeoutMs,
      null
    );
    if (!res || !res.ok) return null;
    const body = await res.json().catch(() => null);
    const data = body?.data ?? body;
    return normalizeAfadRiskSnapshot(data);
  } catch {
    return null;
  }
}

/**
 * metrics nesnesine AFAD deprem skorunu enjekte eder (yerinde, geri alınabilir).
 * @param {object} metrics
 * @param {AfadRiskSnapshot|null} afadSnapshot
 * @param {number|null} [manualScore]
 */
export function injectAfadIntoMetrics(metrics = {}, afadSnapshot = null, manualScore = null) {
  if (!metrics || !hasAfadData(afadSnapshot)) return metrics;
  const manual = safeNumber(manualScore ?? metrics.earthquakeRiskScore);
  metrics.earthquakeRiskScore = blendEarthquakeRiskScore(manual, afadSnapshot);
  metrics.earthquakeSource = 'afad';
  metrics.afadEarthquake = afadSnapshot;
  return metrics;
}
