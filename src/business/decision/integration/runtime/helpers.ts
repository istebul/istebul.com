/**
 * İSTEBUL Business Decision Engine — integration helpers (PR-103F).
 */

import { DECISION_ENGINE_DEFAULT_LOCALE } from '../../constants/DecisionEngineConstants';
import type { AnalysisResult } from '../../../analysis/models/AnalysisResult';
import type { DecisionContext } from '../../models/DecisionContext';
import type { DecisionRequest } from '../../models/DecisionRequest';
import type { DecisionStage } from '../../models/DecisionStage';
import type {
  DecisionStageExecution,
  DecisionStageExecutionOutcome
} from '../../pipeline/runtime/DecisionStageExecution';
import type { DecisionPipelineContext } from '../../pipeline/runtime/DecisionPipelineContext';
import {
  endDecisionStageTimer,
  nowMs,
  startDecisionStageTimer
} from '../../pipeline/runtime/DecisionTiming';
import type { DecisionExecutionContext } from './DecisionExecutionContext';
import type {
  DecisionExecutionTelemetry,
  DecisionPipelineExecutionSummary
} from './DecisionExecutionResult';

/**
 * Execution bağlamından DecisionContext üretir.
 */
export function resolveDecisionContext(
  execution: DecisionExecutionContext
): DecisionContext {
  if (execution.decisionContext) {
    return {
      ...execution.decisionContext,
      locale:
        execution.locale ??
        execution.decisionContext.locale ??
        DECISION_ENGINE_DEFAULT_LOCALE,
      reportId: execution.request.reportId ?? execution.decisionContext.reportId,
      strategyIds:
        execution.request.strategyIds ?? execution.decisionContext.strategyIds,
      currentStage: 'analiz-sonuc-dogrulama',
      status: 'bekliyor'
    };
  }

  const analysisResult = execution.analysisResult;
  if (!analysisResult || typeof analysisResult !== 'object') {
    throw new Error(
      'DecisionExecutionContext.analysisResult veya decisionContext zorunludur.'
    );
  }

  return {
    decisionId: execution.request.id,
    analysisResult,
    locale:
      execution.locale ??
      execution.request.locale ??
      DECISION_ENGINE_DEFAULT_LOCALE,
    reportId: execution.request.reportId,
    currentStage: 'analiz-sonuc-dogrulama',
    status: 'bekliyor',
    strategyIds: execution.request.strategyIds
  };
}

export function ensureRequestIds(
  request: DecisionRequest,
  analysisResult: AnalysisResult
): DecisionRequest {
  let next = request;
  if (!request.analysisRequestId || request.analysisRequestId.length === 0) {
    next = { ...next, analysisRequestId: analysisResult.requestId };
  }
  if (!request.datasetId || request.datasetId.length === 0) {
    next = { ...next, datasetId: analysisResult.datasetId };
  }
  return next;
}

export function createSkippedStageExecution(
  stageId: DecisionStage,
  stageName: string,
  detail: string
): DecisionStageExecution {
  const timing = endDecisionStageTimer(startDecisionStageTimer());
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
  stageId: DecisionStage,
  stageName: string,
  outcome: DecisionStageExecutionOutcome,
  detail: string,
  errors: DecisionStageExecution['errors'] = [],
  warnings: DecisionStageExecution['warnings'] = []
): DecisionStageExecution {
  const timing = endDecisionStageTimer(startDecisionStageTimer());
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
  context: DecisionPipelineContext,
  execution: DecisionStageExecution
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

export function buildDecisionExecutionTelemetry(
  context: DecisionPipelineContext,
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  counts: {
    policyCount: number;
    recommendationCount: number;
    actionPlanCount: number;
    actionCount: number;
    summarySectionCount: number;
  }
): DecisionExecutionTelemetry {
  const stageDurationsMs: Partial<Record<DecisionStage, number>> = {};
  const stageOutcomes: Partial<
    Record<DecisionStage, DecisionStageExecutionOutcome>
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

  const summary: DecisionPipelineExecutionSummary = {
    stagesExecuted: context.stageExecutions.length,
    stagesSucceeded,
    stagesFailed,
    stagesSkipped,
    stagesNotImplemented,
    success: stagesFailed === 0 && stagesNotImplemented === 0,
    warningCount,
    errorCount,
    policyCount: counts.policyCount,
    recommendationCount: counts.recommendationCount,
    actionPlanCount: counts.actionPlanCount,
    actionCount: counts.actionCount,
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
