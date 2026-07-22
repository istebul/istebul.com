import type {
  BusinessMetric,
  BusinessMetricsResult,
  MetricTrendDirection
} from '../types/business-metrics';
import type { BusinessDataPoint, RawBusinessData } from '../types/raw-business-data';

function seriesChangePercent(series: readonly BusinessDataPoint[]): number {
  if (series.length < 2) return 0;
  const first = series[0]?.value ?? 0;
  const last = series[series.length - 1]?.value ?? 0;
  if (first === 0) return last === 0 ? 0 : 100;
  return ((last - first) / Math.abs(first)) * 100;
}

function directionFromDelta(delta: number, flatThreshold = 0.5): MetricTrendDirection {
  if (Math.abs(delta) < flatThreshold) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function formatPercent(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Metrics Engine — derives Revenue/Cost/Growth/Risk/Customer Health from raw data.
 */
export function computeBusinessMetrics(raw: RawBusinessData): BusinessMetricsResult {
  const revenueDelta = seriesChangePercent(raw.revenueSeries);
  const costDelta = seriesChangePercent(raw.costSeries);
  const growth =
    raw.previousCustomerCount === 0
      ? 0
      : ((raw.customerCount - raw.previousCustomerCount) / raw.previousCustomerCount) * 100;

  const cashDelta = seriesChangePercent(raw.cashFlowSeries);
  const riskScore = clamp(
    Math.round(
      35 +
        Math.max(0, costDelta) * 1.4 +
        Math.max(0, -cashDelta) * 1.8 +
        raw.churnRatePercent * 4 +
        (raw.stockDaysRemaining < 14 ? (14 - raw.stockDaysRemaining) * 2 : 0) -
        Math.max(0, revenueDelta) * 0.8
    ),
    0,
    100
  );

  const customerHealth = clamp(
    Math.round(100 - raw.churnRatePercent * 8 + Math.max(-10, Math.min(15, growth * 2))),
    0,
    100
  );

  const metrics: BusinessMetric[] = [
    {
      id: 'revenue-trend',
      label: 'Revenue Trend',
      value: formatPercent(revenueDelta),
      numericValue: Number(revenueDelta.toFixed(2)),
      unit: 'percent',
      direction: directionFromDelta(revenueDelta),
      periodLabel: 'Son 7 gün',
      description: 'Gelir serisinin dönem başı–sonu değişimi.'
    },
    {
      id: 'cost-trend',
      label: 'Cost Trend',
      value: formatPercent(costDelta),
      numericValue: Number(costDelta.toFixed(2)),
      unit: 'percent',
      direction: directionFromDelta(costDelta),
      periodLabel: 'Son 7 gün',
      description: 'Operasyonel maliyet trendi.'
    },
    {
      id: 'growth',
      label: 'Growth',
      value: formatPercent(growth),
      numericValue: Number(growth.toFixed(2)),
      unit: 'percent',
      direction: directionFromDelta(growth),
      periodLabel: 'Müşteri tabanı',
      description: 'Aktif müşteri sayısındaki büyüme.'
    },
    {
      id: 'risk-score',
      label: 'Risk Score',
      value: String(riskScore),
      numericValue: riskScore,
      unit: 'score',
      direction: riskScore >= 60 ? 'up' : riskScore <= 35 ? 'down' : 'flat',
      periodLabel: '0–100',
      description: 'Maliyet, nakit, churn ve stok sinyallerinden türetilen risk skoru.'
    },
    {
      id: 'customer-health',
      label: 'Customer Health',
      value: String(customerHealth),
      numericValue: customerHealth,
      unit: 'score',
      direction: customerHealth >= 70 ? 'up' : customerHealth <= 45 ? 'down' : 'flat',
      periodLabel: '0–100',
      description: 'Churn ve büyüme dengesi üzerinden müşteri sağlığı.'
    }
  ];

  return Object.freeze({
    metrics: Object.freeze(metrics.map((m) => Object.freeze({ ...m }))),
    generatedAt: raw.asOf
  });
}

export default computeBusinessMetrics;
