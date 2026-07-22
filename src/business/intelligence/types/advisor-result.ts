import type { BusinessInsightsResult } from './business-insight';
import type { BusinessMetricsResult } from './business-metrics';
import type { BusinessRecommendationsResult } from './business-recommendation';

/** Full advisor pipeline output for UI consumption. */
export interface BusinessAdvisorResult {
  headline: string;
  summary: string;
  metrics: BusinessMetricsResult;
  insights: BusinessInsightsResult;
  recommendations: BusinessRecommendationsResult;
  source: 'mock';
  generatedAt: string;
}
