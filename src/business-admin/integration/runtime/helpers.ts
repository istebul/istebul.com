/**
 * İSTEBUL Business Admin — integration helpers (PR-202F).
 *
 * Shared stage/telemetry/summary utilities from core (PR-901B).
 * Public export names unchanged.
 */

import type {
  BusinessAdminResult,
  BusinessAdminSummaryItem
} from '../../runtime/BusinessAdminResult';
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
  BusinessAdminExecutionTelemetry,
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
  return createSkippedStageExecutionCore(
    stageId,
    BUSINESS_ADMIN_STAGE_LABELS[stageId],
    detail
  );
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
  return createStageExecutionCore(
    stageId,
    BUSINESS_ADMIN_STAGE_LABELS[stageId],
    outcome,
    detail,
    timing
  );
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
  return buildAdminStyleExecutionTelemetry(
    stageExecutions,
    startedAt,
    endedAt,
    totalDurationMs,
    { successMode: 'no-failures' }
  );
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
  return Object.freeze([
    ...buildStageCountSummaryItems(stageExecutions, locale),
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
