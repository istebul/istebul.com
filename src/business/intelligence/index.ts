/**
 * Business Intelligence Engine (EPIC-510 + EPIC-520 provider architecture)
 *
 * ProviderFactory → MetricsEngine → InsightEngine → RecommendationEngine → Advisor UI
 *
 * Mock-only foundation. No API, DB, auth, or tenant integration.
 */

export { MOCK_BUSINESS_RAW_DATA } from './data/mock-business-data';
export {
  MockBusinessDataProvider,
  createMockBusinessDataProvider
} from './providers/MockDataProvider';
export {
  MockBusinessProvider,
  createMockBusinessProvider
} from '../providers/MockBusinessProvider';
export {
  createBusinessDataProvider,
  getDefaultBusinessDataProvider
} from '../providers/ProviderFactory';
export { computeBusinessMetrics, MetricsEngine } from '../services/MetricsEngine';
export { computeBusinessInsights, InsightEngine } from '../services/InsightEngine';
export {
  computeBusinessRecommendations,
  RecommendationEngine
} from '../services/RecommendationEngine';
export {
  runBusinessIntelligenceEngine
} from './pipeline/BusinessIntelligenceEngine';
export type { BusinessIntelligenceEngineOptions } from './pipeline/BusinessIntelligenceEngine';

export type {
  BusinessDataProvider,
  BusinessProviderKind
} from '../types/business-provider';
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
export type {
  BusinessMetricSignals,
  MetricsEngineResult
} from '../services/MetricsEngine';
export type { InsightEngineResult } from '../services/InsightEngine';
