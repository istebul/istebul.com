/**
 * İSTEBUL Business Report Engine — Report Model Builder runtime sonucu (PR-104B).
 */

import type { ReportModel as FoundationReportModel } from '../../models/ReportModel';
import type { ReportMetadata as FoundationReportMetadata } from '../../models/ReportMetadata';
import type { ReportModel } from './ReportModel';
import type { ReportMetadata } from './ReportMetadata';

/**
 * Report Model uyarısı.
 */
export interface ReportModelWarning {
  code: string;
  message: string;
}

/**
 * Report Model telemetrisi.
 */
export interface ReportModelTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  mappedEntityCount: number;
  recommendationCount: number;
  actionCount: number;
  warningCount: number;
}

/**
 * Report Model Builder Runtime çıktısı.
 */
export interface ReportModelResult {
  /** Sunumdan bağımsız ReportModel */
  model: ReportModel;
  /** Foundation ReportModel projeksiyonu (boş bölümler; bag.reportModel için) */
  foundationModel: FoundationReportModel;
  /** Builder metadata (structured) */
  metadata: ReportMetadata;
  /** Foundation metadata projeksiyonu */
  foundationMetadata: FoundationReportMetadata;
  /** Uyarılar */
  warnings: readonly ReportModelWarning[];
  /** Telemetri */
  telemetry: ReportModelTelemetry;
}

/** Pipeline bag anahtarı — Report Engine */
export const PIPELINE_BAG_REPORT_MODEL_RUNTIME_RESULT_KEY =
  'reportModelRuntimeResult' as const;
