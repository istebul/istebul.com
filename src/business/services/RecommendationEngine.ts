import type { BusinessInsightsResult } from '../intelligence/types/business-insight';
import type { BusinessMetricsResult } from '../intelligence/types/business-metrics';
import type {
  BusinessRecommendation,
  BusinessRecommendationsResult
} from '../intelligence/types/business-recommendation';
import type { RawBusinessData } from '../intelligence/types/raw-business-data';
import { InsightEngine, type InsightEngineResult } from './InsightEngine';
import { MetricsEngine } from './MetricsEngine';

function buildRecommendationsFromInsightResult(
  insightResult: InsightEngineResult
): BusinessRecommendationsResult {
  const { insights, signals, metrics } = insightResult;
  const revenue = signals.revenueDelta;

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

  if (signals.topMarginCategory) {
    recommendations.push({
      id: 'rec-margin-category',
      title: 'Marj odağı',
      message: `En yüksek marj ${signals.topMarginCategory.toLocaleLowerCase('tr-TR')} kategorisinde.`,
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
    priority: signals.stockDaysRemaining < 10 ? 'high' : 'medium',
    relatedInsightIds: Object.freeze(
      insights.insights.filter((i) => i.id === 'ins-anomaly-stock').map((i) => i.id)
    )
  });

  if (signals.costDelta > 8) {
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

/**
 * Recommendation Engine — consumes InsightEngine only
 * (no direct MetricsEngine / provider / raw access).
 */
export class RecommendationEngine {
  private readonly insightEngine: InsightEngine;

  constructor(insightEngine: InsightEngine) {
    this.insightEngine = insightEngine;
  }

  compute(): BusinessRecommendationsResult {
    const insightResult =
      this.insightEngine.getLastResult() ?? this.insightEngine.compute();
    return buildRecommendationsFromInsightResult(insightResult);
  }
}

/** Backward-compatible helper (EPIC-510 signature). */
export function computeBusinessRecommendations(
  raw: RawBusinessData,
  _metrics: BusinessMetricsResult,
  _insights: BusinessInsightsResult
): BusinessRecommendationsResult {
  const metricsEngine = new MetricsEngine({
    kind: 'mock',
    getSnapshot: () => raw
  });
  metricsEngine.compute();
  const insightEngine = new InsightEngine(metricsEngine);
  const insightResult = insightEngine.compute();
  return buildRecommendationsFromInsightResult(insightResult);
}

export default RecommendationEngine;
