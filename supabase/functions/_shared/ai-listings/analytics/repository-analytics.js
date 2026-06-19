/**
 * AI Listings Repository Analytics — core orchestrator (Sprint-12).
 * Derives analytics from repository records; memoized for large datasets.
 */

import { buildRepositoryRecords } from '../repository/repository-engine.js';
import { runDuplicateEngine } from '../duplicate/duplicate-engine.js';
import {
  computeScoreDistribution,
  computeRiskTierDistribution,
  computeExecutiveDistribution,
  computeDuplicateDistribution,
  computeSourceDistribution,
  computeCategoryDistribution,
  computeTopCounts,
  roundAverage,
  classifyDuplicateBucket
} from './distribution-engine.js';
import {
  computeAllTrends,
  countRecordsInDays,
  countRecordsToday
} from './trend-engine.js';
import { buildDeterministicExecutiveSummary } from './summary-engine.js';

/** @type {{ key: string, value: Record<string, unknown>|null }} */
const memoState = { key: '', value: null };

/**
 * @param {Array<Record<string, unknown>>} listings
 * @returns {string}
 */
export function buildAnalyticsCacheKey(listings) {
  if (!listings.length) return 'empty';
  if (listings.length > 500) {
    let maxUpdated = '';
    for (let index = 0; index < listings.length; index += 1) {
      const updated = String(listings[index]?.updated_at ?? listings[index]?.created_at ?? '');
      if (updated > maxUpdated) maxUpdated = updated;
    }
    return `bulk:${listings.length}:${maxUpdated}`;
  }
  return listings
    .map((listing) => `${listing.id}:${listing.updated_at ?? listing.created_at ?? ''}`)
    .join('|');
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @returns {Array<Record<string, unknown>>}
 */
export function enrichRecordsWithDuplicateSimilarity(listings) {
  const records = buildRepositoryRecords(listings, { includeDuplicateDetection: false });

  return records.map((record) => {
    const listing = listings.find((item) => String(item.id) === String(record.id));
    if (!listing) return record;

    const duplicate = runDuplicateEngine(listing, listings, {
      excludeId: String(listing.id ?? '')
    });

    return {
      ...record,
      duplicate_status: duplicate.status,
      duplicate_similarity: duplicate.similarity,
      duplicate_bucket: classifyDuplicateBucket(duplicate.status, duplicate.similarity)
    };
  });
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {number} [nowMs]
 * @returns {Record<string, unknown>}
 */
export function computeAnalyticsKpi(records, nowMs = Date.now()) {
  let duplicate = 0;
  let highRisk = 0;
  /** @type {number[]} */
  const aiScores = [];
  /** @type {number[]} */
  const qualityScores = [];

  for (const record of records) {
    const bucket = String(record.duplicate_bucket ?? record.duplicate_status ?? 'new');
    if (bucket !== 'new') duplicate += 1;

    const risk = Number(record.risk_score);
    if (Number.isFinite(risk) && risk >= 61) highRisk += 1;

    const ai = Number(record.decision_score);
    if (Number.isFinite(ai)) aiScores.push(ai);

    const quality = Number(record.quality_score);
    if (Number.isFinite(quality)) qualityScores.push(quality);
  }

  return {
    total: records.length,
    today: countRecordsToday(records, nowMs),
    last_7_days: countRecordsInDays(records, 7, nowMs),
    last_30_days: countRecordsInDays(records, 30, nowMs),
    duplicate,
    high_risk: highRisk,
    average_ai: roundAverage(aiScores),
    average_quality: roundAverage(qualityScores)
  };
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ force?: boolean, nowMs?: number }} [options]
 * @returns {Record<string, unknown>}
 */
export function computeRepositoryAnalytics(listings, options = {}) {
  const cacheKey = buildAnalyticsCacheKey(listings);
  if (!options.force && memoState.key === cacheKey && memoState.value) {
    return memoState.value;
  }

  const nowMs = options.nowMs ?? Date.now();
  const records = enrichRecordsWithDuplicateSimilarity(listings);
  const kpi = computeAnalyticsKpi(records, nowMs);
  const trends = computeAllTrends(records, nowMs);

  const analytics = {
    records,
    kpi,
    trends,
    distributions: {
      ai_score: computeScoreDistribution(records, 'decision_score'),
      quality: computeScoreDistribution(records, 'quality_score'),
      risk: computeRiskTierDistribution(records),
      executive: computeExecutiveDistribution(records),
      duplicate: computeDuplicateDistribution(records),
      source: computeSourceDistribution(records),
      category: computeCategoryDistribution(records)
    },
    top_brands: computeTopCounts(records, 'brand', 10),
    top_models: computeTopCounts(records, 'model', 10),
    summary: ''
  };

  analytics.summary = buildDeterministicExecutiveSummary(analytics, { windowDays: 7 });

  memoState.key = cacheKey;
  memoState.value = analytics;
  return analytics;
}

/**
 * Clears memoization cache (for tests).
 */
export function clearAnalyticsMemoCache() {
  memoState.key = '';
  memoState.value = null;
}

export { buildDeterministicExecutiveSummary } from './summary-engine.js';
export {
  computeScoreDistribution,
  computeRiskTierDistribution,
  computeExecutiveDistribution,
  computeDuplicateDistribution,
  computeSourceDistribution,
  computeCategoryDistribution,
  computeTopCounts,
  SCORE_BUCKETS,
  RISK_TIER_BUCKETS,
  EXECUTIVE_BUCKETS,
  DUPLICATE_BUCKETS,
  SOURCE_BUCKETS,
  CATEGORY_BUCKETS
} from './distribution-engine.js';
export {
  computeTrendSeries,
  computeAllTrends,
  countRecordsInDays,
  countRecordsToday,
  TREND_WINDOWS_MS
} from './trend-engine.js';
