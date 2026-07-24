import type { BusinessInsightsResult } from './business-insight';
import type { BusinessMetricsResult } from './business-metrics';
import type { BusinessRecommendationsResult } from './business-recommendation';

/**
 * Business Intelligence pipeline tarafından UI ve runtime katmanına
 * sunulan birleşik danışman sonucu.
 */
export interface BusinessAdvisorResult {
  headline: string;
  summary: string;
  metrics: BusinessMetricsResult;
  health: BusinessHealthResult;
  kpi: BusinessKpiSnapshot;
  events: EventIntelligenceResult;
  insights: BusinessInsightsResult;
  recommendations: BusinessRecommendationsResult;
  source: 'mock';
  generatedAt: string;
}
