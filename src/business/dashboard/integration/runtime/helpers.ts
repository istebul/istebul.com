/**
 * İSTEBUL Business Dashboard Engine — integration helpers (PR-105F).
 */

import type { AnalysisResult } from '../../../analysis/models/AnalysisResult';
import type { DecisionResult } from '../../../decision/models/DecisionResult';
import type { ReportModel } from '../../../report/models/ReportModel';
import { DASHBOARD_ENGINE_DEFAULT_LOCALE } from '../../constants/DashboardEngineConstants';
import type { DashboardContext } from '../../models/DashboardContext';
import type { DashboardModel } from '../../models/DashboardModel';
import type { DashboardRequest } from '../../models/DashboardRequest';
import type {
  DashboardExecutionStatus,
  DashboardStage
} from '../../models/DashboardStage';
import type {
  DashboardStageExecution,
  DashboardStageExecutionOutcome
} from '../../pipeline/runtime/DashboardStageExecution';
import type { DashboardPipelineContext } from '../../pipeline/runtime/DashboardPipelineContext';
import {
  endDashboardStageTimer,
  nowMs,
  startDashboardStageTimer
} from '../../pipeline/runtime/DashboardTiming';
import type { DashboardExecutionContext } from './DashboardExecutionContext';
import type {
  DashboardExecutionTelemetry,
  DashboardPipelineExecutionSummary
} from './DashboardExecutionResult';

const DEFAULT_LAYOUT_ID = 'dashboard-layout-default';
const DEFAULT_THEME_ID = 'dashboard-theme-default';

/**
 * Execution bağlamından DashboardContext üretir.
 */
export function resolveDashboardContext(
  execution: DashboardExecutionContext
): DashboardContext {
  if (execution.dashboardContext) {
    return {
      ...execution.dashboardContext,
      locale:
        execution.locale ??
        execution.dashboardContext.locale ??
        DASHBOARD_ENGINE_DEFAULT_LOCALE,
      layoutId:
        execution.request.layoutId ??
        execution.dashboardContext.layoutId ??
        DEFAULT_LAYOUT_ID,
      themeId:
        execution.request.themeId ??
        execution.dashboardContext.themeId ??
        DEFAULT_THEME_ID,
      reportModel:
        execution.reportModel ?? execution.dashboardContext.reportModel,
      decisionResult:
        execution.decisionResult ?? execution.dashboardContext.decisionResult,
      analysisResult:
        execution.analysisResult ?? execution.dashboardContext.analysisResult,
      currentStage: 'dashboard-dogrulama',
      status: 'bekliyor'
    };
  }

  const reportModel = execution.reportModel;
  const decisionResult = execution.decisionResult;
  const analysisResult = execution.analysisResult;

  if (!reportModel && !decisionResult && !analysisResult) {
    throw new Error(
      'DashboardExecutionContext.reportModel, decisionResult, analysisResult veya dashboardContext zorunludur.'
    );
  }

  return {
    dashboardJobId: execution.request.id,
    locale:
      execution.locale ??
      execution.request.locale ??
      DASHBOARD_ENGINE_DEFAULT_LOCALE,
    layoutId: execution.request.layoutId ?? DEFAULT_LAYOUT_ID,
    themeId: execution.request.themeId ?? DEFAULT_THEME_ID,
    currentStage: 'dashboard-dogrulama',
    status: 'bekliyor',
    reportModel,
    decisionResult,
    analysisResult
  };
}

/**
 * İstek kimliklerini ReportResult / Decision / Analysis kaynaklarından tamamlar.
 */
export function ensureRequestIds(
  request: DashboardRequest,
  sources: Readonly<{
    reportModel?: ReportModel;
    decisionResult?: DecisionResult;
    analysisResult?: AnalysisResult;
  }>
): DashboardRequest {
  let next = request;
  const { reportModel, decisionResult, analysisResult } = sources;

  if (!request.reportModelId || request.reportModelId.length === 0) {
    if (reportModel?.id) {
      next = { ...next, reportModelId: reportModel.id };
    }
  }
  if (!request.reportDnaId || request.reportDnaId.length === 0) {
    if (reportModel?.metadata?.reportDnaId) {
      next = { ...next, reportDnaId: reportModel.metadata.reportDnaId };
    }
  }
  if (!request.datasetId || request.datasetId.length === 0) {
    if (decisionResult?.datasetId) {
      next = { ...next, datasetId: decisionResult.datasetId };
    } else if (analysisResult?.datasetId) {
      next = { ...next, datasetId: analysisResult.datasetId };
    }
  }
  if (!request.decisionRequestId || request.decisionRequestId.length === 0) {
    if (decisionResult?.requestId) {
      next = { ...next, decisionRequestId: decisionResult.requestId };
    }
  }
  if (!request.analysisRequestId || request.analysisRequestId.length === 0) {
    if (analysisResult?.requestId) {
      next = { ...next, analysisRequestId: analysisResult.requestId };
    } else if (decisionResult?.analysisRequestId) {
      next = { ...next, analysisRequestId: decisionResult.analysisRequestId };
    }
  }
  return next;
}

