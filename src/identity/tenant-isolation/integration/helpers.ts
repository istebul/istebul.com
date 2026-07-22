/**
 * İSTEBUL Identity — Tenant Integration E2E helpers (EPIC-302E).
 *
 * Shared stage/telemetry/summary utilities from core (PR-901B).
 * Public export names unchanged.
 */

import {
  buildIntegrationStageSummaryItems,
  buildIntegrationStyleExecutionTelemetry,
  buildPipelineExecutionSummary,
  createSkippedStageExecution as createSkippedStageExecutionCore,
  createStageExecution as createStageExecutionCore,
  endStageTimer,
  nowMs,
  pushEmptyOptionalStringIssue,
  pushEmptyProviderContextIdIssue,
  pushInvalidLocaleIssue,
  pushProviderContextRequiredIssue,
  startStageTimer
} from '../../../core/pipeline/index';
import type {
  TenantIntegrationExecutionTelemetry,
  TenantIntegrationPipelineExecutionSummary,
  TenantIntegrationResult,
  TenantIntegrationStageExecution,
  TenantIntegrationSummaryItem,
  TenantIntegrationValidationIssue
} from './TenantIntegrationExecutionResult';
import type { TenantIntegrationExecutionContext } from './TenantIntegrationExecutionContext';
import type {
  TenantIntegrationPipelineStage,
  TenantIntegrationStageOutcome
} from './stages';
import { TENANT_INTEGRATION_STAGE_LABELS } from './stages';

const VALID_OPERATIONS = new Set([
  'synchronize',
  'refresh',
  'validate',
  'mapWorkspace'
]);

/**
 * E2E bağlam doğrulaması.
 */
export function validateTenantIntegrationContext(
  context: TenantIntegrationExecutionContext
): readonly TenantIntegrationValidationIssue[] {
  const issues: TenantIntegrationValidationIssue[] = [];
  const locale = context.locale ?? 'tr';

  pushInvalidLocaleIssue(issues, locale);

  if (context.operation !== undefined && !VALID_OPERATIONS.has(context.operation)) {
    issues.push({
      code: 'INVALID_OPERATION',
      message: `Geçersiz operation: ${String(context.operation)}`,
      severity: 'error'
    });
  }

  pushEmptyOptionalStringIssue(
    issues,
    context.actorId,
    'EMPTY_ACTOR_ID',
    'actorId boş string olamaz.'
  );
  pushEmptyOptionalStringIssue(
    issues,
    context.tenantId,
    'EMPTY_TENANT_ID',
    'tenantId boş string olamaz.'
  );
  pushEmptyOptionalStringIssue(
    issues,
    context.providerId,
    'EMPTY_PROVIDER_ID',
    'providerId boş string olamaz.'
  );
  pushProviderContextRequiredIssue(
    issues,
    context.providerContext,
    context.providerId
  );
  pushEmptyProviderContextIdIssue(issues, context.providerContext);

  return Object.freeze(issues);
}

/**
 * Atlanan aşama kaydı üretir.
 */
export function createTenantIntegrationSkippedStageExecution(
  stageId: TenantIntegrationPipelineStage,
  detail: string
): TenantIntegrationStageExecution {
  return createSkippedStageExecutionCore(
    stageId,
    TENANT_INTEGRATION_STAGE_LABELS[stageId],
    detail
  );
}

/**
 * Aşama kaydı üretir.
 */
export function createTenantIntegrationStageExecution(
  stageId: TenantIntegrationPipelineStage,
  outcome: TenantIntegrationStageOutcome,
  detail: string,
  timing?: { durationMs: number; startedAt: string; endedAt: string }
): TenantIntegrationStageExecution {
  return createStageExecutionCore(
    stageId,
    TENANT_INTEGRATION_STAGE_LABELS[stageId],
    outcome,
    detail,
    timing
  );
}

/**
 * Telemetri özeti üretir.
 */
export function buildTenantIntegrationExecutionTelemetry(
  stageExecutions: readonly TenantIntegrationStageExecution[],
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  summaryCount: number
): TenantIntegrationExecutionTelemetry {
  return buildIntegrationStyleExecutionTelemetry(
    stageExecutions,
    startedAt,
    endedAt,
    totalDurationMs,
    summaryCount
  );
}

