import type { BusinessInsight, BusinessInsightsResult } from '../types/business-insight';
import type { BusinessMetricsResult } from '../types/business-metrics';
import type { RawBusinessData } from '../types/raw-business-data';

function metricValue(
  metrics: BusinessMetricsResult,
  id: string
): number {
  return metrics.metrics.find((m) => m.id === id)?.numericValue ?? 0;
}

/**
 * Insight Engine — turns metrics + raw signals into trend/positive/risk/anomaly insights.
 */
export function computeBusinessInsights(
  raw: RawBusinessData,
  metrics: BusinessMetricsResult
): BusinessInsightsResult {
  const revenue = metricValue(metrics, 'revenue-trend');
  const cost = metricValue(metrics, 'cost-trend');
  const growth = metricValue(metrics, 'growth');
  const risk = metricValue(metrics, 'risk-score');
  const health = metricValue(metrics, 'customer-health');

  const topMargin = [...raw.categoryMargins].sort(
    (a, b) => b.marginPercent - a.marginPercent
  )[0];

  const cashFirst = raw.cashFlowSeries[0]?.value ?? 0;
  const cashLast = raw.cashFlowSeries[raw.cashFlowSeries.length - 1]?.value ?? 0;
  const cashDrop = cashFirst > 0 ? ((cashFirst - cashLast) / cashFirst) * 100 : 0;

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

  if (topMargin) {
    insights.push({
      id: 'ins-positive-margin',
      kind: 'positive',
      severity: 'positive',
      title: 'Yüksek marj kategorisi',
      body: `En yüksek marj ${topMargin.category} kategorisinde (%${topMargin.marginPercent.toFixed(1)}).`,
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

  if (raw.stockDaysRemaining < 14) {
    insights.push({
      id: 'ins-anomaly-stock',
      kind: 'anomaly',
      severity: raw.stockDaysRemaining < 10 ? 'critical' : 'warning',
      title: 'Stok anormalliği',
      body: `Stok kapsamı ${raw.stockDaysRemaining} güne indi; yenileme eşiği aşıldı.`,
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

  return Object.freeze({
    insights: Object.freeze(insights.map((i) => Object.freeze({ ...i }))),
    generatedAt: metrics.generatedAt
  });
}

export default computeBusinessInsights;
