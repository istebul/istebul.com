/**
 * İSTEBUL Business Import Engine — Pipeline Runtime Orchestrator (PR-101A).
 *
 * Foundation `IImportPipeline` sözleşmesini uygular.
 * Gerçek CSV/Excel okuma yoktur.
 */

import type { IImportPipeline } from '../../ports/IImportPipeline';
import {
  IMPORT_PIPELINE_STAGES,
  type ImportPipelineStageDefinition
} from '../ImportPipeline';
import { IMPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ImportEngineConstants';
import type { ImportContext } from '../../types/ImportContext';
import type { ImportError } from '../../types/ImportError';
import type { ImportRequest } from '../../types/ImportRequest';
import type { ImportResult } from '../../types/ImportResult';
import type { ImportStage } from '../../types/ImportStage';
import {
  createImportError,
  IMPORT_RUNTIME_ERROR_CODES
} from './errors';
import type { PipelineContext } from './PipelineContext';
import type { PipelineResult } from './PipelineResult';
import type { StageExecution } from './StageExecution';
import { resolveStageHandler } from './stageHandlers';
import { endStageTimer, nowMs, startStageTimer } from './timing';

function createInitialImportContext(request: ImportRequest): ImportContext {
  return {
    importId: request.id,
    source: request.source,
    locale: request.locale ?? IMPORT_ENGINE_DEFAULT_LOCALE,
    currentStage: 'adapter-secimi',
    status: 'bekliyor',
    targetReportId: request.targetReportId,
    entityHints: request.entityHints,
    metadata: undefined
  };
}

function createPipelineContext(request: ImportRequest): PipelineContext {
  return {
    request,
    importContext: createInitialImportContext(request),
    stageExecutions: [],
    bag: {},
    startedAt: new Date().toISOString(),
    startedMark: nowMs()
  };
}

function validateRequest(request: ImportRequest): ImportError | undefined {
  if (!request?.id || typeof request.id !== 'string') {
    return createImportError(
      IMPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Import isteği kimliği geçersiz.',
      { detail: 'ImportRequest.id is required.', recoverable: false }
    );
  }
  if (!request.source || typeof request.source !== 'object') {
    return createImportError(
      IMPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Import kaynağı tanımlı değil.',
      { detail: 'ImportRequest.source is required.', recoverable: false }
    );
  }
  return undefined;
}

function buildImportResult(
  context: PipelineContext,
  lastStage: ImportStage
): ImportResult {
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];

  for (const execution of context.stageExecutions) {
    errors.push(...execution.errors);
    warnings.push(...execution.warnings);
  }

  const hasHardFailure = context.stageExecutions.some(
    (e) => e.outcome === 'basarisiz'
  );
  const hasNotImplemented = context.stageExecutions.some(
    (e) => e.outcome === 'not-implemented'
  );

  let status: ImportResult['status'];
  if (hasHardFailure) {
    status = 'basarisiz';
  } else if (hasNotImplemented) {
    // Orchestrator çalıştı; dataset yok → başarısız (tam import değil)
    status = 'basarisiz';
  } else {
    status = 'basarili';
  }

  return {
    requestId: context.request.id,
    status,
    lastStage,
    dataset: undefined,
    errors,
    warnings,
    completedAt: new Date().toISOString()
  };
}

/**
 * Import Pipeline Runtime — sıralı aşama orchestrator’ı.
 */
export class ImportPipelineRuntime implements IImportPipeline {
  readonly stages: readonly ImportPipelineStageDefinition[] =
    IMPORT_PIPELINE_STAGES;

  /**
   * Foundation `IImportPipeline.run` — ImportResult döner.
   */
  async run(request: ImportRequest): Promise<ImportResult> {
    const detailed = await this.runWithDetails(request);
    return detailed.importResult;
  }

  /**
   * Detaylı runtime sonucu — aşama süreleri ve yürütme kayıtları dahil.
   */
  async runWithDetails(request: ImportRequest): Promise<PipelineResult> {
    const context = createPipelineContext(request);
    context.importContext.status = 'suruyor';

    const validationError = validateRequest(request);
    if (validationError) {
      const timer = startStageTimer();
      const { endedAt, durationMs } = endStageTimer(timer);
      const stageDef = this.stages[0];
      const execution: StageExecution = {
        stageId: stageDef.id,
        stageName: stageDef.name,
        outcome: 'basarisiz',
        startedAt: timer.startedAt,
        endedAt,
        durationMs,
        errors: [validationError],
        warnings: [],
        detail: 'Request validation failed before stage loop.'
      };
      context.stageExecutions.push(execution);
      context.importContext.status = 'basarisiz';
      context.importContext.currentStage = stageDef.id;

      const importResult = buildImportResult(context, stageDef.id);
      return {
        importResult,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs: Math.max(
          0,
          Math.round(nowMs() - context.startedMark)
        )
      };
    }

    let halt = false;

    for (const definition of this.stages) {
      if (halt && definition.id !== 'tamamlandi') {
        const timer = startStageTimer();
        const { endedAt, durationMs } = endStageTimer(timer);
        context.stageExecutions.push({
          stageId: definition.id,
          stageName: definition.name,
          outcome: 'atlandi',
          startedAt: timer.startedAt,
          endedAt,
          durationMs,
          errors: [],
          warnings: [],
          detail: 'Skipped due to prior halt.'
        });
        continue;
      }

      context.importContext.currentStage = definition.id;
      const timer = startStageTimer();

      let execution: StageExecution;
      try {
        const handler = resolveStageHandler(definition.id);
        const result = await handler(context, definition);
        const { endedAt, durationMs } = endStageTimer(timer);
        execution = {
          stageId: definition.id,
          stageName: definition.name,
          outcome: result.outcome,
          startedAt: timer.startedAt,
          endedAt,
          durationMs,
          errors: result.errors,
          warnings: result.warnings,
          detail: result.detail
        };
        if (result.haltPipeline) {
          halt = true;
        }
      } catch (err) {
        const { endedAt, durationMs } = endStageTimer(timer);
        const message =
          err instanceof Error ? err.message : 'Beklenmeyen pipeline hatası.';
        execution = {
          stageId: definition.id,
          stageName: definition.name,
          outcome: 'basarisiz',
          startedAt: timer.startedAt,
          endedAt,
          durationMs,
          errors: [
            createImportError(
              IMPORT_RUNTIME_ERROR_CODES.UNEXPECTED,
              'Aşama yürütülürken beklenmeyen hata oluştu.',
              {
                stage: definition.id,
                detail: message,
                recoverable: false
              }
            )
          ],
          warnings: [],
          detail: message
        };
        halt = true;
      }

      context.stageExecutions.push(execution);
    }

    const lastStage =
      context.stageExecutions[context.stageExecutions.length - 1]?.stageId ??
      'tamamlandi';

    const importResult = buildImportResult(context, lastStage);
    context.importContext.status = importResult.status;
    context.importContext.currentStage = lastStage;

    return {
      importResult,
      context,
      stageExecutions: context.stageExecutions,
      totalDurationMs: Math.max(0, Math.round(nowMs() - context.startedMark))
    };
  }
}

/**
 * Varsayılan runtime örneği üretir.
 */
export function createImportPipelineRuntime(): ImportPipelineRuntime {
  return new ImportPipelineRuntime();
}

export default ImportPipelineRuntime;
