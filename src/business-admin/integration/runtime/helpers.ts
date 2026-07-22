/**
 * İSTEBUL Business Admin — integration helpers (PR-202F).
 */

import type {
  BusinessAdminResult,
  BusinessAdminSummaryItem
} from '../../runtime/BusinessAdminResult';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';
import type {
  BusinessAdminExecutionTelemetry,
  BusinessAdminPipelineExecutionSummary,
  BusinessAdminStageExecution
} from './BusinessAdminExecutionResult';
import type {
  BusinessAdminPipelineStage,
  BusinessAdminStageOutcome
} from './stages';
import { BUSINESS_ADMIN_STAGE_LABELS } from './stages';

/**
 * Atlanan aşama kaydı üretir.
 */
export function createSkippedStageExecution(
  stageId: BusinessAdminPipelineStage,
  detail: string
): BusinessAdminStageExecution {
  const timer = startStageTimer();
  const timing = endStageTimer(timer);
  return {
    stageId,
    stageName: BUSINESS_ADMIN_STAGE_LABELS[stageId],
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
  stageId: BusinessAdminPipelineStage,
  outcome: BusinessAdminStageOutcome,
  detail: string,
  timing?: { durationMs: number; startedAt: string; endedAt: string }
): BusinessAdminStageExecution {
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
    stageName: BUSINESS_ADMIN_STAGE_LABELS[stageId],
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
export function buildBusinessAdminExecutionTelemetry(
  stageExecutions: readonly BusinessAdminStageExecution[],
  startedAt: string,
  endedAt: string,
  totalDurationMs: number
): BusinessAdminExecutionTelemetry {
  const stageDurationsMs: Partial<
    Record<BusinessAdminPipelineStage, number>
  > = {};
  const stageOutcomes: Partial<
    Record<BusinessAdminPipelineStage, BusinessAdminStageOutcome>
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

  const summary: BusinessAdminPipelineExecutionSummary = {
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
 * Validation başarısızken boş ama geçerli BusinessAdminResult.
 */
export function createEmptyBusinessAdminResult(
  tenantId: string,
  validationIssues: BusinessAdminResult['validationIssues'],
  summaryItems: readonly BusinessAdminSummaryItem[],
  startedAt: string,
  endedAt: string,
  durationMs: number
): BusinessAdminResult {
  return {
    modules: Object.freeze([]),
    summary: {
      success: false,
      moduleCount: 0,
      requestedCount: 0,
      unavailableCount: 0,
      tenantId
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
  stageExecutions: readonly BusinessAdminStageExecution[],
  locale: 'tr' | 'en',
  counts: {
    moduleCount: number;
    dashboardWidgetCount: number;
    reportsWidgetCount: number;
    exportWidgetCount: number;
    settingsSectionCount: number;
  }
): readonly BusinessAdminSummaryItem[] {
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
      key: 'dashboard-widget-count',
      label: 'Dashboard Widget Count',
      value: counts.dashboardWidgetCount
    },
    {
      key: 'reports-widget-count',
      label: 'Reports Widget Count',
      value: counts.reportsWidgetCount
    },
    {
      key: 'export-widget-count',
      label: 'Export Widget Count',
      value: counts.exportWidgetCount
    },
    {
      key: 'settings-section-count',
      label: 'Settings Section Count',
      value: counts.settingsSectionCount
    }
  ]);
}

export { nowMs, startStageTimer, endStageTimer };