/**
 * Pipeline execution summary.
 */
export function buildTenantIntegrationPipelineExecutionSummary(
  stageExecutions: readonly TenantIntegrationStageExecution[]
): TenantIntegrationPipelineExecutionSummary {
  return buildPipelineExecutionSummary(
    stageExecutions,
    'no-failures-and-some-succeeded'
  );
}

/**
 * Boş / validation-fail sonrası IntegrationResult.
 */
export function createEmptyTenantIntegrationResult(
  validationIssues: readonly TenantIntegrationValidationIssue[],
  telemetry: TenantIntegrationResult['telemetry'],
  summaryItems: readonly TenantIntegrationSummaryItem[] = []
): TenantIntegrationResult {
  return {
    summary: {
      success: false,
      adapterSucceeded: false,
      providerSucceeded: false,
      sessionBridgeSucceeded: false,
      businessContextBridgeSucceeded: false,
      stagesSucceeded: 0,
      stagesSkipped: 0,
      stagesFailed: validationIssues.some((item) => item.severity === 'error')
        ? 1
        : 0
    },
    summaryItems: Object.freeze([...summaryItems]),
    validationIssues: Object.freeze([...validationIssues]),
    telemetry
  };
}

/**
 * Aggregate TenantIntegrationResult üretir.
 */
export function createTenantIntegrationResult(input: {
  success: boolean;
  adapterSucceeded: boolean;
  providerSucceeded: boolean;
  sessionBridgeSucceeded: boolean;
  businessContextBridgeSucceeded: boolean;
  stagesSucceeded: number;
  stagesSkipped: number;
  stagesFailed: number;
  summaryItems: readonly TenantIntegrationSummaryItem[];
  validationIssues: readonly TenantIntegrationValidationIssue[];
  telemetry: TenantIntegrationResult['telemetry'];
  providerResult?: TenantIntegrationResult['providerResult'];
  sessionBridgeResult?: TenantIntegrationResult['sessionBridgeResult'];
  businessContextBridgeResult?: TenantIntegrationResult['businessContextBridgeResult'];
}): TenantIntegrationResult {
  return {
    summary: {
      success: input.success,
      adapterSucceeded: input.adapterSucceeded,
      providerSucceeded: input.providerSucceeded,
      sessionBridgeSucceeded: input.sessionBridgeSucceeded,
      businessContextBridgeSucceeded: input.businessContextBridgeSucceeded,
      stagesSucceeded: input.stagesSucceeded,
      stagesSkipped: input.stagesSkipped,
      stagesFailed: input.stagesFailed
    },
    summaryItems: Object.freeze([...input.summaryItems]),
    validationIssues: Object.freeze([...input.validationIssues]),
    telemetry: { ...input.telemetry },
    providerResult: input.providerResult,
    sessionBridgeResult: input.sessionBridgeResult,
    businessContextBridgeResult: input.businessContextBridgeResult
  };
}

/**
 * E2E summary items.
 */
export function buildTenantIntegrationE2ESummaryItems(
  pipelineSummary: TenantIntegrationPipelineExecutionSummary,
  integration: TenantIntegrationResult
): TenantIntegrationSummaryItem[] {
  return [
    ...buildIntegrationStageSummaryItems(
      pipelineSummary,
      integration.summary.success
    ),
    {
      key: 'adapterSucceeded',
      label: 'Adapter Succeeded',
      value: integration.summary.adapterSucceeded
    },
    {
      key: 'providerSucceeded',
      label: 'Provider Succeeded',
      value: integration.summary.providerSucceeded
    },
    {
      key: 'sessionBridgeSucceeded',
      label: 'Session Bridge Succeeded',
      value: integration.summary.sessionBridgeSucceeded
    },
    {
      key: 'businessContextBridgeSucceeded',
      label: 'Business Context Bridge Succeeded',
      value: integration.summary.businessContextBridgeSucceeded
    }
  ];
}

export { nowMs, startStageTimer, endStageTimer };
