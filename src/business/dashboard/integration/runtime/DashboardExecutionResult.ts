/**
 * İSTEBUL Business Dashboard Engine — DashboardExecutionResult (PR-105F).
 */

import type { DashboardModel } from '../../models/DashboardModel';
import type { DashboardStage } from '../../models/DashboardStage';
import type { DashboardModelResult } from '../../modelBuilder/runtime/DashboardModelResult';
import type { WidgetResult } from '../../widgetBuilder/runtime/WidgetResult';
import type { KpiBoardResult } from '../../kpiBoard/runtime/KpiBoardResult';
import type { DashboardSummaryResult } from '../../summary/runtime/DashboardSummaryResult';
import type { DashboardPipelineContext } from '../../pipeline/runtime/DashboardPipelineContext';
import type {
  DashboardStageExecution,
  DashboardStageExecutionOutcome
} from '../../pipeline/runtime/DashboardStageExecution';

/**
 * Pipeline özet telemetrisi.
 */
export interface DashboardPipelineExecutionSummary {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  stagesNotImplemented: number;
  success: boolean;
  warningCount: number;
  errorCount: number;
  dashboardModelPartCount: number;
  widgetCount: number;
  kpiCount: number;
  summarySectionCount: number;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface DashboardExecutionTelemetry {
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
  stageDurationsMs: Readonly<Partial<Record<DashboardStage, number>>>;
  stageOutcomes: Readonly<
    Partial<Record<DashboardStage, DashboardStageExecutionOutcome>>
  >;
  summary: DashboardPipelineExecutionSummary;
}

/**
 * Uçtan uca Dashboard yürütme sonucu.
 * `dashboardModel` foundation DashboardResult karşılığıdır.
 */
export interface DashboardExecutionResult {
  /** Foundation DashboardModel (DashboardResult) */
  dashboardModel: DashboardModel;
  /** Son pipeline bağlamı */
  pipelineContext: Readonly<DashboardPipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly DashboardStageExecution[];
  /** Telemetri */
  telemetry: DashboardExecutionTelemetry;
  /** Dashboard Model Builder sonucu */
  dashboardModelResult?: DashboardModelResult;
  /** Widget Builder sonucu */
  widgetResult?: WidgetResult;
  /** KPI Board sonucu */
  kpiBoardResult?: KpiBoardResult;
  /** Dashboard Summary sonucu */
  dashboardSummaryResult?: DashboardSummaryResult;
}
