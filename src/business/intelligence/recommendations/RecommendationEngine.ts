import type { BusinessInsightsResult } from '../types/business-insight';
import type { BusinessMetricsResult } from '../types/business-metrics';
import type {
  BusinessRecommendation,
  BusinessRecommendationsResult
} from '../types/business-recommendation';
import type { RawBusinessData } from '../types/raw-business-data';

function metricValue(metrics: BusinessMetricsResult, id: string): number {
  return metrics.metrics.find((m) => m.id === id)?.numericValue ?? 0;
}

/**
 * Recommendation Engine — produces AI-style actionable suggestions from insights/metrics.
 */
export function computeBusinessRecommendations(
  raw: RawBusinessData,
  metrics: BusinessMetricsResult,
  insights: BusinessInsightsResult
): BusinessRecommendationsResult {
  const revenue = metricValue(metrics, 'revenue-trend');
  const topMargin = [...raw.categoryMargins].sort(
    (a, b) => b.marginPercent - a.marginPercent
  )[0];

  const recommendations: BusinessRecommendation[] = [];

  recommendations.push({
    id: 'rec-sales-up',
    title: 'Satış momentumu',
    message: `Satışlar son 7 günde %${Math.abs(revenue).toFixed(0)} arttı.`,
    priority: revenue >= 10 ? 'high' : 'medium',
    relatedInsightIds: Object.freeze(
      insights.insights.filter((i) => i.id === 'ins-trend-revenue').map((i) => i.id)
    )
  });

  if (topMargin) {
    recommendations.push({
      id: 'rec-margin-category',
      title: 'Marj odağı',
      message: `En yüksek marj ${topMargin.category.toLocaleLowerCase('tr-TR')} kategorisinde.`,
      priority: 'medium',
      relatedInsightIds: Object.freeze(
        insights.insights.filter((i) => i.id === 'ins-positive-margin').map((i) => i.id)
      )
    });
  }

  recommendations.push({
    id: 'rec-cash-flow',
    title: 'Nakit akışı',
    message: 'Nakit akışı düşüyor.',
    priority: 'high',
    relatedInsightIds: Object.freeze(
      insights.insights.filter((i) => i.id === 'ins-risk-cash').map((i) => i.id)
    )
  });

  recommendations.push({
    id: 'rec-stock',
    title: 'Stok yenileme',
    message: 'Stok yenilenmeli.',
    priority: raw.stockDaysRemaining < 10 ? 'high' : 'medium',
    relatedInsightIds: Object.freeze(
      insights.insights.filter((i) => i.id === 'ins-anomaly-stock').map((i) => i.id)
    )
  });

  if (metricValue(metrics, 'cost-trend') > 8) {
    recommendations.push({
      id: 'rec-cost-review',
      title: 'Maliyet gözden geçirme',
      message: 'Maliyet artışı marjı baskılıyor; tedarik ve operasyon kalemlerini gözden geçirin.',
      priority: 'medium',
      relatedInsightIds: Object.freeze(
        insights.insights.filter((i) => i.kind === 'trend' || i.kind === 'anomaly').map((i) => i.id)
      )
    });
  }

  return Object.freeze({
    recommendations: Object.freeze(recommendations.map((r) => Object.freeze({ ...r }))),
    generatedAt: metrics.generatedAt
  });
}

export default computeBusinessRecommendations;
