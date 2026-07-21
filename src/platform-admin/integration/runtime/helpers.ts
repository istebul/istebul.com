/**
 * İSTEBUL Platform Admin — integration helpers (PR-201F).
 */

import type { PlatformAdminResult } from '../../runtime/PlatformAdminResult';
import type { PlatformAdminSummaryItem } from '../../runtime/PlatformAdminResult';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';
import type {
  PlatformAdminExecutionTelemetry,
  PlatformAdminPipelineExecutionSummary,
  PlatformAdminStageExecution
} from './PlatformAdminExecutionResult';
import type {
  PlatformAdminPipelineStage,
  PlatformAdminStageOutcome
} from './stages';
import { PLATFORM_ADMIN_STAGE_LABELS } from './stages';

/**
 * Atlanan aşama kaydı üretir.
 */
export function createSkippedStageExecution(
  stageId: PlatformAdminPipelineStage,
  detail: string
): PlatformAdminStageExecution {
  const timer = startStageTimer();
  const timing = endStageTimer(timer);
  return {
    stageId,
    stageName: PLATFORM_ADMIN_STAGE_LABELS[stageId],
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
  stageId: PlatformAdminPipelineStage,
  outcome: PlatformAdminStageOutcome,
  detail: string,
  timing?: { durationMs: number; startedAt: string; endedAt: string }
): PlatformAdminStageExecution {
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
    stageName: PLATFORM_ADMIN_STAGE_LABELS[stageId],
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
export function buildPlatformAdminExecutionTelemetry(
  stageExecutions: readonly PlatformAdminStageExecution[],
  startedAt: string,
  endedAt: string,
  totalDurationMs: number
): PlatformAdminExecutionTelemetry {
  const stageDurationsMs: Partial<Record<PlatformAdminPipelineStage, number>> =
    {};
  const stageOutcomes: Partial<
    Record<PlatformAdminPipelineStage, PlatformAdminStageOutcome>
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

  const summary: PlatformAdminPipelineExecutionSummary = {
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
    summary
  };
}

/**
 * Validation başarısızken boş ama geçerli PlatformAdminResult.
 */
export function createEmptyPlatformAdminResult(
  validationIssues: PlatformAdminResult['validationIssues'],
  summaryItems: readonly PlatformAdminSummaryItem[],
  startedAt: string,
  endedAt: string,
  durationMs: number
): PlatformAdminResult {
  return {
    modules: Object.freeze([]),
    summary: {
      success: false,
      moduleCount: 0,
      requestedCount: 0,
      unavailableCount: 0
    },
    summaryItems: Object.freeze([...summaryItems]),
    validationIssues: Object.freeze([...validationIssues]),
    telemetry: {
      durationMs,
      startedAt,
      endedAt,
      registeredModuleCount: 0,
      summaryItemCount: summaryItems.length
    }
  };
}

/**
 * E2E summary öğeleri üretir.
 */
export function buildE2ESummaryItems(
  stageExecutions: readonly PlatformAdminStageExecution[],
  locale: 'tr' | 'en',
  counts: {
    moduleCount: number;
    tenantCount: number;
    userCount: number;
    subscriptionCount: number;
    serviceCount: number;
  }
): readonly PlatformAdminSummaryItem[] {
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
      key: 'module-count',
      label: 'Module Count',
      value: counts.moduleCount
    },
    {
      key: 'tenant-count',
      label: 'Tenant Count',
      value: counts.tenantCount
    },
    { key: 'user-count', label: 'User Count', value: counts.userCount },
    {
      key: 'subscription-count',
      label: 'Subscription Count',
      value: counts.subscriptionCount
    },
    {
      key: 'service-count',
      label: 'Service Count',
      value: counts.serviceCount
    }
  ]);
}

export { nowMs, startStageTimer, endStageTimer };
