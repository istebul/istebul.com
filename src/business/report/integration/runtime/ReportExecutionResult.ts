/**
 * İSTEBUL Business Report Engine — ReportExecutionResult (PR-104F).
 */

import type { ReportModel } from '../../models/ReportModel';
import type { ReportStage } from '../../models/ReportStage';
import type { ReportModelResult } from '../../modelBuilder/runtime/ReportModelResult';
import type { NarrativeResult } from '../../narrative/runtime/NarrativeResult';
import type { ReportSectionResult } from '../../sectionBuilder/runtime/ReportSectionResult';
import type { ReportSummaryResult } from '../../summary/runtime/ReportSummaryResult';
import type { ReportPipelineContext } from '../../pipeline/runtime/ReportPipelineContext';
import type {
  ReportStageExecution,
  ReportStageExecutionOutcome
} from '../../pipeline/runtime/ReportStageExecution';

/**
 * Pipeline özet telemetrisi.
 */
export interface ReportPipelineExecutionSummary {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  stagesNotImplemented: number;
  success: boolean;
  warningCount: number;
  errorCount: number;
  reportModelPartCount: number;
  narrativeCount: number;
  sectionCount: number;
  summarySectionCount: number;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface ReportExecutionTelemetry {
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
  stageDurationsMs: Readonly<Partial<Record<ReportStage, number>>>;
  stageOutcomes: Readonly<
    Partial<Record<ReportStage, ReportStageExecutionOutcome>>
  >;
  summary: ReportPipelineExecutionSummary;
}

/**
 * Uçtan uca Report yürütme sonucu.
 * `reportModel` foundation ReportResult karşılığıdır.
 */
export interface ReportExecutionResult {
  /** Foundation ReportModel (ReportResult) */
  reportModel: ReportModel;
  /** Son pipeline bağlamı */
  pipelineContext: Readonly<ReportPipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly ReportStageExecution[];
  /** Telemetri */
  telemetry: ReportExecutionTelemetry;
  /** Report Model Builder sonucu */
  reportModelResult?: ReportModelResult;
  /** Narrative Composer sonucu */
  narrativeResult?: NarrativeResult;
  /** Report Section Builder sonucu */
  reportSectionResult?: ReportSectionResult;
  /** Report Summary sonucu */
  reportSummaryResult?: ReportSummaryResult;
}
