/**
 * İSTEBUL Business Export Engine — integration helpers (PR-106F).
 */

import type { DashboardModel } from '../../../dashboard/models/DashboardModel';
import type { DocumentModel } from '../../../document/models/DocumentModel';
import { EXPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ExportEngineConstants';
import { EXPORT_ENGINE_SCHEMA_VERSION } from '../../constants/ExportEngineConstants';
import type { ExportContext } from '../../models/ExportContext';
import type { ExportMetadata } from '../../models/ExportMetadata';
import type { ExportRequest } from '../../models/ExportRequest';
import type { ExportResult } from '../../models/ExportResult';
import type { ExportStage, ExportStatus } from '../../models/ExportStatus';
import type { ExportPipelineContext } from '../../pipeline/runtime/ExportPipelineContext';
import type {
  ExportStageExecution,
  ExportStageExecutionOutcome
} from '../../pipeline/runtime/ExportStageExecution';
import {
  endExportStageTimer,
  nowMs,
  startExportStageTimer
} from '../../pipeline/runtime/ExportTiming';
import type { ExportExecutionContext } from './ExportExecutionContext';
import type {
  ExportExecutionTelemetry,
  ExportPipelineExecutionSummary
} from './ExportExecutionResult';

/**
 * Execution bağlamından ExportContext üretir.
 */
export function resolveExportContext(
  execution: ExportExecutionContext
): ExportContext {
  if (execution.exportContext) {
    return {
      ...execution.exportContext,
      locale:
        execution.locale ??
        execution.exportContext.locale ??
        EXPORT_ENGINE_DEFAULT_LOCALE,
      documentModel:
        execution.documentModel ?? execution.exportContext.documentModel,
      dashboardModel:
        execution.dashboardModel ?? execution.exportContext.dashboardModel,
      currentStage: 'export-dogrulama',
      status: 'bekliyor'
    };
  }

  const documentModel = execution.documentModel;
  const dashboardModel = execution.dashboardModel;

  if (!documentModel && !dashboardModel) {
    throw new Error(
      'ExportExecutionContext.documentModel, dashboardModel veya exportContext zorunludur.'
    );
  }

  return {
    exportJobId: execution.request.id,
    locale:
      execution.locale ??
      execution.request.locale ??
      EXPORT_ENGINE_DEFAULT_LOCALE,
    currentStage: 'export-dogrulama',
    status: 'bekliyor',
    documentModel,
    dashboardModel
  };
}

/**
 * İstek kimliklerini Document / Dashboard kaynaklarından tamamlar.
 */
export function ensureRequestIds(
  request: ExportRequest,
  sources: Readonly<{
    documentModel?: DocumentModel;
    dashboardModel?: DashboardModel;
  }>
): ExportRequest {
  let next = request;
  const { documentModel, dashboardModel } = sources;

  if (!request.documentModelId || request.documentModelId.length === 0) {
    if (documentModel?.id) {
      next = { ...next, documentModelId: documentModel.id };
    }
  }
  if (!request.dashboardModelId || request.dashboardModelId.length === 0) {
    if (dashboardModel?.id) {
      next = { ...next, dashboardModelId: dashboardModel.id };
    }
  }
  if (!request.reportDnaId || request.reportDnaId.length === 0) {
    if (documentModel?.metadata?.reportDnaId) {
      next = { ...next, reportDnaId: documentModel.metadata.reportDnaId };
    } else if (dashboardModel?.metadata?.reportDnaId) {
      next = { ...next, reportDnaId: dashboardModel.metadata.reportDnaId };
    }
  }
  return next;
}

export function createSkippedStageExecution(
  stageId: ExportStage,
  stageName: string,
  detail: string
): ExportStageExecution {
  const timing = endExportStageTimer(startExportStageTimer());
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
  stageId: ExportStage,
  stageName: string,
  outcome: ExportStageExecutionOutcome,
  detail: string,
  errors: ExportStageExecution['errors'] = [],
  warnings: ExportStageExecution['warnings'] = []
): ExportStageExecution {
  const timing = endExportStageTimer(startExportStageTimer());
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
  context: ExportPipelineContext,
  execution: ExportStageExecution
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

/**
 * Bag ve stage kayıtlarından foundation ExportResult üretir.
 */
export function buildFinalExportResult(
  context: ExportPipelineContext,
  lastStage: ExportStage
): ExportResult {
  const hasHardFailure = context.stageExecutions.some(
    (execution) => execution.outcome === 'basarisiz'
  );
  const hasNotImplemented = context.stageExecutions.some(
    (execution) => execution.outcome === 'not-implemented'
  );

  let status: ExportStatus;
  if (hasHardFailure || hasNotImplemented) {
    status = 'basarisiz';
  } else {
    status = 'basarili';
  }

  const now = new Date().toISOString();
  const bag = context.bag;
  const exportModel = bag.exportModel;
  const formatIds = Object.freeze([
    ...(exportModel?.formatIds ?? context.request.formatIds)
  ]);

  const metadata: ExportMetadata = {
    id: context.request.id,
    title: bag.summary?.headline ?? 'Export',
    locale: context.exportContext.locale,
    createdAt: now,
    version: EXPORT_ENGINE_SCHEMA_VERSION,
    formatIds,
    documentModelId:
      exportModel?.documentModelId ??
      context.request.documentModelId ??
      context.exportContext.documentModel?.id,
    dashboardModelId:
      exportModel?.dashboardModelId ??
      context.request.dashboardModelId ??
      context.exportContext.dashboardModel?.id,
    reportDnaId: exportModel?.reportDnaId ?? context.request.reportDnaId
  };

  return {
    requestId: context.request.id,
    status,
    lastStage,
    metadata,
    artifacts: Object.freeze([]),
    summary: bag.summary ?? {
      headline: 'Export',
      artifactCount: 0,
      formatLabels: Object.freeze([]),
      warnings: Object.freeze([])
    },
    completedAt: now
  };
}

/**
 * Bag'deki foundation alanlarını ExportResult'a yansıtır.
 */
export function syncExportResultFromBag(
  exportResult: ExportResult,
  context: ExportPipelineContext
): void {
  const bag = context.bag;
  const mutable = exportResult as {
    status: ExportStatus;
    lastStage: ExportStage;
    metadata: ExportMetadata;
    summary: ExportResult['summary'];
    artifacts: ExportResult['artifacts'];
  };

  if (bag.exportResult) {
    mutable.status = bag.exportResult.status;
    mutable.lastStage = bag.exportResult.lastStage;
  }
  if (bag.summary) {
    mutable.summary = bag.summary;
  }
  if (bag.format) {
    mutable.metadata = {
      ...mutable.metadata,
      formatIds: Object.freeze(
        bag.format.map((item) => item.id)
      ) as ExportMetadata['formatIds']
    };
  }
}

export function buildExportExecutionTelemetry(
  context: ExportPipelineContext,
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  counts: {
    exportModelPartCount: number;
    renderPartCount: number;
    formatRepresentationCount: number;
    summarySectionCount: number;
  }
): ExportExecutionTelemetry {
  const stageDurationsMs: Partial<Record<ExportStage, number>> = {};
  const stageOutcomes: Partial<
    Record<ExportStage, ExportStageExecutionOutcome>
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

  const summary: ExportPipelineExecutionSummary = {
    stagesExecuted: context.stageExecutions.length,
    stagesSucceeded,
    stagesFailed,
    stagesSkipped,
    stagesNotImplemented,
    success: stagesFailed === 0 && stagesNotImplemented === 0,
    warningCount,
    errorCount,
    exportModelPartCount: counts.exportModelPartCount,
    renderPartCount: counts.renderPartCount,
    formatRepresentationCount: counts.formatRepresentationCount,
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
