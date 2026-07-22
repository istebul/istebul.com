/**
 * İSTEBUL Identity — TenantIntegrationResult + ExecutionResult (EPIC-302E).
 */

import type { TenantProviderResult } from '../adapters/TenantProviderResult';
import type { TenantSessionBridgeResult } from '../bridge/TenantSessionBridgeResult';
import type { BusinessContextBridgeResult } from '../../business-context/bridge/BusinessContextBridgeResult';
import type { TenantIntegrationPipelineBag } from './TenantIntegrationExecutionContext';
import type {
  TenantIntegrationPipelineStage,
  TenantIntegrationStageOutcome
} from './stages';

/**
 * Integration özet öğesi.
 */
export interface TenantIntegrationSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Integration doğrulama bulgusu.
 */
export interface TenantIntegrationValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

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
export interface TenantIntegrationResultTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  summaryItemCount: number;
}

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
export interface TenantIntegrationStageExecution {
  stageId: TenantIntegrationPipelineStage;
  stageName: string;
  outcome: TenantIntegrationStageOutcome;
  detail: string;
  durationMs: number;
  startedAt: string;
  endedAt: string;
}

/**
 * Pipeline özet telemetrisi.
 */
export interface TenantIntegrationPipelineExecutionSummary {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  success: boolean;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface TenantIntegrationExecutionTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<
    Partial<Record<TenantIntegrationPipelineStage, number>>
  >;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<
    Partial<
      Record<TenantIntegrationPipelineStage, TenantIntegrationStageOutcome>
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
 * TenantIntegrationExecutionResult — tam yürütme kaydı.
 */
export interface TenantIntegrationExecutionResult {
  tenantIntegrationResult: TenantIntegrationResult;
  stageExecutions: readonly TenantIntegrationStageExecution[];
  pipelineSummary: TenantIntegrationPipelineExecutionSummary;
  telemetry: TenantIntegrationExecutionTelemetry;
  bag: TenantIntegrationPipelineBag;
}
