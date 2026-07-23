import { getDefaultBusinessDataProvider } from '../../providers/ProviderFactory';
import { createAnalyticsEngine } from '../core/AnalyticsEngine';
import { createBusinessHealthEngine } from '../health/BusinessHealthEngine';
import { createScoringEngine } from '../scoring/ScoringEngine';
import { createKPIEngine } from '../kpi/KPIEngine';
import { createEventProcessor } from '../events/EventProcessor';
import { InsightEngine } from '../../services/InsightEngine';
import { MetricsEngine } from '../../services/MetricsEngine';
import { RecommendationEngine } from '../../services/RecommendationEngine';
import type { BusinessAdvisorResult } from '../types/advisor-result';
import type { BusinessDataProvider } from '../../types/business-provider';
import type { BusinessHealthResult } from '../models/business-health';
import type { BusinessKpiSnapshot } from '../models/business-kpi';
import type { EventIntelligenceResult } from '../models/business-events';

export interface BusinessIntelligenceEngineOptions {
  /** Optional provider; defaults to mock via ProviderFactory. */
  dataProvider?: BusinessDataProvider;
}

/** Advisor result with health + KPI/event payloads (UI markup unchanged). */
export interface BusinessAdvisorResultWithHealth extends BusinessAdvisorResult {
  health: BusinessHealthResult;
  kpi: BusinessKpiSnapshot;
  events: EventIntelligenceResult;
}

/**
 * Business Intelligence Engine — orchestrates:
 * Provider → Analytics → Scoring → Health → KPI → Event Intelligence →
 * Metrics → Insight → Recommendation.
 */
export function runBusinessIntelligenceEngine(
  options: BusinessIntelligenceEngineOptions = {}
): BusinessAdvisorResultWithHealth {
  const provider = options.dataProvider ?? getDefaultBusinessDataProvider();
  const analyticsEngine = createAnalyticsEngine({ provider });
  const scoringEngine = createScoringEngine();
  const healthEngine = createBusinessHealthEngine({ scoringEngine });
  const kpiEngine = createKPIEngine();
  const eventProcessor = createEventProcessor();
  const metricsEngine = new MetricsEngine({
    analyticsEngine,
    provider,
    scoringEngine,
    healthEngine,
    kpiEngine,
    eventProcessor
  });
  const insightEngine = new InsightEngine(metricsEngine);
  const recommendationEngine = new RecommendationEngine(insightEngine);

  analyticsEngine.compute();
  const metricsResult = metricsEngine.compute();
  const insightResult = insightEngine.compute();
  const recommendations = recommendationEngine.compute();

  const revenue = metricsResult.metrics.metrics.find((m) => m.id === 'revenue-trend');
  const risk = metricsResult.metrics.metrics.find((m) => m.id === 'risk-score');
  const health = metricsResult.health;

  return Object.freeze({
    headline: 'AI Business Advisor',
    summary: `Mock zekâ özeti: gelir ${revenue?.value ?? '—'}, risk skoru ${risk?.value ?? '—'}, iş sağlığı ${health.overallScore}. Gerçek API bağlantısı yok.`,
    metrics: metricsResult.metrics,
    insights: insightResult.insights,
    recommendations,
    health,
    kpi: metricsResult.kpi,
    events: metricsResult.events,
    source: 'mock',
    generatedAt: metricsResult.signals.asOf
  });
}

export default runBusinessIntelligenceEngine;
