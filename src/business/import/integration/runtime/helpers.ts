/**
 * İSTEBUL Business Import Engine — integration runtime yardımcıları (PR-101J).
 */

import { getImportAdapterById } from '../../adapters/AdapterRegistry';
import { IMPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ImportEngineConstants';
import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import type { StageExecution, StageExecutionOutcome } from '../../pipeline/runtime/StageExecution';
import type { ImportContext } from '../../types/ImportContext';
import type { ImportError } from '../../types/ImportError';
import type { ImportRequest } from '../../types/ImportRequest';
import type { ImportStage } from '../../types/ImportStage';
import type { ImportTarget } from '../../readers/runtime/ImportTarget';
import type { ImportExecutionContext } from './ImportExecutionContext';
import type {
  ImportExecutionTelemetry,
  ImportPipelineSummary
} from './ImportExecutionResult';
import { endStageTimer, nowMs, startStageTimer } from '../../pipeline/runtime/timing';

export function createPipelineContextFromExecution(
  execution: ImportExecutionContext
): PipelineContext {
  const locale =
    execution.locale ??
    execution.importContext?.locale ??
    execution.request.locale ??
    IMPORT_ENGINE_DEFAULT_LOCALE;

  const importContext: ImportContext = execution.importContext ?? {
    importId: execution.request.id,
    source: execution.request.source,
    locale,
    currentStage: 'adapter-secimi',
    status: 'bekliyor',
    targetReportId: execution.request.targetReportId,
    entityHints: execution.entityHints ?? execution.request.entityHints,
    metadata: buildImportMetadata(execution)
  };

  if (!importContext.metadata) {
    importContext.metadata = buildImportMetadata(execution);
  } else {
    importContext.metadata = {
      ...importContext.metadata,
      ...buildImportMetadata(execution)
    };
  }

  return {
    request: execution.request,
    importContext,
    stageExecutions: [],
    bag: { ...(execution.initialBag ?? {}) },
    startedAt: new Date().toISOString(),
    startedMark: nowMs()
  };
}

function buildImportMetadata(
  execution: ImportExecutionContext
): Record<string, string> | undefined {
  const meta: Record<string, string> = {};
  if (execution.csvContent) {
    meta.csvContent = execution.csvContent;
  }
  if (execution.excelWorkbook) {
    meta.excelWorkbook = JSON.stringify(execution.excelWorkbook);
  }
  if (execution.tenantId) {
    meta.tenantId = execution.tenantId;
  }
  return Object.keys(meta).length > 0 ? meta : undefined;
}

export function importTargetFromRequest(
  request: ImportRequest,
  tenantId?: string
): ImportTarget {
  const label = request.source.label ?? '';
  const lower = label.toLowerCase();
  let extension: string | undefined;
  if (lower.endsWith('.csv')) {
    extension = '.csv';
  } else if (lower.endsWith('.xlsx')) {
    extension = '.xlsx';
  } else if (lower.endsWith('.xls')) {
    extension = '.xls';
  }

  let mimeType: string | undefined;
  if (request.source.type === 'csv') {
    mimeType = 'text/csv';
  } else if (request.source.type === 'excel') {
    mimeType =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  return {
    sourceType: request.source.type,
    mimeType,
    extension,
    tenantId,
    label: request.source.label
  };
}

export interface StageRunResult {
  outcome: StageExecutionOutcome;
  errors: ImportError[];
  warnings: ImportError[];
  detail?: string;
  haltPipeline?: boolean;
}

export async function runTimedStage(
  stageId: ImportStage,
  stageName: string,
  context: PipelineContext,
  runner: () => Promise<StageRunResult> | StageRunResult
): Promise<StageRunResult> {
  const timer = startStageTimer();
  context.importContext.currentStage = stageId;
  const result = await runner();
  const { endedAt, durationMs } = endStageTimer(timer);

  const execution: StageExecution = {
    stageId,
    stageName,
    outcome: result.outcome,
    startedAt: timer.startedAt,
    endedAt,
    durationMs,
    errors: Object.freeze([...result.errors]),
    warnings: Object.freeze([...result.warnings]),
    detail: result.detail
  };
  context.stageExecutions.push(execution);
  return result;
}

export function buildExecutionTelemetry(
  context: PipelineContext,
  startedAt: string,
  endedAt: string,
  totalDurationMs: number
): ImportExecutionTelemetry {
  const stageDurationsMs: Partial<Record<ImportStage, number>> = {};
  const stageOutcomes: Partial<Record<ImportStage, StageExecutionOutcome>> = {};
  let stagesSucceeded = 0;
  let stagesFailed = 0;
  let stagesSkipped = 0;
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
    }
    warningCount += execution.warnings.length;
    errorCount += execution.errors.length;
  }

  const hasFailure = stagesFailed > 0;
  const datasetProduced = Boolean(
    context.bag.datasetBuildResult &&
      typeof context.bag.datasetBuildResult === 'object' &&
      (context.bag.datasetBuildResult as { dataset?: unknown }).dataset
  );

  const summary: ImportPipelineSummary = {
    stagesExecuted: context.stageExecutions.length,
    stagesSucceeded,
    stagesFailed,
    stagesSkipped,
    success: !hasFailure,
    datasetProduced,
    warningCount,
    errorCount
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

export function adapterLabelForSourceType(sourceType: string): string {
  const adapter = getImportAdapterById(
    sourceType as ImportRequest['source']['type']
  );
  return adapter?.name ?? sourceType;
}
