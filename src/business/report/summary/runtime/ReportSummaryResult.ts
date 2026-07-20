/**
 * İSTEBUL Business Report Engine — Report Summary runtime sonucu (PR-104E).
 */

import type { ReportSummary } from './ReportSummary';
import type { ReportSummaryRecord } from './ReportSummaryRecord';
import type { ReportSummarySection } from './ReportSummarySection';

/**
 * Report Summary uyarısı.
 */
export interface ReportSummaryWarning {
  code: string;
  message: string;
}

/**
 * Report Summary telemetrisi.
 */
export interface ReportSummaryTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  sectionCount: number;
  narrativeCount: number;
  recommendationTotals: number;
  actionTotals: number;
  warningCount: number;
}

/**
 * Report Summary Runtime çıktısı.
 */
export interface ReportSummaryResult {
  /** Zengin kayıt */
  record: ReportSummaryRecord;
  /** Nesnel Report Summary */
  reportSummary: ReportSummary;
  /** Bölümler */
  sections: readonly ReportSummarySection[];
  /** Metadata */
  metadata: ReportSummaryRecord['metadata'];
  /** Uyarılar */
  warnings: readonly ReportSummaryWarning[];
  /** Telemetri */
  telemetry: ReportSummaryTelemetry;
}

/** Pipeline bag anahtarı — Report Engine */
export const PIPELINE_BAG_REPORT_SUMMARY_RUNTIME_RESULT_KEY =
  'reportSummaryRuntimeResult' as const;
