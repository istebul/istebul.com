/**
 * İSTEBUL Business Export Engine — Export Model Builder runtime sonucu (PR-106B).
 */

import type { ExportMetadata as FoundationExportMetadata } from '../../models/ExportMetadata';
import type { ExportModel as SkeletonExportModel } from '../../pipeline/runtime/ExportPipelineContext';
import type { ExportMetadata } from './ExportMetadata';
import type { ExportModel } from './ExportModel';

/**
 * Export Model uyarısı.
 */
export interface ExportModelWarning {
  code: string;
  message: string;
}

/**
 * Export Model telemetrisi.
 */
export interface ExportModelTelemetry {
  /** Execution duration (ms) */
  durationMs: number;
  startedAt: string;
  endedAt: string;
  /** Projection count (mapped entities / parts) */
  projectionCount: number;
  /** Reference count (document + dashboard + report + section + widget + kpi) */
  referenceCount: number;
  warningCount: number;
}

/**
 * Export Model Builder Runtime çıktısı.
 */
export interface ExportModelResult {
  /** Formatlardan bağımsız ExportModel */
  model: ExportModel;
  /** PR-106A bag.exportModel uyumlu iskelet */
  skeletonModel: SkeletonExportModel;
  /** Builder metadata (structured) */
  metadata: ExportMetadata;
  /** Foundation metadata projeksiyonu */
  foundationMetadata: FoundationExportMetadata;
  /** Uyarılar */
  warnings: readonly ExportModelWarning[];
  /** Telemetri */
  telemetry: ExportModelTelemetry;
}

/** Pipeline bag anahtarı — Export Engine */
export const PIPELINE_BAG_EXPORT_MODEL_RUNTIME_RESULT_KEY =
  'exportModelRuntimeResult' as const;
