/**
 * AI Listings Analytics v1 — client entry (Sprint-12).
 */

import { computeRepositoryAnalytics, clearAnalyticsMemoCache } from './repository-analytics.js';
import { computeQualityDistribution } from './quality-engine.js';
import { countHighRiskRecords } from './risk-engine.js';
import { countNonNewDuplicates } from './duplicate-engine.js';
import { buildBarChartSvg, buildTrendChartSvg, buildTopListHtml, hydrateLazyCharts } from './chart-builder.js';

export {
  computeRepositoryAnalytics,
  clearAnalyticsMemoCache,
  enrichRecordsWithDuplicateSimilarity,
  computeAnalyticsKpi,
  buildAnalyticsCacheKey,
  buildDeterministicExecutiveSummary,
  computeScoreDistribution,
  computeRiskTierDistribution,
  computeExecutiveDistribution,
  computeDuplicateDistribution,
  computeSourceDistribution,
  computeCategoryDistribution,
  computeTopCounts,
  computeTrendSeries,
  computeAllTrends,
  countRecordsInDays,
  countRecordsToday,
  SCORE_BUCKETS,
  RISK_TIER_BUCKETS,
  EXECUTIVE_BUCKETS,
  DUPLICATE_BUCKETS,
  SOURCE_BUCKETS,
  CATEGORY_BUCKETS,
  TREND_WINDOWS_MS,
  bucketScoreValue,
  classifyRiskTier,
  classifyExecutiveBucket,
  classifyDuplicateBucket,
  normalizeCategoryBucket
} from './repository-analytics.js';

export { computeQualityDistribution } from './quality-engine.js';
export { countHighRiskRecords } from './risk-engine.js';
export { countNonNewDuplicates } from './duplicate-engine.js';
export { countExecutiveBucket } from './executive-engine.js';
export {
  buildBarChartSvg,
  buildTrendChartSvg,
  buildTopListHtml,
  hydrateLazyCharts,
  lazyChartPlaceholder
} from './chart-builder.js';

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ force?: boolean, nowMs?: number }} [options]
 * @returns {Record<string, unknown>}
 */
export function runAnalyticsEngine(listings, options = {}) {
  const analytics = computeRepositoryAnalytics(listings, options);
  return {
    ...analytics,
    quality_distribution: computeQualityDistribution(/** @type {Array<Record<string, unknown>>} */ (analytics.records)),
    high_risk_count: countHighRiskRecords(/** @type {Array<Record<string, unknown>>} */ (analytics.records)),
    duplicate_count: countNonNewDuplicates(/** @type {Array<Record<string, unknown>>} */ (analytics.records))
  };
}
