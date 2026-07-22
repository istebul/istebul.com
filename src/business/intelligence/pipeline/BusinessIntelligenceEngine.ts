import { getDefaultBusinessDataProvider } from '../../providers/ProviderFactory';
import { InsightEngine } from '../../services/InsightEngine';
import { MetricsEngine } from '../../services/MetricsEngine';
import { RecommendationEngine } from '../../services/RecommendationEngine';
import type { BusinessAdvisorResult } from '../types/advisor-result';
import type { BusinessDataProvider } from '../../types/business-provider';

export interface BusinessIntelligenceEngineOptions {
  /** Optional provider; defaults to mock via ProviderFactory. */
  dataProvider?: BusinessDataProvider;
}

/**
 * Business Intelligence Engine — orchestrates:
 * ProviderFactory/Mock → MetricsEngine → InsightEngine → RecommendationEngine.
 */
export function runBusinessIntelligenceEngine(
  options: BusinessIntelligenceEngineOptions = {}
): BusinessAdvisorResult {
  const provider = options.dataProvider ?? getDefaultBusinessDataProvider();
  const metricsEngine = new MetricsEngine(provider);
  const insightEngine = new InsightEngine(metricsEngine);
  const recommendationEngine = new RecommendationEngine(insightEngine);

  const metricsResult = metricsEngine.compute();
  const insightResult = insightEngine.compute();
  const recommendations = recommendationEngine.compute();

  const revenue = metricsResult.metrics.metrics.find((m) => m.id === 'revenue-trend');
  const risk = metricsResult.metrics.metrics.find((m) => m.id === 'risk-score');

  return Object.freeze({
    headline: 'AI Business Advisor',
    summary: `Mock zekâ özeti: gelir ${revenue?.value ?? '—'}, risk skoru ${risk?.value ?? '—'}. Gerçek API bağlantısı yok.`,
    metrics: metricsResult.metrics,
    insights: insightResult.insights,
    recommendations,
    source: 'mock',
    generatedAt: metricsResult.signals.asOf
  });
}

export default runBusinessIntelligenceEngine;
