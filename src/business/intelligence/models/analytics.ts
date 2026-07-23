import type { RawBusinessData } from '../types/raw-business-data';

/** Registered analytics module identifiers (EPIC-530). */
export type BusinessAnalyticsModuleId =
  | 'revenue'
  | 'growth'
  | 'customer'
  | 'inventory'
  | 'cash-flow'
  | 'risk'
  | 'opportunity';

/** Single-responsibility analytics module contract. */
export interface BusinessAnalyticsModule {
  readonly id: BusinessAnalyticsModuleId;
  readonly label: string;
  analyze(raw: RawBusinessData): BusinessAnalyticsModuleResult;
}

export interface BusinessAnalyticsModuleResult {
  moduleId: BusinessAnalyticsModuleId;
  /** Domain-specific numeric payload (frozen by AnalyticsEngine). */
  values: Readonly<Record<string, number | string | null>>;
}

/**
 * Aggregated analytics snapshot consumed by MetricsEngine.
 * Field names align with existing BusinessMetricSignals for zero UI drift.
 */
export interface BusinessAnalyticsSnapshot {
  asOf: string;
  revenueDelta: number;
  costDelta: number;
  growth: number;
  customerHealth: number;
  churnRatePercent: number;
  stockDaysRemaining: number;
  cashDropPercent: number;
  cashDelta: number;
  riskScore: number;
  topMarginCategory: string | null;
  topMarginPercent: number | null;
  moduleResults: readonly BusinessAnalyticsModuleResult[];
}
