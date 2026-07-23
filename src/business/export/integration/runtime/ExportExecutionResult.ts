/**
 * İSTEBUL Business Export Engine — ExportExecutionResult (PR-106F).
 */

import type { ExportModelResult } from '../../modelBuilder/runtime/ExportModelResult';
import type { FormatResult } from '../../format/runtime/FormatResult';
import type { ExportResult } from '../../models/ExportResult';
import type { ExportStage } from '../../models/ExportStatus';
import type { ExportPipelineContext } from '../../pipeline/runtime/ExportPipelineContext';
import type {
  ExportStageExecution,
  ExportStageExecutionOutcome
} from '../../pipeline/runtime/ExportStageExecution';
import type { RendererResult } from '../../renderer/runtime/RendererResult';
import type { ExportSummaryResult } from '../../summary/runtime/ExportSummaryResult';

/**
 * Pipeline özet telemetrisi.
 */
export interface ExportPipelineExecutionSummary {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  stagesNotImplemented: number;
  success: boolean;
  warningCount: number;
  errorCount: number;
  exportModelPartCount: number;
  renderPartCount: number;
  formatRepresentationCount: number;
  summarySectionCount: number;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface ExportExecutionTelemetry {
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
  stageDurationsMs: Readonly<Partial<Record<ExportStage, number>>>;
  stageOutcomes: Readonly<
    Partial<Record<ExportStage, ExportStageExecutionOutcome>>
  >;
  summary: ExportPipelineExecutionSummary;
}

/**
 * Uçtan uca Export yürütme sonucu.
 */
export interface ExportExecutionResult {
  /** Foundation ExportResult */
  exportResult: ExportResult;
  /** Son pipeline bağlamı */
  pipelineContext: Readonly<ExportPipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly ExportStageExecution[];
  /** Telemetri */
  telemetry: ExportExecutionTelemetry;
  /** Export Model Builder sonucu */
  exportModelResult?: ExportModelResult;
  /** Renderer sonucu */
  rendererResult?: RendererResult;
  /** Format Runtime sonucu */
  formatResult?: FormatResult;
  /** Export Summary sonucu */
  exportSummaryResult?: ExportSummaryResult;
}
