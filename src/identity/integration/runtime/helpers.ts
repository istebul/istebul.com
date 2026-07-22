/**
 * İSTEBUL Identity — Identity & Access E2E helpers (PR-203F).
 */

import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';
import type {
  IdentityAccessExecutionTelemetry,
  IdentityAccessPipelineExecutionSummary,
  IdentityAccessResult,
  IdentityAccessStageExecution,
  IdentityAccessSummaryItem,
  IdentityAccessValidationIssue
} from './IdentityAccessExecutionResult';
import type { IdentityAccessExecutionContext } from './IdentityAccessExecutionContext';
import type {
  IdentityAccessPipelineStage,
  IdentityAccessStageOutcome
} from './stages';
import { IDENTITY_ACCESS_STAGE_LABELS } from './stages';

const VALID_LOCALES = new Set(['tr', 'en']);

/**
 * E2E bağlam doğrulaması — projection-only; Auth/JWT/API yok.
 */
export function validateIdentityAccessContext(
  context: IdentityAccessExecutionContext
): readonly IdentityAccessValidationIssue[] {
  const issues: IdentityAccessValidationIssue[] = [];
  const locale = context.locale ?? 'tr';

  if (!VALID_LOCALES.has(locale)) {
    issues.push({
      code: 'INVALID_LOCALE',
      message: `Geçersiz locale: ${String(locale)}`,
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

  if (context.tenantId !== undefined) {
    if (
      typeof context.tenantId !== 'string' ||
      context.tenantId.trim() === ''
    ) {
      issues.push({
        code: 'EMPTY_TENANT_ID',
        message: 'tenantId boş string olamaz.',
        severity: 'error'
      });
    }
  }

  for (const [field, ids] of [
    ['identityIds', context.identityIds],
    ['authenticationIds', context.authenticationIds],
    ['sessionIds', context.sessionIds],
    ['authorizationIds', context.authorizationIds],
    ['isolationIds', context.isolationIds]
  ] as const) {
    if (ids === undefined) {
      continue;
    }
    if (!Array.isArray(ids)) {
      issues.push({
        code: `INVALID_${field.toUpperCase()}`,
        message: `${field} bir dizi olmalıdır.`,
        severity: 'error'
      });
      continue;
    }
    if (ids.length === 0) {
      issues.push({
        code: `EMPTY_${field.toUpperCase()}`,
        message: `${field} boş olamaz; tüm kayıtlar için undefined kullanın.`,
        severity: 'warning'
      });
    }
  }

  return Object.freeze(issues);
}

/**
 * Atlanan aşama kaydı üretir.
 */
export function createSkippedStageExecution(
  stageId: IdentityAccessPipelineStage,
  detail: string
): IdentityAccessStageExecution {
  const timer = startStageTimer();
  const timing = endStageTimer(timer);
  return {
    stageId,
    stageName: IDENTITY_ACCESS_STAGE_LABELS[stageId],
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
export function createStageExecution(
  stageId: IdentityAccessPipelineStage,
  outcome: IdentityAccessStageOutcome,
  detail: string,
  timing?: { durationMs: number; startedAt: string; endedAt: string }
): IdentityAccessStageExecution {
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
    stageName: IDENTITY_ACCESS_STAGE_LABELS[stageId],
    outcome,
    detail,
    durationMs: resolved.durationMs,
    startedAt: resolved.startedAt,
    endedAt: resolved.endedAt
  };
}

/**
 * Telemetri özeti üretir — total duration, stage durations, succeeded/skipped/summary.
 */
export function buildIdentityAccessExecutionTelemetry(
  stageExecutions: readonly IdentityAccessStageExecution[],
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  summaryCount: number
): IdentityAccessExecutionTelemetry {
  const stageDurationsMs: Partial<
    Record<IdentityAccessPipelineStage, number>
  > = {};
  const stageOutcomes: Partial<
    Record<IdentityAccessPipelineStage, IdentityAccessStageOutcome>
  > = {};
  let stagesSucceeded = 0;
  let stagesFailed = 0;
  let stagesSkipped = 0;

  for (const execution of stageExecutions) {
    stageDurationsMs[execution.stageId] = execution.durationMs;
    stageOutcomes[execution.stageId] = execution.outcome;
    if (execution.outcome === 'succeeded') {
      stagesSucceeded += 1;
    } else if (execution.outcome === 'failed') {
      stagesFailed += 1;
    } else if (execution.outcome === 'skipped') {
      stagesSkipped += 1;
    }
  }

  const summary: IdentityAccessPipelineExecutionSummary = {
    stagesExecuted: stageExecutions.length,
    stagesSucceeded,
    stagesFailed,
    stagesSkipped,
    success: stagesFailed === 0
  };

  return {
    totalDurationMs,
    startedAt,
    endedAt,
    stageDurationsMs: Object.freeze({ ...stageDurationsMs }),
    stageOutcomes: Object.freeze({ ...stageOutcomes }),
    succeededStageCount: stagesSucceeded,
    skippedStageCount: stagesSkipped,
    summaryCount,
    summary
  };
}

/**
 * Validation başarısızken veya aggregate için boş ama geçerli IdentityAccessResult.
 */
export function createEmptyIdentityAccessResult(
  validationIssues: readonly IdentityAccessValidationIssue[],
  summaryItems: readonly IdentityAccessSummaryItem[],
  startedAt: string,
  endedAt: string,
  durationMs: number,
  stageCounts: {
    stagesSucceeded: number;
    stagesSkipped: number;
    stagesFailed: number;
  }
): IdentityAccessResult {
  return {
    summary: {
      success: false,
      identityCount: 0,
      authenticationCount: 0,
      sessionCount: 0,
      authorizationCount: 0,
      tenantIsolationCount: 0,
      stagesSucceeded: stageCounts.stagesSucceeded,
      stagesSkipped: stageCounts.stagesSkipped,
      stagesFailed: stageCounts.stagesFailed
    },
    summaryItems: Object.freeze([...summaryItems]),
    validationIssues: Object.freeze([...validationIssues]),
    telemetry: {
      durationMs,
      startedAt,
      endedAt,
      summaryItemCount: summaryItems.length
    }
  };
}

/**
 * Aggregate IdentityAccessResult üretir (her durumda geçerli).
 */
export function createIdentityAccessResult(input: {
  success: boolean;
  identityCount: number;
  authenticationCount: number;
  sessionCount: number;
  authorizationCount: number;
  tenantIsolationCount: number;
  stagesSucceeded: number;
  stagesSkipped: number;
  stagesFailed: number;
  summaryItems: readonly IdentityAccessSummaryItem[];
  validationIssues: readonly IdentityAccessValidationIssue[];
  startedAt: string;
  endedAt: string;
  durationMs: number;
  identityResult?: IdentityAccessResult['identityResult'];
  authenticationResult?: IdentityAccessResult['authenticationResult'];
  sessionResult?: IdentityAccessResult['sessionResult'];
  authorizationResult?: IdentityAccessResult['authorizationResult'];
  tenantIsolationResult?: IdentityAccessResult['tenantIsolationResult'];
}): IdentityAccessResult {
  return {
    summary: {
      success: input.success,
      identityCount: input.identityCount,
      authenticationCount: input.authenticationCount,
      sessionCount: input.sessionCount,
      authorizationCount: input.authorizationCount,
      tenantIsolationCount: input.tenantIsolationCount,
      stagesSucceeded: input.stagesSucceeded,
      stagesSkipped: input.stagesSkipped,
      stagesFailed: input.stagesFailed
    },
    summaryItems: Object.freeze([...input.summaryItems]),
    validationIssues: Object.freeze([...input.validationIssues]),
    telemetry: {
      durationMs: input.durationMs,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      summaryItemCount: input.summaryItems.length
    },
    ...(input.identityResult !== undefined
      ? { identityResult: input.identityResult }
      : {}),
    ...(input.authenticationResult !== undefined
      ? { authenticationResult: input.authenticationResult }
      : {}),
    ...(input.sessionResult !== undefined
      ? { sessionResult: input.sessionResult }
      : {}),
    ...(input.authorizationResult !== undefined
      ? { authorizationResult: input.authorizationResult }
      : {}),
    ...(input.tenantIsolationResult !== undefined
      ? { tenantIsolationResult: input.tenantIsolationResult }
      : {})
  };
}

/**
 * E2E summary öğeleri üretir.
 */
export function buildE2ESummaryItems(
  stageExecutions: readonly IdentityAccessStageExecution[],
  locale: 'tr' | 'en',
  counts: {
    identityCount: number;
    authenticationCount: number;
    sessionCount: number;
    authorizationCount: number;
    tenantIsolationCount: number;
  }
): readonly IdentityAccessSummaryItem[] {
  const succeeded = stageExecutions.filter(
    (s) => s.outcome === 'succeeded'
  ).length;
  const skipped = stageExecutions.filter((s) => s.outcome === 'skipped').length;
  const failed = stageExecutions.filter((s) => s.outcome === 'failed').length;

  return Object.freeze([
    { key: 'locale', label: 'Locale', value: locale },
    { key: 'stages-succeeded', label: 'Stages Succeeded', value: succeeded },
    { key: 'stages-skipped', label: 'Stages Skipped', value: skipped },
    { key: 'stages-failed', label: 'Stages Failed', value: failed },
    {
      key: 'identity-count',
      label: 'Identity Count',
      value: counts.identityCount
    },
    {
      key: 'authentication-count',
      label: 'Authentication Count',
      value: counts.authenticationCount
    },
    {
      key: 'session-count',
      label: 'Session Count',
      value: counts.sessionCount
    },
    {
      key: 'authorization-count',
      label: 'Authorization Count',
      value: counts.authorizationCount
    },
    {
      key: 'tenant-isolation-count',
      label: 'Tenant Isolation Count',
      value: counts.tenantIsolationCount
    }
  ]);
}

export { nowMs, startStageTimer, endStageTimer };
