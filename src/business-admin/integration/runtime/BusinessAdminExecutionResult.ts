/**
 * İSTEBUL Business Admin — BusinessAdminExecutionResult (PR-202F).
 *
 * Shared execution contracts from core (PR-901A).
 * Public type names unchanged.
 */

import type { BusinessAdminResult } from '../../runtime/BusinessAdminResult';
import type { DashboardWorkspaceResult } from '../../dashboard/runtime/DashboardWorkspaceResult';
import type { ReportsWorkspaceResult } from '../../reports/runtime/ReportsWorkspaceResult';
import type { ExportWorkspaceResult } from '../../exports/runtime/ExportWorkspaceResult';
import type { BusinessSettingsWorkspaceResult } from '../../settings/runtime/BusinessSettingsWorkspaceResult';
import type {
  ExecutionResultBase,
  ExecutionTelemetryCore,
  PipelineExecutionSummaryBase,
  StageExecutionBase
} from '../../../core/execution/index';
import type { BusinessAdminPipelineBag } from './BusinessAdminExecutionContext';
import type {
  BusinessAdminPipelineStage,
  BusinessAdminStageOutcome
} from './stages';

/**
 * Tek aşama yürütme kaydı.
 */
export type BusinessAdminStageExecution = StageExecutionBase<
  BusinessAdminPipelineStage,
  BusinessAdminStageOutcome
>;

/**
 * Pipeline özet telemetrisi.
 */
export type BusinessAdminPipelineExecutionSummary =
  PipelineExecutionSummaryBase;

/**
 * Uçtan uca yürütme telemetrisi.
 */
export type BusinessAdminExecutionTelemetry = ExecutionTelemetryCore<
  BusinessAdminPipelineStage,
  BusinessAdminStageOutcome
> & {
  summary: BusinessAdminPipelineExecutionSummary;
};

/**
 * Uçtan uca Business Admin yürütme sonucu.
 */
export interface BusinessAdminExecutionResult
  extends ExecutionResultBase<
    Readonly<BusinessAdminPipelineBag>,
    BusinessAdminStageExecution,
    BusinessAdminExecutionTelemetry
  > {
  /** Foundation BusinessAdminResult — her durumda geçerli */
  businessAdminResult: BusinessAdminResult;
  /** Dashboard workspace sonucu */
  dashboardResult?: DashboardWorkspaceResult;
  /** Reports workspace sonucu */
  reportsResult?: ReportsWorkspaceResult;
  /** Export workspace sonucu */
  exportResult?: ExportWorkspaceResult;
  /** Business Settings workspace sonucu */
  settingsResult?: BusinessSettingsWorkspaceResult;
}
