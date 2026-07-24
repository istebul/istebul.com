import type { BusinessInsightsResult } from './business-insight';
import type { BusinessMetricsResult } from './business-metrics';
import type { BusinessRecommendationsResult } from './business-recommendation';
import type { BusinessHealthResult } from '../models/business-health';
import type { BusinessKpiSnapshot } from '../models/business-kpi';
import type { EventIntelligenceResult } from '../models/business-events';

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
