import type { BusinessInsightsResult } from './business-insight';
import type { BusinessMetricsResult } from './business-metrics';
import type { BusinessRecommendationsResult } from './business-recommendation';
import type { BusinessHealthResult } from '../models/business-health';

/** Full advisor pipeline output for UI consumption. */
export interface BusinessAdvisorResult {
  headline: string;
  summary: string;
  metrics: BusinessMetricsResult;
  insights: BusinessInsightsResult;
  recommendations: BusinessRecommendationsResult;
  /** EPIC-540 overall health + executive KPIs (optional for older callers). */
  health?: BusinessHealthResult;
  source: 'mock';
  generatedAt: string;
}