export function createSkippedStageExecution(
  stageId: DashboardStage,
  stageName: string,
  detail: string
): DashboardStageExecution {
  const timing = endDashboardStageTimer(startDashboardStageTimer());
  return {
    stageId,
    stageName,
    outcome: 'atlandi',
    errors: [],
    warnings: [],
    detail,
    ...timing
  };
}

export function createStageExecution(
  stageId: DashboardStage,
  stageName: string,
  outcome: DashboardStageExecutionOutcome,
  detail: string,
  errors: DashboardStageExecution['errors'] = [],
  warnings: DashboardStageExecution['warnings'] = []
): DashboardStageExecution {
  const timing = endDashboardStageTimer(startDashboardStageTimer());
  return {
    stageId,
    stageName,
    outcome,
    errors,
    warnings,
    detail,
    ...timing
  };
}

export function replaceStageExecution(
  context: DashboardPipelineContext,
  execution: DashboardStageExecution
): void {
  const index = context.stageExecutions.findIndex(
    (item) => item.stageId === execution.stageId
  );
  if (index >= 0) {
    context.stageExecutions[index] = execution;
  } else {
    context.stageExecutions.push(execution);
  }
}

export function mutateDashboardModel(
  dashboardModel: DashboardModel,
  status: DashboardExecutionStatus,
  lastStage: DashboardStage
): void {
  const mutable = dashboardModel as {
    status: DashboardExecutionStatus;
    lastStage: DashboardStage;
  };
  mutable.status = status;
  mutable.lastStage = lastStage;
}

/**
 * Bag’deki foundation alanlarını DashboardModel’e yansıtır.
 */
export function syncDashboardModelFromBag(
  dashboardModel: DashboardModel,
  context: DashboardPipelineContext
): void {
  const bag = context.bag;
  const mutable = dashboardModel as {
    metadata: DashboardModel['metadata'];
    sections: DashboardModel['sections'];
    widgets: DashboardModel['widgets'];
    kpis: DashboardModel['kpis'];
    filters: DashboardModel['filters'];
    layout: DashboardModel['layout'];
    theme: DashboardModel['theme'];
    navigation: DashboardModel['navigation'];
  };

  if (bag.dashboardModel?.metadata) {
    mutable.metadata = bag.dashboardModel.metadata;
  }
  if (bag.sections) {
    mutable.sections = bag.sections;
  }
  if (bag.widgets) {
    mutable.widgets = bag.widgets;
  }
  if (bag.kpis) {
    mutable.kpis = bag.kpis;
  }
  if (bag.filters) {
    mutable.filters = bag.filters;
  }
  if (bag.layout) {
    mutable.layout = bag.layout;
  }
  if (bag.theme) {
    mutable.theme = bag.theme;
  }
  if (bag.navigation) {
    mutable.navigation = bag.navigation;
  }
}

export function buildDashboardExecutionTelemetry(
  context: DashboardPipelineContext,
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  counts: {
    dashboardModelPartCount: number;
    widgetCount: number;
    kpiCount: number;
    summarySectionCount: number;
  }
): DashboardExecutionTelemetry {
  const stageDurationsMs: Partial<Record<DashboardStage, number>> = {};
  const stageOutcomes: Partial<
    Record<DashboardStage, DashboardStageExecutionOutcome>
  > = {};
  let stagesSucceeded = 0;
  let stagesFailed = 0;
  let stagesSkipped = 0;
  let stagesNotImplemented = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (const execution of context.stageExecutions) {
    stageDurationsMs[execution.stageId] = execution.durationMs;
    stageOutcomes[execution.stageId] = execution.outcome;
    if (execution.outcome === 'basarili') {
      stagesSucceeded += 1;
    } else if (execution.outcome === 'basarisiz') {
      stagesFailed += 1;
    } else if (execution.outcome === 'atlandi') {
      stagesSkipped += 1;
    } else if (execution.outcome === 'not-implemented') {
      stagesNotImplemented += 1;
    }
    warningCount += execution.warnings.length;
    errorCount += execution.errors.length;
  }

  const summary: DashboardPipelineExecutionSummary = {
    stagesExecuted: context.stageExecutions.length,
    stagesSucceeded,
    stagesFailed,
    stagesSkipped,
    stagesNotImplemented,
    success: stagesFailed === 0 && stagesNotImplemented === 0,
    warningCount,
    errorCount,
    dashboardModelPartCount: counts.dashboardModelPartCount,
    widgetCount: counts.widgetCount,
    kpiCount: counts.kpiCount,
    summarySectionCount: counts.summarySectionCount
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

export { nowMs };
