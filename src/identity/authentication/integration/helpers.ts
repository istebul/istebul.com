/**
 * İSTEBUL Identity — Authentication Integration E2E helpers (EPIC-301E).
 */

import { endStageTimer, nowMs, startStageTimer } from '../../runtime/timing';
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

const VALID_LOCALES = new Set(['tr', 'en']);
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

  if (!VALID_LOCALES.has(locale)) {
    issues.push({
      code: 'INVALID_LOCALE',
      message: `Geçersiz locale: ${String(locale)}`,
      severity: 'error'
    });
  }

  if (context.operation !== undefined && !VALID_OPERATIONS.has(context.operation)) {
    issues.push({
      code: 'INVALID_OPERATION',
      message: `Geçersiz operation: ${String(context.operation)}`,
      severity: 'error'
    });
  }

  if (context.actorId !== undefined) {
    if (typeof context.actorId !== 'string' || context.actorId.trim() === '') {
      issues.push({
        code: 'EMPTY_ACTOR_ID',
        message: 'actorId boş string olamaz.',
        severity: 'error'
      });
    }
  }

  if (context.providerId !== undefined) {
    if (
      typeof context.providerId !== 'string' ||
      context.providerId.trim() === ''
    ) {
      issues.push({
        code: 'EMPTY_PROVIDER_ID',
        message: 'providerId boş string olamaz.',
        severity: 'error'
      });
    }
  }

  if (!context.providerContext && !context.providerId) {
    issues.push({
      code: 'PROVIDER_CONTEXT_REQUIRED',
      message: 'providerContext veya providerId zorunludur.',
      severity: 'error'
    });
  }

  if (context.providerContext) {
    if (
      !context.providerContext.providerId ||
      typeof context.providerContext.providerId !== 'string' ||
      context.providerContext.providerId.trim() === ''
    ) {
      issues.push({
        code: 'EMPTY_PROVIDER_CONTEXT_ID',
        message: 'providerContext.providerId zorunludur.',
        severity: 'error'
      });
    }
  }

  return Object.freeze(issues);
}

/**
 * Atlanan aşama kaydı üretir.
 */
export function createAuthenticationIntegrationSkippedStageExecution(
  stageId: AuthenticationIntegrationPipelineStage,
  detail: string
): AuthenticationIntegrationStageExecution {
  const timer = startStageTimer();
  const timing = endStageTimer(timer);
  return {
    stageId,
    stageName: AUTHENTICATION_INTEGRATION_STAGE_LABELS[stageId],
    outcome: 'skipped',
    detail,
    durationMs: timing.durationMs,
    startedAt: timer.startedAt,
    endedAt: timing.endedAt
  };
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
  const resolved =
    timing ??
    (() => {
      const timer = startStageTimer();
      const end = endStageTimer(timer);
      return {
        durationMs: end.durationMs,
        startedAt: timer.startedAt,
        endedAt: end.endedAt
      };
    })();

  return {
    stageId,
    stageName: AUTHENTICATION_INTEGRATION_STAGE_LABELS[stageId],
    outcome,
    detail,
    durationMs: resolved.durationMs,
    startedAt: resolved.startedAt,
    endedAt: resolved.endedAt
  };
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
  const stageDurationsMs: Partial<
    Record<AuthenticationIntegrationPipelineStage, number>
  > = {};
  const stageOutcomes: Partial<
    Record<
      AuthenticationIntegrationPipelineStage,
      AuthenticationIntegrationStageOutcome
    >
  > = {};

  let succeededStageCount = 0;
  let skippedStageCount = 0;

  for (const stage of stageExecutions) {
    stageDurationsMs[stage.stageId] = stage.durationMs;
    stageOutcomes[stage.stageId] = stage.outcome;
    if (stage.outcome === 'succeeded') {
      succeededStageCount += 1;
    }
    if (stage.outcome === 'skipped') {
      skippedStageCount += 1;
    }
  }

  return {
    totalDurationMs,
    startedAt,
    endedAt,
    stageDurationsMs: Object.freeze(stageDurationsMs),
    stageOutcomes: Object.freeze(stageOutcomes),
    succeededStageCount,
    skippedStageCount,
    summaryCount
  };
}

/**
 * Pipeline execution summary.
 */
export function buildAuthenticationIntegrationPipelineExecutionSummary(
  stageExecutions: readonly AuthenticationIntegrationStageExecution[]
): AuthenticationIntegrationPipelineExecutionSummary {
  let stagesSucceeded = 0;
  let stagesFailed = 0;
  let stagesSkipped = 0;

  for (const stage of stageExecutions) {
    if (stage.outcome === 'succeeded') stagesSucceeded += 1;
    if (stage.outcome === 'failed') stagesFailed += 1;
    if (stage.outcome === 'skipped') stagesSkipped += 1;
  }

  return {
    stagesExecuted: stageExecutions.length,
    stagesSucceeded,
    stagesFailed,
    stagesSkipped,
    success: stagesFailed === 0 && stagesSucceeded > 0
  };
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
    {
      key: 'success',
      label: 'Success',
      value: pipelineSummary.success && integration.summary.success
    },
    {
      key: 'stagesSucceeded',
      label: 'Stages Succeeded',
      value: pipelineSummary.stagesSucceeded
    },
    {
      key: 'stagesSkipped',
      label: 'Stages Skipped',
      value: pipelineSummary.stagesSkipped
    },
    {
      key: 'stagesFailed',
      label: 'Stages Failed',
      value: pipelineSummary.stagesFailed
    },
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
