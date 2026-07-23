/**
 * İSTEBUL Identity — IdentityAccessResult + ExecutionResult (PR-203F).
 *
 * Shared execution contracts from core (PR-901A).
 * Public type names unchanged.
 */

import type { IdentityResult } from '../../runtime/IdentityResult';
import type { AuthenticationResult } from '../../authentication/runtime/AuthenticationResult';
import type { SessionResult } from '../../session/runtime/SessionResult';
import type { AuthorizationResult } from '../../authorization/runtime/AuthorizationResult';
import type { TenantIsolationResult } from '../../tenant-isolation/runtime/TenantIsolationResult';
import type {
  ExecutionResultBase,
  ExecutionSummaryItem,
  ExecutionTelemetryCore,
  PipelineExecutionSummaryBase,
  ResultTelemetryBase,
  StageCountTelemetry,
  StageExecutionBase,
  ValidationIssueBase
} from '../../../core/execution/index';
import type { IdentityAccessPipelineBag } from './IdentityAccessExecutionContext';
import type {
  IdentityAccessPipelineStage,
  IdentityAccessStageOutcome
} from './stages';

/**
 * Identity Access özet öğesi.
 */
export type IdentityAccessSummaryItem = ExecutionSummaryItem;

/**
 * Identity Access doğrulama bulgusu.
 */
export type IdentityAccessValidationIssue = ValidationIssueBase;

/**
 * Identity Access aggregate summary.
 */
export interface IdentityAccessSummary {
  success: boolean;
  identityCount: number;
  authenticationCount: number;
  sessionCount: number;
  authorizationCount: number;
  tenantIsolationCount: number;
  stagesSucceeded: number;
  stagesSkipped: number;
  stagesFailed: number;
}

/**
 * Identity Access aggregate telemetrisi (result içi).
 */
export type IdentityAccessResultTelemetry = ResultTelemetryBase;

/**
 * IdentityAccessResult — her durumda geçerli aggregate sonuç.
 */
export interface IdentityAccessResult {
  summary: IdentityAccessSummary;
  summaryItems: readonly IdentityAccessSummaryItem[];
  validationIssues: readonly IdentityAccessValidationIssue[];
  telemetry: IdentityAccessResultTelemetry;
  identityResult?: IdentityResult;
  authenticationResult?: AuthenticationResult;
  sessionResult?: SessionResult;
  authorizationResult?: AuthorizationResult;
  tenantIsolationResult?: TenantIsolationResult;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_IDENTITY_ACCESS_RESULT_KEY =
  'identityAccessResult' as const;

/**
 * Tek aşama yürütme kaydı.
 */
export type IdentityAccessStageExecution = StageExecutionBase<
  IdentityAccessPipelineStage,
  IdentityAccessStageOutcome
>;

/**
 * Pipeline özet telemetrisi.
 */
export type IdentityAccessPipelineExecutionSummary =
  PipelineExecutionSummaryBase;

/**
 * Uçtan uca yürütme telemetrisi.
 */
export type IdentityAccessExecutionTelemetry = ExecutionTelemetryCore<
  IdentityAccessPipelineStage,
  IdentityAccessStageOutcome
> &
  StageCountTelemetry & {
    summary: IdentityAccessPipelineExecutionSummary;
  };

/**
 * Uçtan uca Identity & Access yürütme sonucu.
 */
export interface IdentityAccessExecutionResult
  extends ExecutionResultBase<
    Readonly<IdentityAccessPipelineBag>,
    IdentityAccessStageExecution,
    IdentityAccessExecutionTelemetry
  > {
  /** Aggregate IdentityAccessResult — her durumda geçerli */
  identityAccessResult: IdentityAccessResult;
  /** Nested runtime sonuçları */
  identityResult?: IdentityResult;
  authenticationResult?: AuthenticationResult;
  sessionResult?: SessionResult;
  authorizationResult?: AuthorizationResult;
  tenantIsolationResult?: TenantIsolationResult;
}
