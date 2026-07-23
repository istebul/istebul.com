/**
 * İSTEBUL Business Report Engine — integration helpers (PR-104F).
 */

import { REPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ReportEngineConstants';
import type { DecisionResult } from '../../../decision/models/DecisionResult';
import type { ReportContext } from '../../models/ReportContext';
import type { ReportModel } from '../../models/ReportModel';
import type { ReportRequest } from '../../models/ReportRequest';
import type {
  ReportExecutionStatus,
  ReportStage
} from '../../models/ReportStage';
import type {
  ReportStageExecution,
  ReportStageExecutionOutcome
} from '../../pipeline/runtime/ReportStageExecution';
import type { ReportPipelineContext } from '../../pipeline/runtime/ReportPipelineContext';
import {
  endReportStageTimer,
  nowMs,
  startReportStageTimer
} from '../../pipeline/runtime/ReportTiming';
import type { ReportExecutionContext } from './ReportExecutionContext';
import type {
  ReportExecutionTelemetry,
  ReportPipelineExecutionSummary
} from './ReportExecutionResult';

/**
 * Execution bağlamından ReportContext üretir.
 */
export function resolveReportContext(
  execution: ReportExecutionContext
): ReportContext {
  if (execution.reportContext) {
    return {
      ...execution.reportContext,
      locale:
        execution.locale ??
        execution.reportContext.locale ??
        REPORT_ENGINE_DEFAULT_LOCALE,
      reportDnaId:
        execution.request.reportId || execution.reportContext.reportDnaId,
      currentStage: 'karar-dogrulama',
      status: 'bekliyor'
    };
  }

  const decisionResult = execution.decisionResult;
  if (!decisionResult || typeof decisionResult !== 'object') {
    throw new Error(
      'ReportExecutionContext.decisionResult veya reportContext zorunludur.'
    );
  }

  return {
    reportJobId: execution.request.id,
    decisionResult,
    reportDnaId: execution.request.reportId,
    locale:
      execution.locale ??
      execution.request.locale ??
      REPORT_ENGINE_DEFAULT_LOCALE,
    currentStage: 'karar-dogrulama',
    status: 'bekliyor'
  };
}

export function ensureRequestIds(
  request: ReportRequest,
  decisionResult: DecisionResult
): ReportRequest {
  let next = request;
  if (!request.decisionRequestId || request.decisionRequestId.length === 0) {
    next = { ...next, decisionRequestId: decisionResult.requestId };
  }
  if (!request.datasetId || request.datasetId.length === 0) {
    next = { ...next, datasetId: decisionResult.datasetId };
  }
  if (!request.reportId || request.reportId.length === 0) {
    next = { ...next, reportId: `report-${decisionResult.requestId}` };
  }
  return next;
}

export function createSkippedStageExecution(
  stageId: ReportStage,
  stageName: string,
  detail: string
): ReportStageExecution {
  const timing = endReportStageTimer(startReportStageTimer());
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
  stageId: ReportStage,
  stageName: string,
  outcome: ReportStageExecutionOutcome,
  detail: string,
  errors: ReportStageExecution['errors'] = [],
  warnings: ReportStageExecution['warnings'] = []
): ReportStageExecution {
  const timing = endReportStageTimer(startReportStageTimer());
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
  context: ReportPipelineContext,
  execution: ReportStageExecution
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

export function mutateReportModel(
  reportModel: ReportModel,
  status: ReportExecutionStatus,
  lastStage: ReportStage
): void {
  const mutable = reportModel as {
    status: ReportExecutionStatus;
    lastStage: ReportStage;
  };
  mutable.status = status;
  mutable.lastStage = lastStage;
}

export function syncReportModelFromBag(
  reportModel: ReportModel,
  context: ReportPipelineContext
): void {
  const bag = context.bag;
  const mutable = reportModel as {
    executiveSummary: ReportModel['executiveSummary'];
    sections: ReportModel['sections'];
    findings: ReportModel['findings'];
    recommendations: ReportModel['recommendations'];
    appendices: ReportModel['appendices'];
    references: ReportModel['references'];
    review?: ReportModel['review'];
    metadata: ReportModel['metadata'];
  };

  if (bag.executiveSummary) {
    mutable.executiveSummary = bag.executiveSummary;
  }
  if (bag.sections) {
    mutable.sections = bag.sections;
  }
  if (bag.findings) {
    mutable.findings = bag.findings;
  }
  if (bag.recommendations) {
    mutable.recommendations = bag.recommendations;
  }
  if (bag.appendices) {
    mutable.appendices = bag.appendices;
  }
  if (bag.references) {
    mutable.references = bag.references;
  }
  if (bag.review) {
    mutable.review = bag.review;
  }
  if (bag.reportModel?.metadata) {
    mutable.metadata = bag.reportModel.metadata;
  }
}

export function buildReportExecutionTelemetry(
  context: ReportPipelineContext,
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  counts: {
    reportModelPartCount: number;
    narrativeCount: number;
    sectionCount: number;
    summarySectionCount: number;
  }
): ReportExecutionTelemetry {
  const stageDurationsMs: Partial<Record<ReportStage, number>> = {};
  const stageOutcomes: Partial<
    Record<ReportStage, ReportStageExecutionOutcome>
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

  const summary: ReportPipelineExecutionSummary = {
    stagesExecuted: context.stageExecutions.length,
    stagesSucceeded,
    stagesFailed,
    stagesSkipped,
    stagesNotImplemented,
    success: stagesFailed === 0 && stagesNotImplemented === 0,
    warningCount,
    errorCount,
    reportModelPartCount: counts.reportModelPartCount,
    narrativeCount: counts.narrativeCount,
    sectionCount: counts.sectionCount,
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
