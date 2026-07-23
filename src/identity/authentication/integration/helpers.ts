/**
 * İSTEBUL Identity — Authentication Integration E2E helpers (EPIC-301E).
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
  AuthenticationIntegrationExecutionTelemetry,
  AuthenticationIntegrationPipelineExecutionSummary,
  AuthenticationIntegrationResult,
  AuthenticationIntegrationStageExecution,
  AuthenticationIntegrationSummaryItem,
  AuthenticationIntegrationValidationIssue
} from './AuthenticationIntegrationExecutionResult';
import type { AuthenticationIntegrationExecutionContext } from './AuthenticationIntegrationExecutionContext';
import type {
  AuthenticationIntegrationPipelineStage,
  AuthenticationIntegrationStageOutcome
} from './stages';
import { AUTHENTICATION_INTEGRATION_STAGE_LABELS } from './stages';

const VALID_OPERATIONS = new Set([
  'synchronize',
  'refresh',
  'logout',
  'validate'
]);

/**
 * E2E bağlam doğrulaması.
 */
export function validateAuthenticationIntegrationContext(
  context: AuthenticationIntegrationExecutionContext
): readonly AuthenticationIntegrationValidationIssue[] {
  const issues: AuthenticationIntegrationValidationIssue[] = [];
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
export function createAuthenticationIntegrationSkippedStageExecution(
  stageId: AuthenticationIntegrationPipelineStage,
  detail: string
): AuthenticationIntegrationStageExecution {
  return createSkippedStageExecutionCore(
    stageId,
    AUTHENTICATION_INTEGRATION_STAGE_LABELS[stageId],
    detail
  );
}

/**
 * Aşama kaydı üretir.
 */
export function createAuthenticationIntegrationStageExecution(
  stageId: AuthenticationIntegrationPipelineStage,
  outcome: AuthenticationIntegrationStageOutcome,
  detail: string,
  timing?: { durationMs: number; startedAt: string; endedAt: string }
): AuthenticationIntegrationStageExecution {
  return createStageExecutionCore(
    stageId,
    AUTHENTICATION_INTEGRATION_STAGE_LABELS[stageId],
    outcome,
    detail,
    timing
  );
}

/**
 * Telemetri özeti üretir.
 */
export function buildAuthenticationIntegrationExecutionTelemetry(
  stageExecutions: readonly AuthenticationIntegrationStageExecution[],
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  summaryCount: number
): AuthenticationIntegrationExecutionTelemetry {
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
export function buildAuthenticationIntegrationPipelineExecutionSummary(
  stageExecutions: readonly AuthenticationIntegrationStageExecution[]
): AuthenticationIntegrationPipelineExecutionSummary {
  return buildPipelineExecutionSummary(
    stageExecutions,
    'no-failures-and-some-succeeded'
  );
}

/**
 * Boş / validation-fail sonrası IntegrationResult.
 */
export function createEmptyAuthenticationIntegrationResult(
  validationIssues: readonly AuthenticationIntegrationValidationIssue[],
  telemetry: AuthenticationIntegrationResult['telemetry'],
  summaryItems: readonly AuthenticationIntegrationSummaryItem[] = []
): AuthenticationIntegrationResult {
  return {
    summary: {
      success: false,
      adapterSucceeded: false,
      providerSucceeded: false,
      sessionBridgeSucceeded: false,
      identityBridgeSucceeded: false,
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
 * Aggregate AuthenticationIntegrationResult üretir.
 */
export function createAuthenticationIntegrationResult(input: {
  success: boolean;
  adapterSucceeded: boolean;
  providerSucceeded: boolean;
  sessionBridgeSucceeded: boolean;
  identityBridgeSucceeded: boolean;
  stagesSucceeded: number;
  stagesSkipped: number;
  stagesFailed: number;
  summaryItems: readonly AuthenticationIntegrationSummaryItem[];
  validationIssues: readonly AuthenticationIntegrationValidationIssue[];
  telemetry: AuthenticationIntegrationResult['telemetry'];
  providerResult?: AuthenticationIntegrationResult['providerResult'];
  sessionBridgeResult?: AuthenticationIntegrationResult['sessionBridgeResult'];
  identityBridgeResult?: AuthenticationIntegrationResult['identityBridgeResult'];
}): AuthenticationIntegrationResult {
  return {
    summary: {
      success: input.success,
      adapterSucceeded: input.adapterSucceeded,
      providerSucceeded: input.providerSucceeded,
      sessionBridgeSucceeded: input.sessionBridgeSucceeded,
      identityBridgeSucceeded: input.identityBridgeSucceeded,
      stagesSucceeded: input.stagesSucceeded,
      stagesSkipped: input.stagesSkipped,
      stagesFailed: input.stagesFailed
    },
    summaryItems: Object.freeze([...input.summaryItems]),
    validationIssues: Object.freeze([...input.validationIssues]),
    telemetry: { ...input.telemetry },
    providerResult: input.providerResult,
    sessionBridgeResult: input.sessionBridgeResult,
    identityBridgeResult: input.identityBridgeResult
  };
}

/**
 * E2E summary items.
 */
export function buildAuthenticationIntegrationE2ESummaryItems(
  pipelineSummary: AuthenticationIntegrationPipelineExecutionSummary,
  integration: AuthenticationIntegrationResult
): AuthenticationIntegrationSummaryItem[] {
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
      key: 'identityBridgeSucceeded',
      label: 'Identity Bridge Succeeded',
      value: integration.summary.identityBridgeSucceeded
    }
  ];
}

export { nowMs, startStageTimer, endStageTimer };
