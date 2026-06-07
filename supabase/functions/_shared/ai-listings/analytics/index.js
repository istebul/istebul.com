/**
 * AI Listings Analytics — shared edge entry (Sprint-12).
 */

export {
  computeRepositoryAnalytics,
  enrichRecordsWithDuplicateSimilarity,
  computeAnalyticsKpi,
  buildAnalyticsCacheKey,
  clearAnalyticsMemoCache,
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
  TREND_WINDOWS_MS
} from './repository-analytics.js';

export {
  bucketScoreValue,
  classifyRiskTier,
  classifyExecutiveBucket,
  classifyDuplicateBucket,
  normalizeCategoryBucket
} from './distribution-engine.js';
