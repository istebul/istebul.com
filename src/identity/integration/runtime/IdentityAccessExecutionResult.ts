/**
 * İSTEBUL Identity — IdentityAccessResult + ExecutionResult (PR-203F).
 */

import type { IdentityResult } from '../../runtime/IdentityResult';
import type { AuthenticationResult } from '../../authentication/runtime/AuthenticationResult';
import type { SessionResult } from '../../session/runtime/SessionResult';
import type { AuthorizationResult } from '../../authorization/runtime/AuthorizationResult';
import type { TenantIsolationResult } from '../../tenant-isolation/runtime/TenantIsolationResult';
import type { IdentityAccessPipelineBag } from './IdentityAccessExecutionContext';
import type {
  IdentityAccessPipelineStage,
  IdentityAccessStageOutcome
} from './stages';

/**
 * Identity Access özet öğesi.
 */
export interface IdentityAccessSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Identity Access doğrulama bulgusu.
 */
export interface IdentityAccessValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

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
export interface IdentityAccessResultTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  summaryItemCount: number;
}

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
export interface IdentityAccessStageExecution {
  stageId: IdentityAccessPipelineStage;
  stageName: string;
  outcome: IdentityAccessStageOutcome;
  detail: string;
  durationMs: number;
  startedAt: string;
  endedAt: string;
}

/**
 * Pipeline özet telemetrisi.
 */
export interface IdentityAccessPipelineExecutionSummary {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  success: boolean;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface IdentityAccessExecutionTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<
    Partial<Record<IdentityAccessPipelineStage, number>>
  >;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<
    Partial<Record<IdentityAccessPipelineStage, IdentityAccessStageOutcome>>
  >;
  /** Succeeded stage count */
  succeededStageCount: number;
  /** Skipped stage count */
  skippedStageCount: number;
  /** Summary item count */
  summaryCount: number;
  summary: IdentityAccessPipelineExecutionSummary;
}

/**
 * Uçtan uca Identity & Access yürütme sonucu.
 */
export interface IdentityAccessExecutionResult {
  /** Aggregate IdentityAccessResult — her durumda geçerli */
  identityAccessResult: IdentityAccessResult;
  /** Aşama kayıtları */
  stageExecutions: readonly IdentityAccessStageExecution[];
  /** Telemetri */
  telemetry: IdentityAccessExecutionTelemetry;
  /** Pipeline bag (mevcut anahtarlar) */
  bag: Readonly<IdentityAccessPipelineBag>;
  /** Nested runtime sonuçları */
  identityResult?: IdentityResult;
  authenticationResult?: AuthenticationResult;
  sessionResult?: SessionResult;
  authorizationResult?: AuthorizationResult;
  tenantIsolationResult?: TenantIsolationResult;
}
