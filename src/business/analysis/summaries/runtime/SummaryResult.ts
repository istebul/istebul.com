/**
 * İSTEBUL Business Analysis Engine — Summary Builder runtime sonucu (PR-102E).
 */

import type { AnalysisSummary } from '../../models/AnalysisSummary';
import type { SummaryRecord } from './SummaryRecord';
import type { SummarySection } from './SummarySection';

/**
 * Summary uyarısı.
 */
export interface SummaryWarning {
  code: string;
  message: string;
}

/**
 * Summary telemetrisi.
 */
export interface SummaryTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  summarySectionCount: number;
  findingTotals: number;
  ruleTotals: number;
  kpiTotals: number;
  warningCount: number;
}

/**
 * Summary Builder Runtime çıktısı.
 */
export interface SummaryResult {
  /** Zengin kayıt */
  record: SummaryRecord;
  /** Foundation AnalysisSummary */
  analysisSummary: AnalysisSummary;
  /** Bölümler */
  sections: readonly SummarySection[];
  /** Metadata */
  metadata: SummaryRecord['metadata'];
  /** Uyarılar */
  warnings: readonly SummaryWarning[];
  /** Telemetri */
  telemetry: SummaryTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_SUMMARY_RUNTIME_RESULT_KEY =
  'summaryRuntimeResult' as const;
