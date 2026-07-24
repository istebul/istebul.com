import { createMockBusinessDataProvider } from '../providers/MockDataProvider';
import type { BusinessAdvisorResult } from '../types/advisor-result';
import type { IBusinessDataProvider } from '../types/raw-business-data';
import type { BusinessDataProvider } from '../../types/business-provider';
import { MetricsEngine } from '../../services/MetricsEngine';
import { InsightEngine } from '../../services/InsightEngine';
import { RecommendationEngine } from '../../services/RecommendationEngine';

/**
 * Önceki runtime dışa aktarımlarıyla geriye uyumluluk için korunur.
 *
 * Business health artık RuntimeHealth değil, BusinessAdvisorResult
 * içerisindeki BusinessHealthResult alanıdır.
 */
export type BusinessAdvisorResultWithHealth = BusinessAdvisorResult;

export interface BusinessIntelligenceEngineOptions {
  dataProvider?: IBusinessDataProvider;
}

/**
 * Intelligence provider yüzeyini yeni servis mimarisinin beklediği
 * BusinessDataProvider sözleşmesine dönüştürür.
 */
function toBusinessDataProvider(
  provider: IBusinessDataProvider
): BusinessDataProvider {
  if (
    typeof provider === 'object' &&
    provider !== null &&
    'kind' in provider
  ) {
    return provider as BusinessDataProvider;
  }

  return {
    kind: 'mock',
    getSnapshot: () => provider.getSnapshot()
  };
}

/**
 * Business Intelligence Engine
 *
 * Provider
 * → Analytics
 * → Scoring
 * → Business Health
 * → KPI
 * → Event Intelligence
 * → Metrics
 * → Insights
 * → Recommendations
 */
export function runBusinessIntelligenceEngine(
  options: BusinessIntelligenceEngineOptions = {}
): BusinessAdvisorResultWithHealth {
  const selectedProvider =
    options.dataProvider ?? createMockBusinessDataProvider();

  const provider = toBusinessDataProvider(selectedProvider);

  const metricsEngine = new MetricsEngine(provider);
  const metricsResult = metricsEngine.compute();

  const insightEngine = new InsightEngine(metricsEngine);
  const insightResult = insightEngine.compute();

  const recommendationEngine = new RecommendationEngine(insightEngine);
  const recommendations = recommendationEngine.compute();

  const revenue = metricsResult.metrics.metrics.find(
    (metric) => metric.id === 'revenue-trend'
  );

  const risk = metricsResult.metrics.metrics.find(
    (metric) => metric.id === 'risk-score'
  );

  return Object.freeze({
    headline: 'AI Business Advisor',
    summary:
      `Mock zekâ özeti: gelir ${revenue?.value ?? '—'}, ` +
      `risk skoru ${risk?.value ?? '—'}. Gerçek API bağlantısı yok.`,
    metrics: metricsResult.metrics,
    health: metricsResult.health,
    kpi: metricsResult.kpi,
    events: metricsResult.events,
    insights: insightResult.insights,
    recommendations,
    source: 'mock',
    generatedAt: metricsResult.metrics.generatedAt
  });
}

export default runBusinessIntelligenceEngine;
