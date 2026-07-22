/**
 * İSTEBUL Platform Admin — PlatformAdminExecutionResult (PR-201F).
 *
 * Shared execution contracts from core (PR-901A).
 * Public type names unchanged.
 */

import type { PlatformAdminResult } from '../../runtime/PlatformAdminResult';
import type { TenantManagementResult } from '../../tenant/runtime/TenantManagementResult';
import type { UserManagementResult } from '../../users/runtime/UserManagementResult';
import type { SubscriptionManagementResult } from '../../subscriptions/runtime/SubscriptionManagementResult';
import type { SystemMonitoringResult } from '../../system-monitoring/runtime/SystemMonitoringResult';
import type {
  ExecutionResultBase,
  ExecutionTelemetryCore,
  PipelineExecutionSummaryBase,
  StageExecutionBase
} from '../../../core/execution/index';
import type { PlatformAdminPipelineBag } from './PlatformAdminExecutionContext';
import type {
  PlatformAdminPipelineStage,
  PlatformAdminStageOutcome
} from './stages';

/**
 * Tek aşama yürütme kaydı.
 */
export type PlatformAdminStageExecution = StageExecutionBase<
  PlatformAdminPipelineStage,
  PlatformAdminStageOutcome
>;

/**
 * Pipeline özet telemetrisi.
 */
export type PlatformAdminPipelineExecutionSummary =
  PipelineExecutionSummaryBase;

/**
 * Uçtan uca yürütme telemetrisi.
 */
export type PlatformAdminExecutionTelemetry = ExecutionTelemetryCore<
  PlatformAdminPipelineStage,
  PlatformAdminStageOutcome
> & {
  summary: PlatformAdminPipelineExecutionSummary;
};

/**
 * Uçtan uca Platform Admin yürütme sonucu.
 */
export interface PlatformAdminExecutionResult
  extends ExecutionResultBase<
    Readonly<PlatformAdminPipelineBag>,
    PlatformAdminStageExecution,
    PlatformAdminExecutionTelemetry
  > {
  /** Foundation PlatformAdminResult — her durumda geçerli */
  platformAdminResult: PlatformAdminResult;
  /** Tenant runtime sonucu */
  tenantResult?: TenantManagementResult;
  /** User runtime sonucu */
  userResult?: UserManagementResult;
  /** Subscription runtime sonucu */
  subscriptionResult?: SubscriptionManagementResult;
  /** System monitoring runtime sonucu */
  systemMonitoringResult?: SystemMonitoringResult;
}
