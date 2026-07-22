/**
 * İSTEBUL Identity — TenantIntegrationResult + ExecutionResult (EPIC-302E).
 *
 * Shared execution contracts from core (PR-901A).
 * Public type names unchanged.
 */

import type { TenantProviderResult } from '../adapters/TenantProviderResult';
import type { TenantSessionBridgeResult } from '../bridge/TenantSessionBridgeResult';
import type { BusinessContextBridgeResult } from '../../business-context/bridge/BusinessContextBridgeResult';
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
import type { TenantIntegrationPipelineBag } from './TenantIntegrationExecutionContext';
import type {
  TenantIntegrationPipelineStage,
  TenantIntegrationStageOutcome
} from './stages';

/**
 * Integration özet öğesi.
 */
export type TenantIntegrationSummaryItem = ExecutionSummaryItem;

/**
 * Integration doğrulama bulgusu.
 */
export type TenantIntegrationValidationIssue = ValidationIssueBase;

/**
 * Integration aggregate summary.
 */
export interface TenantIntegrationSummary {
  success: boolean;
  adapterSucceeded: boolean;
  providerSucceeded: boolean;
  sessionBridgeSucceeded: boolean;
  businessContextBridgeSucceeded: boolean;
  stagesSucceeded: number;
  stagesSkipped: number;
  stagesFailed: number;
}

/**
 * Integration aggregate telemetrisi (result içi).
 */
export type TenantIntegrationResultTelemetry = ResultTelemetryBase;

/**
 * TenantIntegrationResult — her durumda geçerli aggregate sonuç.
 */
export interface TenantIntegrationResult {
  summary: TenantIntegrationSummary;
  summaryItems: readonly TenantIntegrationSummaryItem[];
  validationIssues: readonly TenantIntegrationValidationIssue[];
  telemetry: TenantIntegrationResultTelemetry;
  providerResult?: TenantProviderResult;
  sessionBridgeResult?: TenantSessionBridgeResult;
  businessContextBridgeResult?: BusinessContextBridgeResult;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_TENANT_INTEGRATION_RESULT_KEY =
  'tenantIntegrationResult' as const;

/**
 * Tek aşama yürütme kaydı.
 */
export type TenantIntegrationStageExecution = StageExecutionBase<
  TenantIntegrationPipelineStage,
  TenantIntegrationStageOutcome
>;

/**
 * Pipeline özet telemetrisi.
 */
export type TenantIntegrationPipelineExecutionSummary =
  PipelineExecutionSummaryBase;

/**
 * Uçtan uca yürütme telemetrisi.
 */
export type TenantIntegrationExecutionTelemetry = ExecutionTelemetryCore<
  TenantIntegrationPipelineStage,
  TenantIntegrationStageOutcome
> &
  StageCountTelemetry;

/**
 * TenantIntegrationExecutionResult — tam yürütme kaydı.
 */
export interface TenantIntegrationExecutionResult
  extends ExecutionResultBase<
    TenantIntegrationPipelineBag,
    TenantIntegrationStageExecution,
    TenantIntegrationExecutionTelemetry
  > {
  tenantIntegrationResult: TenantIntegrationResult;
  pipelineSummary: TenantIntegrationPipelineExecutionSummary;
}
