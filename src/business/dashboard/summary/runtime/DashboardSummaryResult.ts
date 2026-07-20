/**
 * İSTEBUL Business Dashboard Engine — Dashboard Summary runtime sonucu (PR-105E).
 */

import type { DashboardSummary } from './DashboardSummary';
import type { DashboardSummaryRecord } from './DashboardSummaryRecord';
import type { DashboardSummarySection } from './DashboardSummarySection';

/**
 * Dashboard Summary uyarısı.
 */
export interface DashboardSummaryWarning {
  code: string;
  message: string;
}

/**
 * Dashboard Summary telemetrisi.
 */
export interface DashboardSummaryTelemetry {
  /** Execution duration (ms) */
  durationMs: number;
  startedAt: string;
  endedAt: string;
  /** Widget count */
  widgetCount: number;
  /** KPI count */
  kpiCount: number;
  /** Summary section count */
  summarySectionCount: number;
  warningCount: number;
}

/**
 * Dashboard Summary Runtime çıktısı.
 */
export interface DashboardSummaryResult {
  /** Zengin kayıt */
  record: DashboardSummaryRecord;
  /** Nesnel Dashboard Summary */
  summary: DashboardSummary;
  /** Bölümler */
  sections: readonly DashboardSummarySection[];
  /** Metadata */
  metadata: DashboardSummaryRecord['metadata'];
  /** Uyarılar */
  warnings: readonly DashboardSummaryWarning[];
  /** Telemetri */
  telemetry: DashboardSummaryTelemetry;
}

/** Pipeline bag anahtarı — Dashboard Engine */
export const PIPELINE_BAG_DASHBOARD_SUMMARY_RUNTIME_RESULT_KEY =
  'dashboardSummaryRuntimeResult' as const;
