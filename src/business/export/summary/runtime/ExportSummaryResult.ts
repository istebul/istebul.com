/**
 * İSTEBUL Business Export Engine — Export Summary runtime sonucu (PR-106E).
 */

import type { ExportSummary as FoundationExportSummary } from '../../models/ExportSummary';
import type { ExportSummary } from './ExportSummary';
import type {
  ExportSummaryMetadata,
  ExportSummaryRecord
} from './ExportSummaryRecord';
import type { ExportSummarySection } from './ExportSummarySection';

/**
 * Export Summary uyarısı.
 */
export interface ExportSummaryWarning {
  code: string;
  message: string;
}

/**
 * Export Summary telemetrisi.
 */
export interface ExportSummaryTelemetry {
  /** Execution duration (ms) */
  durationMs: number;
  startedAt: string;
  endedAt: string;
  /** Summary item count (tüm bölüm satırları) */
  summaryItemCount: number;
  /** Summary section count */
  summarySectionCount: number;
  warningCount: number;
}

/**
 * Export Summary Runtime çıktısı.
 */
export interface ExportSummaryResult {
  /** Zengin kayıt */
  record: ExportSummaryRecord;
  /** Nesnel Export Summary (runtime) */
  summary: ExportSummary;
  /** Foundation bag.summary uyumlu projeksiyon */
  foundationSummary: FoundationExportSummary;
  /** Bölümler */
  sections: readonly ExportSummarySection[];
  /** Metadata */
  metadata: ExportSummaryMetadata;
  /** Uyarılar */
  warnings: readonly ExportSummaryWarning[];
  /** Telemetri */
  telemetry: ExportSummaryTelemetry;
}

/** Pipeline bag anahtarı — Export Engine Summary */
export const PIPELINE_BAG_EXPORT_SUMMARY_RUNTIME_RESULT_KEY =
  'exportSummaryRuntimeResult' as const;
