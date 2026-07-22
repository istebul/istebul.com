export type MetricTrendDirection = 'up' | 'down' | 'flat';

export type BusinessMetricId =
  | 'revenue-trend'
  | 'cost-trend'
  | 'growth'
  | 'risk-score'
  | 'customer-health';

export interface BusinessMetric {
  id: BusinessMetricId;
  label: string;
  /** Display value (formatted). */
  value: string;
  /** Numeric value for downstream engines. */
  numericValue: number;
  unit: 'percent' | 'score' | 'index';
  direction: MetricTrendDirection;
  /** Short period hint, e.g. "Son 7 gün". */
  periodLabel: string;
  description: string;
}

export interface BusinessMetricsResult {
  metrics: readonly BusinessMetric[];
  generatedAt: string;
}
