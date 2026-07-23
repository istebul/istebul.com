import type { BusinessInsight, BusinessInsightsResult } from '../intelligence/types/business-insight';
import type { BusinessMetricsResult } from '../intelligence/types/business-metrics';
import type { RawBusinessData } from '../intelligence/types/raw-business-data';
import {
  MetricsEngine,
  type BusinessMetricSignals,
  type MetricsEngineResult
} from './MetricsEngine';

export interface InsightEngineResult {
  insights: BusinessInsightsResult;
  /** Pass-through from MetricsEngine for RecommendationEngine (no provider access). */
  signals: BusinessMetricSignals;
  metrics: BusinessMetricsResult;
}

function buildInsightsFromMetricsResult(
  metricsResult: MetricsEngineResult
): InsightEngineResult {
  const { metrics, signals } = metricsResult;
  const revenue = signals.revenueDelta;
  const cost = signals.costDelta;
  const growth = signals.growth;
  const risk = signals.riskScore;
  const health = signals.customerHealth;
  const cashDrop = signals.cashDropPercent;

  const insights: BusinessInsight[] = [];

  insights.push({
    id: 'ins-trend-revenue',
    kind: 'trend',
    severity: revenue >= 0 ? 'positive' : 'warning',
    title: 'Gelir trendi',
    body:
      revenue >= 0
        ? `Satışlar son 7 günde %${Math.abs(revenue).toFixed(0)} arttı; talep tarafı güçleniyor.`
        : `Satışlar son 7 günde %${Math.abs(revenue).toFixed(0)} geriledi; talep baskısı izlenmeli.`,
    relatedMetricIds: Object.freeze(['revenue-trend'])
  });

  insights.push({
    id: 'ins-trend-cost',
    kind: 'trend',
    severity: cost > revenue ? 'warning' : 'info',
    title: 'Maliyet trendi',
    body: `Maliyetler son 7 günde %${Math.abs(cost).toFixed(1)} değişti; gelir-maliyet makası yakından izlenmeli.`,
    relatedMetricIds: Object.freeze(['cost-trend', 'revenue-trend'])
  });

  if (growth > 0 || health >= 65) {
    insights.push({
      id: 'ins-positive-growth',
      kind: 'positive',
      severity: 'positive',
      title: 'Pozitif gelişme',
      body: `Müşteri tabanı %${Math.abs(growth).toFixed(1)} büyüdü; Customer Health skoru ${health}.`,
      relatedMetricIds: Object.freeze(['growth', 'customer-health'])
    });
  }

  if (signals.topMarginCategory && signals.topMarginPercent !== null) {
    insights.push({
      id: 'ins-positive-margin',
      kind: 'positive',
      severity: 'positive',
      title: 'Yüksek marj kategorisi',
      body: `En yüksek marj ${signals.topMarginCategory} kategorisinde (%${signals.topMarginPercent.toFixed(1)}).`,
      relatedMetricIds: Object.freeze(['revenue-trend'])
    });
  }

  if (risk >= 50 || cashDrop > 10) {
    insights.push({
      id: 'ins-risk-cash',
      kind: 'risk',
      severity: risk >= 65 ? 'critical' : 'warning',
      title: 'Nakit ve risk baskısı',
      body: `Nakit akışı düşüyor (≈%${cashDrop.toFixed(0)}); Risk Score ${risk}.`,
      relatedMetricIds: Object.freeze(['risk-score'])
    });
  }

  if (signals.stockDaysRemaining < 14) {
    insights.push({
      id: 'ins-anomaly-stock',
      kind: 'anomaly',
      severity: signals.stockDaysRemaining < 10 ? 'critical' : 'warning',
      title: 'Stok anormalliği',
      body: `Stok kapsamı ${signals.stockDaysRemaining} güne indi; yenileme eşiği aşıldı.`,
      relatedMetricIds: Object.freeze(['risk-score'])
    });
  }

  if (cost > 8 && revenue > 5 && cost > revenue * 0.85) {
    insights.push({
      id: 'ins-anomaly-cost-vs-revenue',
      kind: 'anomaly',
      severity: 'warning',
      title: 'Maliyet-gelir sapması',
      body: 'Maliyet artışı gelir artışına yakın seyrediyor; marj baskısı oluşabilir.',
      relatedMetricIds: Object.freeze(['cost-trend', 'revenue-trend'])
    });
  }

  const insightsResult: BusinessInsightsResult = Object.freeze({
    insights: Object.freeze(insights.map((i) => Object.freeze({ ...i }))),
    generatedAt: metrics.generatedAt
  });

  return Object.freeze({
    insights: insightsResult,
    signals,
    metrics
  });
}

/**
 * Insight Engine — consumes MetricsEngine only (no direct provider / raw access).
 */
export class InsightEngine {
  private readonly metricsEngine: MetricsEngine;
  private lastResult: InsightEngineResult | null = null;

  constructor(metricsEngine: MetricsEngine) {
    this.metricsEngine = metricsEngine;
  }

  compute(): InsightEngineResult {
    const metricsResult =
      this.metricsEngine.getLastResult() ?? this.metricsEngine.compute();
    this.lastResult = buildInsightsFromMetricsResult(metricsResult);
    return this.lastResult;
  }

  getLastResult(): InsightEngineResult | null {
    return this.lastResult;
  }
}

/** Backward-compatible helper (EPIC-510 signature). */
export function computeBusinessInsights(
  raw: RawBusinessData,
  _metrics: BusinessMetricsResult
): BusinessInsightsResult {
  const engine = new MetricsEngine({
    kind: 'mock',
    getSnapshot: () => raw
  });
  return buildInsightsFromMetricsResult(engine.compute()).insights;
}

export default InsightEngine;
