/**
 * Business Intelligence Engine (EPIC-510)
 *
 * Data Provider → Metrics Engine → Insight Engine → Recommendation Engine → Advisor UI
 *
 * Mock-only foundation. No API, DB, auth, or tenant integration.
 */

export { MOCK_BUSINESS_RAW_DATA } from './data/mock-business-data';
export {
  MockBusinessDataProvider,
  createMockBusinessDataProvider
} from './providers/MockDataProvider';
export { computeBusinessMetrics } from './metrics/MetricsEngine';
export { computeBusinessInsights } from './insights/InsightEngine';
export { computeBusinessRecommendations } from './recommendations/RecommendationEngine';
export {
  runBusinessIntelligenceEngine
} from './pipeline/BusinessIntelligenceEngine';
export type { BusinessIntelligenceEngineOptions } from './pipeline/BusinessIntelligenceEngine';

export type {
  IBusinessDataProvider,
  RawBusinessData,
  BusinessDataPoint,
  BusinessCategoryMargin
} from './types/raw-business-data';
export type {
  BusinessMetric,
  BusinessMetricId,
  BusinessMetricsResult,
  MetricTrendDirection
} from './types/business-metrics';
export type {
  BusinessInsight,
  BusinessInsightsResult,
  InsightKind,
  InsightSeverity
} from './types/business-insight';
export type {
  BusinessRecommendation,
  BusinessRecommendationsResult,
  RecommendationPriority
} from './types/business-recommendation';
export type { BusinessAdvisorResult } from './types/advisor-result';
