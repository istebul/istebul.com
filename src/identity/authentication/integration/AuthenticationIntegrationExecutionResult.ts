/**
 * İSTEBUL Identity — AuthenticationIntegrationResult + ExecutionResult (EPIC-301E).
 */

import type { AuthenticationProviderResult } from '../adapters/AuthenticationProviderResult';
import type { AuthenticationSessionBridgeResult } from '../bridge/AuthenticationSessionBridgeResult';
import type { IdentityBridgeResult } from '../../bridge/IdentityBridgeResult';
import type { AuthenticationIntegrationPipelineBag } from './AuthenticationIntegrationExecutionContext';
import type {
  AuthenticationIntegrationPipelineStage,
  AuthenticationIntegrationStageOutcome
} from './stages';

/**
 * Integration özet öğesi.
 */
export interface AuthenticationIntegrationSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Integration doğrulama bulgusu.
 */
export interface AuthenticationIntegrationValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

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
export interface AuthenticationIntegrationResultTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  summaryItemCount: number;
}

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
export interface AuthenticationIntegrationStageExecution {
  stageId: AuthenticationIntegrationPipelineStage;
  stageName: string;
  outcome: AuthenticationIntegrationStageOutcome;
  detail: string;
  durationMs: number;
  startedAt: string;
  endedAt: string;
}

/**
 * Pipeline özet telemetrisi.
 */
export interface AuthenticationIntegrationPipelineExecutionSummary {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  success: boolean;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface AuthenticationIntegrationExecutionTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<
    Partial<Record<AuthenticationIntegrationPipelineStage, number>>
  >;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<
    Partial<
      Record<
        AuthenticationIntegrationPipelineStage,
        AuthenticationIntegrationStageOutcome
      >
    >
  >;
  /** Succeeded stage count */
  succeededStageCount: number;
  /** Skipped stage count */
  skippedStageCount: number;
  /** Summary count */
  summaryCount: number;
}

/**
 * AuthenticationIntegrationExecutionResult — tam yürütme kaydı.
 */
export interface AuthenticationIntegrationExecutionResult {
  authenticationIntegrationResult: AuthenticationIntegrationResult;
  stageExecutions: readonly AuthenticationIntegrationStageExecution[];
  pipelineSummary: AuthenticationIntegrationPipelineExecutionSummary;
  telemetry: AuthenticationIntegrationExecutionTelemetry;
  bag: AuthenticationIntegrationPipelineBag;
}
