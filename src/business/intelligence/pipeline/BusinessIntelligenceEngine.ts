import { computeBusinessInsights } from '../insights/InsightEngine';
import { computeBusinessMetrics } from '../metrics/MetricsEngine';
import { createMockBusinessDataProvider } from '../providers/MockDataProvider';
import { computeBusinessRecommendations } from '../recommendations/RecommendationEngine';
import type { BusinessAdvisorResult } from '../types/advisor-result';
import type { IBusinessDataProvider } from '../types/raw-business-data';

export interface BusinessIntelligenceEngineOptions {
  dataProvider?: IBusinessDataProvider;
}

/**
 * Business Intelligence Engine — orchestrates:
 * Data Provider → Metrics → Insights → Recommendations.
 */
export function runBusinessIntelligenceEngine(
  options: BusinessIntelligenceEngineOptions = {}
): BusinessAdvisorResult {
  const provider = options.dataProvider ?? createMockBusinessDataProvider();
  const raw = provider.getSnapshot();
  const metrics = computeBusinessMetrics(raw);
  const insights = computeBusinessInsights(raw, metrics);
  const recommendations = computeBusinessRecommendations(raw, metrics, insights);

  const revenue = metrics.metrics.find((m) => m.id === 'revenue-trend');
  const risk = metrics.metrics.find((m) => m.id === 'risk-score');

  return Object.freeze({
    headline: 'AI Business Advisor',
    summary: `Mock zekâ özeti: gelir ${revenue?.value ?? '—'}, risk skoru ${risk?.value ?? '—'}. Gerçek API bağlantısı yok.`,
    metrics,
    insights,
    recommendations,
    source: 'mock',
    generatedAt: raw.asOf
  });
}

export default runBusinessIntelligenceEngine;
