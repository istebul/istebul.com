/**
 * Business services (EPIC-520)
 *
 * Provider-fed Intelligence pipeline engines:
 * MetricsEngine → InsightEngine → RecommendationEngine
 */

export {
  MetricsEngine,
  computeBusinessMetrics
} from './MetricsEngine';
export type { BusinessMetricSignals, MetricsEngineResult } from './MetricsEngine';

export {
  InsightEngine,
  computeBusinessInsights
} from './InsightEngine';
export type { InsightEngineResult } from './InsightEngine';

export {
  RecommendationEngine,
  computeBusinessRecommendations
} from './RecommendationEngine';
