/**
 * İSTEBUL Business Analysis Engine — integration helpers (PR-102F).
 */

import { ANALYSIS_ENGINE_DEFAULT_LOCALE } from '../../constants/AnalysisEngineConstants';
import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { AnalysisContext } from '../../models/AnalysisContext';
import type { AnalysisRequest } from '../../models/AnalysisRequest';
import type { AnalysisStage } from '../../models/AnalysisStage';
import type {
  AnalysisStageExecution,
  AnalysisStageExecutionOutcome
} from '../../pipeline/runtime/AnalysisStageExecution';
import type { AnalysisPipelineContext } from '../../pipeline/runtime/AnalysisPipelineContext';
import {
  endAnalysisStageTimer,
  nowMs,
  startAnalysisStageTimer
} from '../../pipeline/runtime/AnalysisTiming';
import type { AnalysisExecutionContext } from './AnalysisExecutionContext';
import type {
  AnalysisExecutionTelemetry,
  AnalysisPipelineExecutionSummary
} from './AnalysisExecutionResult';

/**
 * Execution bağlamından AnalysisContext üretir.
 */
export function resolveAnalysisContext(
  execution: AnalysisExecutionContext
): AnalysisContext {
  if (execution.analysisContext) {
    return {
      ...execution.analysisContext,
      locale:
        execution.locale ??
        execution.analysisContext.locale ??
        ANALYSIS_ENGINE_DEFAULT_LOCALE,
      kpiIds:
        execution.kpiIds ??
        execution.request.kpiIds ??
        execution.analysisContext.kpiIds,
      ruleIds:
        execution.ruleIds ??
        execution.request.ruleIds ??
        execution.analysisContext.ruleIds,
      reportId: execution.request.reportId ?? execution.analysisContext.reportId,
      currentStage: 'dataset-dogrulama',
      status: 'bekliyor'
    };
  }

  const dataset = execution.dataset;
  if (!dataset || typeof dataset !== 'object') {
    throw new Error(
      'AnalysisExecutionContext.dataset veya analysisContext zorunludur.'
    );
  }

  return {
    analysisId: execution.request.id,
    dataset,
    locale:
      execution.locale ??
      execution.request.locale ??
      ANALYSIS_ENGINE_DEFAULT_LOCALE,
    reportId: execution.request.reportId,
    currentStage: 'dataset-dogrulama',
    status: 'bekliyor',
    kpiIds: execution.kpiIds ?? execution.request.kpiIds,
    ruleIds: execution.ruleIds ?? execution.request.ruleIds
  };
}

export function ensureRequestDatasetId(
  request: AnalysisRequest,
  dataset: BusinessDataset
): AnalysisRequest {
  if (request.datasetId && request.datasetId.length > 0) {
    return request;
  }
  return { ...request, datasetId: dataset.id };
}

export function createSkippedStageExecution(
  stageId: AnalysisStage,
  stageName: string,
  detail: string
): AnalysisStageExecution {
  const timing = endAnalysisStageTimer(startAnalysisStageTimer());
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
  stageId: AnalysisStage,
  stageName: string,
  outcome: AnalysisStageExecutionOutcome,
  detail: string,
  errors: AnalysisStageExecution['errors'] = [],
  warnings: AnalysisStageExecution['warnings'] = []
): AnalysisStageExecution {
  const timing = endAnalysisStageTimer(startAnalysisStageTimer());
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
  context: AnalysisPipelineContext,
  execution: AnalysisStageExecution
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

export function buildAnalysisExecutionTelemetry(
  context: AnalysisPipelineContext,
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  counts: {
    kpiCount: number;
    ruleCount: number;
    findingCount: number;
    summarySectionCount: number;
  }
): AnalysisExecutionTelemetry {
  const stageDurationsMs: Partial<Record<AnalysisStage, number>> = {};
  const stageOutcomes: Partial<
    Record<AnalysisStage, AnalysisStageExecutionOutcome>
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

  const summary: AnalysisPipelineExecutionSummary = {
    stagesExecuted: context.stageExecutions.length,
    stagesSucceeded,
    stagesFailed,
    stagesSkipped,
    stagesNotImplemented,
    success: stagesFailed === 0 && stagesNotImplemented === 0,
    warningCount,
    errorCount,
    kpiCount: counts.kpiCount,
    ruleCount: counts.ruleCount,
    findingCount: counts.findingCount,
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
