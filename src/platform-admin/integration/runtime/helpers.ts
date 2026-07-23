/**
 * İSTEBUL Platform Admin — integration helpers (PR-201F).
 *
 * Shared stage/telemetry/summary utilities from core (PR-901B).
 * Public export names unchanged.
 */

import type { PlatformAdminResult } from '../../runtime/PlatformAdminResult';
import type { PlatformAdminSummaryItem } from '../../runtime/PlatformAdminResult';
import {
  buildAdminStyleExecutionTelemetry,
  buildStageCountSummaryItems,
  createSkippedStageExecution as createSkippedStageExecutionCore,
  createStageExecution as createStageExecutionCore,
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../../core/pipeline/index';
import type {
  PlatformAdminExecutionTelemetry,
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
  return createSkippedStageExecutionCore(
    stageId,
    PLATFORM_ADMIN_STAGE_LABELS[stageId],
    detail
  );
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
  return createStageExecutionCore(
    stageId,
    PLATFORM_ADMIN_STAGE_LABELS[stageId],
    outcome,
    detail,
    timing
  );
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
  return buildAdminStyleExecutionTelemetry(
    stageExecutions,
    startedAt,
    endedAt,
    totalDurationMs,
    { successMode: 'no-failures' }
  );
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
  return Object.freeze([
    ...buildStageCountSummaryItems(stageExecutions, locale),
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
