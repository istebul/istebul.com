import type { BusinessInsightsResult } from './business-insight';
import type { BusinessMetricsResult } from './business-metrics';
import type { BusinessRecommendationsResult } from './business-recommendation';
import type { BusinessHealthResult } from '../models/business-health';
import type { BusinessKpiSnapshot } from '../models/business-kpi';
import type { EventIntelligenceResult } from '../models/business-events';

/** Full advisor pipeline output for UI consumption. */
export interface BusinessAdvisorResult {
  headline: string;
  summary: string;
  metrics: BusinessMetricsResult;
  insights: BusinessInsightsResult;
  recommendations: BusinessRecommendationsResult;
  /** EPIC-540 overall health + executive KPIs (optional for older callers). */
  health?: BusinessHealthResult;
  /** EPIC-550 immutable KPI snapshot (optional for older callers). */
  kpi?: BusinessKpiSnapshot;
  /** EPIC-550 event intelligence summary (optional for older callers). */
  events?: EventIntelligenceResult;
  source: 'mock';
  generatedAt: string;
}
