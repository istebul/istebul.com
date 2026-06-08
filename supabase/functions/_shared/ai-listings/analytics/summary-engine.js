/**
 * AI Listings Analytics — deterministic executive summary (Sprint-12).
 * No LLM; derived entirely from computed analytics snapshot.
 */

import { roundAverage } from './distribution-engine.js';

/**
 * @param {Record<string, unknown>} dominantRisk
 * @returns {string}
 */
function describeRiskDominance(dominantRisk) {
  const id = String(dominantRisk?.id ?? '');
  if (id === 'low') return 'düşük seviyededir';
  if (id === 'high') return 'yüksek seviyededir';
  return 'orta seviyededir';
}

/**
 * @param {Record<string, unknown>} analytics
 * @param {{ windowDays?: number }} [options]
 * @returns {string}
 */
export function buildDeterministicExecutiveSummary(analytics, options = {}) {
  const windowDays = options.windowDays ?? 7;
  const trends = /** @type {Record<string, { total?: number }>} */ (analytics.trends ?? {});
  const windowKey = windowDays <= 1 ? '24h' : windowDays <= 7 ? '7d' : '30d';
  const processed = Number(trends[windowKey]?.total ?? analytics.kpi?.last_7_days ?? 0);

  const avgAi = analytics.kpi?.average_ai ?? roundAverageFromRecords(analytics, 'decision_score');
  const avgQuality = analytics.kpi?.average_quality ?? roundAverageFromRecords(analytics, 'quality_score');
  const duplicateRate = computeDuplicateRate(analytics);

  const riskDistribution = /** @type {Array<{ id: string, count: number }>} */ (
    analytics.distributions?.risk ?? []
  );
  const dominantRisk = pickDominantBucket(riskDistribution);

  const categoryDistribution = /** @type {Array<{ label: string, count: number }>} */ (
    analytics.distributions?.category ?? []
  );
  const topCategory = pickTopLabel(categoryDistribution);

  const topBrands = /** @type {Array<{ label: string }>} */ (analytics.top_brands ?? []);
  const topBrand = topBrands[0]?.label ?? '—';

  const windowLabel = windowDays <= 1 ? '24 saatte' : windowDays <= 7 ? '7 günde' : '30 günde';

  const parts = [
    `Son ${windowLabel} ${processed} ilan işlendi.`,
    avgAi !== null ? `Ortalama AI skoru ${avgAi},` : null,
    avgQuality !== null ? `kalite skoru ${avgQuality},` : null,
    `duplicate oranı %${duplicateRate}.`,
    `Risk dağılımı ağırlıklı olarak ${describeRiskDominance(dominantRisk)}.`,
    topCategory ? `En yoğun kategori ${topCategory},` : null,
    `en sık marka ${topBrand} olarak görünmektedir.`
  ].filter(Boolean);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * @param {Record<string, unknown>} analytics
 * @param {string} field
 * @returns {number|null}
 */
function roundAverageFromRecords(analytics, field) {
  const records = /** @type {Array<Record<string, unknown>>} */ (analytics.records ?? []);
  const values = records
    .map((record) => Number(record[field]))
    .filter((value) => Number.isFinite(value));
  return roundAverage(values);
}

/**
 * @param {Record<string, unknown>} analytics
 * @returns {number}
 */
function computeDuplicateRate(analytics) {
  const total = Number(analytics.kpi?.total ?? 0);
  if (total <= 0) return 0;
  const duplicate = Number(analytics.kpi?.duplicate ?? 0);
  return Math.round((duplicate / total) * 100);
}

/**
 * @param {Array<{ id?: string, count?: number }>} buckets
 * @returns {{ id: string, count: number }}
 */
function pickDominantBucket(buckets) {
  let top = { id: 'medium', count: 0 };
  for (const bucket of buckets) {
    const count = Number(bucket.count ?? 0);
    if (count > top.count) top = { id: String(bucket.id ?? ''), count };
  }
  return top;
}

/**
 * @param {Array<{ label?: string, count?: number }>} buckets
 * @returns {string|null}
 */
function pickTopLabel(buckets) {
  let topLabel = null;
  let topCount = 0;
  for (const bucket of buckets) {
    const count = Number(bucket.count ?? 0);
    if (count > topCount) {
      topCount = count;
      topLabel = String(bucket.label ?? '');
    }
  }
  return topLabel;
}
