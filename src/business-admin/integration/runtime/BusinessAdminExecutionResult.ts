/**
 * İSTEBUL Business Admin — BusinessAdminExecutionResult (PR-202F).
 */

import type { BusinessAdminResult } from '../../runtime/BusinessAdminResult';
import type { DashboardWorkspaceResult } from '../../dashboard/runtime/DashboardWorkspaceResult';
import type { ReportsWorkspaceResult } from '../../reports/runtime/ReportsWorkspaceResult';
import type { ExportWorkspaceResult } from '../../exports/runtime/ExportWorkspaceResult';
import type { BusinessSettingsWorkspaceResult } from '../../settings/runtime/BusinessSettingsWorkspaceResult';
import type { BusinessAdminPipelineBag } from './BusinessAdminExecutionContext';
import type {
  BusinessAdminPipelineStage,
  BusinessAdminStageOutcome
} from './stages';

/**
 * Tek aşama yürütme kaydı.
 */
export interface BusinessAdminStageExecution {
  stageId: BusinessAdminPipelineStage;
  stageName: string;
  outcome: BusinessAdminStageOutcome;
  detail: string;
  durationMs: number;
  startedAt: string;
  endedAt: string;
}

/**
 * Pipeline özet telemetrisi.
 */
export interface BusinessAdminPipelineExecutionSummary {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  success: boolean;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface BusinessAdminExecutionTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<
    Partial<Record<BusinessAdminPipelineStage, number>>
  >;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<
    Partial<Record<BusinessAdminPipelineStage, BusinessAdminStageOutcome>>
  >;
  summary: BusinessAdminPipelineExecutionSummary;
}

/**
 * Uçtan uca Business Admin yürütme sonucu.
 */
export interface BusinessAdminExecutionResult {
  /** Foundation BusinessAdminResult — her durumda geçerli */
  businessAdminResult: BusinessAdminResult;
  /** Aşama kayıtları */
  stageExecutions: readonly BusinessAdminStageExecution[];
  /** Telemetri */
  telemetry: BusinessAdminExecutionTelemetry;
  /** Pipeline bag (mevcut anahtarlar) */
  bag: Readonly<BusinessAdminPipelineBag>;
  /** Dashboard workspace sonucu */
  dashboardResult?: DashboardWorkspaceResult;
  /** Reports workspace sonucu */
  reportsResult?: ReportsWorkspaceResult;
  /** Export workspace sonucu */
  exportResult?: ExportWorkspaceResult;
  /** Business Settings workspace sonucu */
  settingsResult?: BusinessSettingsWorkspaceResult;
}
