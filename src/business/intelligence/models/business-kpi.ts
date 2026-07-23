import type { BusinessAnalyticsSnapshot } from './analytics';
import type { BusinessHealthResult } from './business-health';
import type { MetricTrendDirection } from '../types/business-metrics';

/** Built-in KPI identifiers (aligned with Advisor metric chips + health). */
export type BusinessKpiId =
  | 'revenue-trend'
  | 'cost-trend'
  | 'growth'
  | 'risk-score'
  | 'customer-health'
  | 'business-health'
  | 'cash-flow'
  | 'inventory';

export type KpiUnit = 'percent' | 'score' | 'days';

/** Plug-in KPI definition for KPIRegistry. */
export interface BusinessKpiDefinition {
  readonly id: BusinessKpiId;
  readonly label: string;
  readonly unit: KpiUnit;
  readonly periodLabel: string;
  readonly description: string;
}

/** Single KPI value inside an immutable snapshot. */
export interface BusinessKpiValue {
  id: BusinessKpiId;
  label: string;
  /** Numeric value used by engines (percent delta, score, days). */
  numericValue: number;
  /** Display string preserved for MetricsEngine / Advisor chips. */
  displayValue: string;
  unit: KpiUnit;
  direction: MetricTrendDirection;
  periodLabel: string;
  description: string;
}

/** Trend metadata for a KPI. */
export interface BusinessKpiTrend {
  id: BusinessKpiId;
  direction: MetricTrendDirection;
  delta: number;
  changeDetected: boolean;
  label: string;
}

/**
 * Signal payload mirrored from analytics so MetricsEngine can keep
 * Insight / Recommendation contracts numerically identical.
 */
export interface BusinessKpiSignals {
  revenueDelta: number;
  costDelta: number;
  growth: number;
  riskScore: number;
  customerHealth: number;
  topMarginCategory: string | null;
  topMarginPercent: number | null;
  cashDropPercent: number;
  stockDaysRemaining: number;
  asOf: string;
}

/** Immutable KPI snapshot produced by KPIEngine. */
export interface BusinessKpiSnapshot {
  asOf: string;
  kpis: readonly BusinessKpiValue[];
  trends: readonly BusinessKpiTrend[];
  healthScore: number;
  signals: BusinessKpiSignals;
  /** Upstream health result used to build this snapshot. */
  health: BusinessHealthResult;
  analytics: BusinessAnalyticsSnapshot;
}

/** Input for KPI plug-in compute. */
export interface KpiComputeInput {
  health: BusinessHealthResult;
  analytics: BusinessAnalyticsSnapshot;
}

/** Future-facing KPI plug-in contract. */
export interface BusinessKpiPlugin {
  readonly id: BusinessKpiId;
  readonly definition: BusinessKpiDefinition;
  compute(input: KpiComputeInput): BusinessKpiValue;
}
