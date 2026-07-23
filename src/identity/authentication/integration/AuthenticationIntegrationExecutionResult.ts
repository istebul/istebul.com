/**
 * İSTEBUL Identity — AuthenticationIntegrationResult + ExecutionResult (EPIC-301E).
 *
 * Shared execution contracts from core (PR-901A).
 * Public type names unchanged.
 */

import type { AuthenticationProviderResult } from '../adapters/AuthenticationProviderResult';
import type { AuthenticationSessionBridgeResult } from '../bridge/AuthenticationSessionBridgeResult';
import type { IdentityBridgeResult } from '../../bridge/IdentityBridgeResult';
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
import type { AuthenticationIntegrationPipelineBag } from './AuthenticationIntegrationExecutionContext';
import type {
  AuthenticationIntegrationPipelineStage,
  AuthenticationIntegrationStageOutcome
} from './stages';

/**
 * Integration özet öğesi.
 */
export type AuthenticationIntegrationSummaryItem = ExecutionSummaryItem;

/**
 * Integration doğrulama bulgusu.
 */
export type AuthenticationIntegrationValidationIssue = ValidationIssueBase;

/**
 * Integration aggregate summary.
 */
export interface AuthenticationIntegrationSummary {
  success: boolean;
  adapterSucceeded: boolean;
  providerSucceeded: boolean;
  sessionBridgeSucceeded: boolean;
  identityBridgeSucceeded: boolean;
  stagesSucceeded: number;
  stagesSkipped: number;
  stagesFailed: number;
}

/**
 * Integration aggregate telemetrisi (result içi).
 */
export type AuthenticationIntegrationResultTelemetry = ResultTelemetryBase;

/**
 * AuthenticationIntegrationResult — her durumda geçerli aggregate sonuç.
 */
export interface AuthenticationIntegrationResult {
  summary: AuthenticationIntegrationSummary;
  summaryItems: readonly AuthenticationIntegrationSummaryItem[];
  validationIssues: readonly AuthenticationIntegrationValidationIssue[];
  telemetry: AuthenticationIntegrationResultTelemetry;
  providerResult?: AuthenticationProviderResult;
  sessionBridgeResult?: AuthenticationSessionBridgeResult;
  identityBridgeResult?: IdentityBridgeResult;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_AUTHENTICATION_INTEGRATION_RESULT_KEY =
  'authenticationIntegrationResult' as const;

/**
 * Tek aşama yürütme kaydı.
 */
export type AuthenticationIntegrationStageExecution = StageExecutionBase<
  AuthenticationIntegrationPipelineStage,
  AuthenticationIntegrationStageOutcome
>;

/**
 * Pipeline özet telemetrisi.
 */
export type AuthenticationIntegrationPipelineExecutionSummary =
  PipelineExecutionSummaryBase;

/**
 * Uçtan uca yürütme telemetrisi.
 */
export type AuthenticationIntegrationExecutionTelemetry =
  ExecutionTelemetryCore<
    AuthenticationIntegrationPipelineStage,
    AuthenticationIntegrationStageOutcome
  > &
    StageCountTelemetry;

/**
 * AuthenticationIntegrationExecutionResult — tam yürütme kaydı.
 */
export interface AuthenticationIntegrationExecutionResult
  extends ExecutionResultBase<
    AuthenticationIntegrationPipelineBag,
    AuthenticationIntegrationStageExecution,
    AuthenticationIntegrationExecutionTelemetry
  > {
  authenticationIntegrationResult: AuthenticationIntegrationResult;
  pipelineSummary: AuthenticationIntegrationPipelineExecutionSummary;
}
