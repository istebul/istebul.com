/**
 * İSTEBUL Business Analysis Engine — Pipeline Runtime Orchestrator (PR-102A).
 *
 * Dataset Validation gerçek çalışır.
 * KPI / Rule / Finding / Summary aşamaları bu PR'da placeholder olarak kalır.
 */

import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { ValidationResult } from '../../../dataset/validators/ValidationResult';
import { ANALYSIS_ENGINE_DEFAULT_LOCALE } from '../../constants/AnalysisEngineConstants';
import type { AnalysisContext } from '../../models/AnalysisContext';
import type { AnalysisRequest } from '../../models/AnalysisRequest';
import type { AnalysisResult } from '../../models/AnalysisResult';
import type { AnalysisStage, AnalysisStatus } from '../../models/AnalysisStage';
import type { IAnalysisPipeline } from '../../ports/IAnalysisPipeline';
import {
  ANALYSIS_PIPELINE_STAGES,
  type AnalysisPipelineStageDefinition
} from '../AnalysisPipeline';
import type {
  AnalysisPipelineContext,
  AnalysisPipelineBag
} from './AnalysisPipelineContext';
import type {
  AnalysisPipelineResult,
  AnalysisPipelineSummary,
  AnalysisPipelineTelemetry
} from './AnalysisPipelineResult';
import type {
  AnalysisRuntimeIssue,
  AnalysisStageExecution
} from './AnalysisStageExecution';
import {
  endAnalysisStageTimer,
  nowMs,
  startAnalysisStageTimer
} from './AnalysisTiming';

export const ANALYSIS_RUNTIME_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: 'INVALID_REQUEST',
  CONTEXT_NOT_AVAILABLE: 'CONTEXT_NOT_AVAILABLE',
  DATASET_ID_MISMATCH: 'DATASET_ID_MISMATCH',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  UNEXPECTED: 'UNEXPECTED'
} as const);

export type AnalysisRuntimeErrorCode =
  (typeof ANALYSIS_RUNTIME_ERROR_CODES)[keyof typeof ANALYSIS_RUNTIME_ERROR_CODES];

export type AnalysisContextResolver = (
  request: AnalysisRequest
) => Promise<AnalysisContext>;

export interface AnalysisPipelineRuntimeOptions {
  /** `run(request)` için context çözücü */
  contextResolver?: AnalysisContextResolver;
  /** Test / tek seferlik kullanım için hazır context */
  initialContext?: AnalysisContext;
}

function createIssue(
  code: string,
  message: string,
  options?: Readonly<{
    stage?: AnalysisStage;
    detail?: string;
    recoverable?: boolean;
  }>
): AnalysisRuntimeIssue {
  return {
    code,
    message,
    stage: options?.stage,
    detail: options?.detail,
    recoverable: options?.recoverable
  };
}

function createNotImplementedIssue(
  stage: AnalysisStage,
  stageName: string
): AnalysisRuntimeIssue {
  return createIssue(
    ANALYSIS_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
    `${stageName} aşaması henüz uygulanmadı.`,
    {
      stage,
      detail: `Stage '${stage}' is not implemented in Analysis Pipeline Runtime (PR-102A).`,
      recoverable: false
    }
  );
}

function createEmptyDataset(datasetId: string): BusinessDataset {
  const now = new Date().toISOString();
  return {
    id: datasetId || 'unknown-dataset',
    metadata: {
      id: datasetId || 'unknown-dataset',
      title: 'Unknown Dataset',
      locale: ANALYSIS_ENGINE_DEFAULT_LOCALE,
      createdAt: now
    },
    version: {
      schemaVersion: '1.0.0',
      revision: '1',
      effectiveAt: now
    },
    source: {
      type: 'json',
      label: 'runtime-fallback'
    },
    entities: [],
    relations: []
  };
}

function createFallbackAnalysisContext(request: AnalysisRequest): AnalysisContext {
  return {
    analysisId: request.id || 'unknown-analysis',
    dataset: createEmptyDataset(request.datasetId || 'unknown-dataset'),
    locale: request.locale ?? ANALYSIS_ENGINE_DEFAULT_LOCALE,
    reportId: request.reportId,
    currentStage: 'dataset-dogrulama',
    status: 'bekliyor',
    kpiIds: request.kpiIds,
    ruleIds: request.ruleIds,
    metadata: undefined
  };
}

function createPipelineContext(
  request: AnalysisRequest,
  analysisContext: AnalysisContext
): AnalysisPipelineContext {
  return {
    request,
    analysisContext,
    stageExecutions: [],
    bag: {},
    startedAt: new Date().toISOString(),
    startedMark: nowMs()
  };
}

function aggregateCounts(results: readonly ValidationResult[]): BusinessValidationResult['counts'] {
  let info = 0;
  let warning = 0;
  let error = 0;

  for (const result of results) {
    if (result.severity === 'info') {
      info += 1;
    } else if (result.severity === 'warning') {
      warning += 1;
    } else {
      error += 1;
    }
  }

  return { info, warning, error };
}

function validateDataset(
  dataset: BusinessDataset,
  request: AnalysisRequest
): {
  validation: BusinessValidationResult;
  warnings: AnalysisRuntimeIssue[];
  errors: AnalysisRuntimeIssue[];
} {
  const results: ValidationResult[] = [];

  const pushError = (code: string, message: string) => {
    results.push({ severity: 'error', code, message });
  };
  const pushWarning = (code: string, message: string) => {
    results.push({ severity: 'warning', code, message });
  };

  if (!dataset.id || typeof dataset.id !== 'string') {
    pushError('DATASET_ID_REQUIRED', 'Dataset.id zorunludur.');
  }
  if (dataset.id && request.datasetId && dataset.id !== request.datasetId) {
    pushError(
      ANALYSIS_RUNTIME_ERROR_CODES.DATASET_ID_MISMATCH,
      'Request.datasetId ile AnalysisContext.dataset.id eşleşmiyor.'
    );
  }
  if (!dataset.metadata || typeof dataset.metadata !== 'object') {
    pushError('DATASET_METADATA_REQUIRED', 'Dataset.metadata zorunludur.');
  }
  if (!dataset.version || typeof dataset.version !== 'object') {
    pushError('DATASET_VERSION_REQUIRED', 'Dataset.version zorunludur.');
  }
  if (!dataset.source || typeof dataset.source !== 'object') {
    pushError('DATASET_SOURCE_REQUIRED', 'Dataset.source zorunludur.');
  }
  if (!Array.isArray(dataset.entities)) {
    pushError('DATASET_ENTITIES_REQUIRED', 'Dataset.entities dizi olmalıdır.');
  }
  if (!Array.isArray(dataset.relations)) {
    pushError('DATASET_RELATIONS_REQUIRED', 'Dataset.relations dizi olmalıdır.');
  }

  for (const entity of dataset.entities ?? []) {
    if (!entity?.id || typeof entity.id !== 'string') {
      pushError('ENTITY_ID_REQUIRED', 'Her entity için id zorunludur.');
    }
    if (!entity?.entityType || typeof entity.entityType !== 'string') {
      pushError('ENTITY_TYPE_REQUIRED', 'Her entity için entityType zorunludur.');
    }
    if (!entity?.name || typeof entity.name !== 'string') {
      pushError('ENTITY_NAME_REQUIRED', 'Her entity için name zorunludur.');
    }
    if (entity?.layout !== 'tablo' && entity?.layout !== 'belge') {
      pushError('ENTITY_LAYOUT_INVALID', 'Entity.layout geçerli bir değer olmalıdır.');
    }
    if (!Array.isArray(entity?.columns)) {
      pushError('ENTITY_COLUMNS_REQUIRED', 'Entity.columns dizi olmalıdır.');
    }
    if (!Array.isArray(entity?.rows)) {
      pushError('ENTITY_ROWS_REQUIRED', 'Entity.rows dizi olmalıdır.');
      continue;
    }

    if (entity.rows.length === 0) {
      pushWarning('ENTITY_EMPTY_ROWS', `Entity '${entity.id}' boş satır içeriyor.`);
    }

    for (const row of entity.rows) {
      if (!row?.id || typeof row.id !== 'string') {
        pushError('ROW_ID_REQUIRED', `Entity '${entity.id}' içindeki satır id zorunludur.`);
      }
      if (!row?.values || typeof row.values !== 'object' || Array.isArray(row.values)) {
        pushError(
          'ROW_VALUES_REQUIRED',
          `Entity '${entity.id}' içindeki satır values nesnesi zorunludur.`
        );
      }
    }
  }

  const counts = aggregateCounts(results);
  const validation: BusinessValidationResult = {
    isValid: counts.error === 0,
    validatedAt: new Date().toISOString(),
    results: Object.freeze(results),
    counts
  };

  return {
    validation,
    warnings: results
      .filter((result) => result.severity === 'warning' || result.severity === 'info')
      .map((result) =>
        createIssue(result.code, result.message, {
          stage: 'dataset-dogrulama',
          recoverable: true
        })
      ),
    errors: results
      .filter((result) => result.severity === 'error')
      .map((result) =>
        createIssue(result.code, result.message, {
          stage: 'dataset-dogrulama',
          recoverable: false
        })
      )
  };
}

function validateRequest(request: AnalysisRequest): AnalysisRuntimeIssue | undefined {
  if (!request?.id || typeof request.id !== 'string') {
    return createIssue(
      ANALYSIS_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Analysis isteği kimliği geçersiz.',
      { detail: 'AnalysisRequest.id is required.', recoverable: false }
    );
  }
  if (!request?.datasetId || typeof request.datasetId !== 'string') {
    return createIssue(
      ANALYSIS_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Analysis dataset kimliği geçersiz.',
      { detail: 'AnalysisRequest.datasetId is required.', recoverable: false }
    );
  }
  return undefined;
}

function createStatistics(
  context: AnalysisContext,
  bag: AnalysisPipelineBag
): AnalysisResult['statistics'] {
  const entityCount = Array.isArray(context.dataset.entities)
    ? context.dataset.entities.length
    : 0;
  const rowCount = Array.isArray(context.dataset.entities)
    ? context.dataset.entities.reduce(
        (total, entity) => total + (Array.isArray(entity.rows) ? entity.rows.length : 0),
        0
      )
    : 0;
  const relationCount = Array.isArray(context.dataset.relations)
    ? context.dataset.relations.length
    : 0;

  return {
    entityCount,
    rowCount,
    relationCount,
    kpiResultCount: bag.kpiResults?.length ?? 0,
    findingCount: bag.findings?.length ?? 0
  };
}

function buildTelemetry(
  context: AnalysisPipelineContext,
  totalDurationMs: number
): AnalysisPipelineTelemetry {
  const stageDurationsMs: Partial<Record<AnalysisStage, number>> = {};
  const stageOutcomes: Partial<Record<AnalysisStage, AnalysisStageExecution['outcome']>> = {};
  let warningCount = 0;
  let errorCount = 0;
  let stagesSucceeded = 0;
  let stagesNotImplemented = 0;
  let stagesFailed = 0;
  let stagesSkipped = 0;

  for (const execution of context.stageExecutions) {
    stageDurationsMs[execution.stageId] = execution.durationMs;
    stageOutcomes[execution.stageId] = execution.outcome;
    warningCount += execution.warnings.length;
    errorCount += execution.errors.length;

    if (execution.outcome === 'basarili') {
      stagesSucceeded += 1;
    } else if (execution.outcome === 'not-implemented') {
      stagesNotImplemented += 1;
    } else if (execution.outcome === 'basarisiz') {
      stagesFailed += 1;
    } else {
      stagesSkipped += 1;
    }
  }

  const endedAt =
    context.stageExecutions[context.stageExecutions.length - 1]?.endedAt ??
    context.startedAt;

  const summary: AnalysisPipelineSummary = {
    stagesExecuted: context.stageExecutions.length,
    stagesSucceeded,
    stagesNotImplemented,
    stagesFailed,
    stagesSkipped,
    success: stagesFailed === 0 && stagesNotImplemented === 0,
    warningCount,
    errorCount
  };

  return {
    totalDurationMs,
    startedAt: context.startedAt,
    endedAt,
    stageDurationsMs,
    stageOutcomes,
    summary
  };
}

function buildAnalysisResult(
  context: AnalysisPipelineContext,
  lastStage: AnalysisStage
): AnalysisResult {
  const hasHardFailure = context.stageExecutions.some(
    (execution) => execution.outcome === 'basarisiz'
  );
  const hasNotImplemented = context.stageExecutions.some(
    (execution) => execution.outcome === 'not-implemented'
  );

  let status: AnalysisStatus;
  if (hasHardFailure) {
    status = 'basarisiz';
  } else if (hasNotImplemented) {
    status = 'basarisiz';
  } else {
    status = 'basarili';
  }

  const warnings = context.stageExecutions.flatMap((execution) => [
    ...execution.warnings,
    ...execution.errors
  ]);

  return {
    requestId: context.request.id,
    datasetId: context.analysisContext.dataset.id,
    status,
    lastStage,
    kpiResults: context.bag.kpiResults ?? [],
    findings: context.bag.findings ?? [],
    summary: context.bag.summary,
    scores: context.bag.scores ?? [],
    statistics: createStatistics(context.analysisContext, context.bag),
    warnings: warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      stage: warning.stage
    })),
    completedAt: new Date().toISOString()
  };
}

/**
 * Analysis Pipeline Runtime — sıralı aşama orchestrator'ı.
 */
export class AnalysisPipelineRuntime implements IAnalysisPipeline {
  readonly stages: readonly AnalysisPipelineStageDefinition[] =
    ANALYSIS_PIPELINE_STAGES;

  private readonly contextResolver?: AnalysisContextResolver;

  private readonly initialContext?: AnalysisContext;

  constructor(options: AnalysisPipelineRuntimeOptions = {}) {
    this.contextResolver = options.contextResolver;
    this.initialContext = options.initialContext;
  }

  async run(request: AnalysisRequest): Promise<AnalysisResult> {
    const detailed = await this.runWithDetails(request);
    return detailed.analysisResult;
  }

  async runWithDetails(
    request: AnalysisRequest,
    explicitContext?: AnalysisContext
  ): Promise<AnalysisPipelineResult> {
    const resolvedContext =
      explicitContext ??
      this.initialContext ??
      (this.contextResolver ? await this.contextResolver(request) : undefined) ??
      createFallbackAnalysisContext(request);

    const context = createPipelineContext(request, {
      ...resolvedContext,
      currentStage: 'dataset-dogrulama',
      status: 'suruyor'
    });

    const requestValidationError = validateRequest(request);
    if (requestValidationError) {
      const stage = this.stages[0];
      const timing = endAnalysisStageTimer(startAnalysisStageTimer());
      context.stageExecutions.push({
        stageId: stage.id,
        stageName: stage.name,
        outcome: 'basarisiz',
        errors: [requestValidationError],
        warnings: [],
        detail: 'Request validation failed before stage loop.',
        ...timing
      });
      context.analysisContext.status = 'basarisiz';
      context.analysisContext.currentStage = stage.id;
      const totalDurationMs = Math.max(0, Math.round(nowMs() - context.startedMark));
      const analysisResult = buildAnalysisResult(context, stage.id);
      return {
        analysisResult,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs,
        telemetry: buildTelemetry(context, totalDurationMs)
      };
    }

    if (!explicitContext && !this.initialContext && !this.contextResolver) {
      const stage = this.stages[0];
      const timing = endAnalysisStageTimer(startAnalysisStageTimer());
      context.stageExecutions.push({
        stageId: stage.id,
        stageName: stage.name,
        outcome: 'basarisiz',
        errors: [
          createIssue(
            ANALYSIS_RUNTIME_ERROR_CODES.CONTEXT_NOT_AVAILABLE,
            'AnalysisContext sağlanmadı.',
            {
              stage: stage.id,
              detail:
                'Provide explicit context, initialContext, or contextResolver to execute dataset validation.',
              recoverable: false
            }
          )
        ],
        warnings: [],
        detail: 'No analysis context available.',
        ...timing
      });
      context.analysisContext.status = 'basarisiz';
      context.analysisContext.currentStage = stage.id;
      const totalDurationMs = Math.max(0, Math.round(nowMs() - context.startedMark));
      const analysisResult = buildAnalysisResult(context, stage.id);
      return {
        analysisResult,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs,
        telemetry: buildTelemetry(context, totalDurationMs)
      };
    }

    let halt = false;

    for (const definition of this.stages) {
      if (halt && definition.id !== 'sonuc-derleme') {
        const timing = endAnalysisStageTimer(startAnalysisStageTimer());
        context.stageExecutions.push({
          stageId: definition.id,
          stageName: definition.name,
          outcome: 'atlandi',
          errors: [],
          warnings: [],
          detail: 'Skipped due to prior halt.',
          ...timing
        });
        continue;
      }

      context.analysisContext.currentStage = definition.id;
      const timer = startAnalysisStageTimer();
      let execution: AnalysisStageExecution;

      try {
        if (definition.id === 'dataset-dogrulama') {
          const outcome = validateDataset(context.analysisContext.dataset, request);
          context.bag.datasetValidation = outcome.validation;
          context.analysisContext.dataset = {
            ...context.analysisContext.dataset,
            validation: outcome.validation
          };

          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: outcome.validation.isValid ? 'basarili' : 'basarisiz',
            errors: outcome.errors,
            warnings: outcome.warnings,
            detail: outcome.validation.isValid
              ? 'BusinessDataset validation completed.'
              : 'BusinessDataset validation failed.',
            ...endAnalysisStageTimer(timer)
          };

          if (!outcome.validation.isValid) {
            halt = true;
          }
        } else if (definition.id === 'sonuc-derleme') {
          const priorNotImplemented = context.stageExecutions.filter(
            (item) => item.outcome === 'not-implemented'
          );
          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: 'basarili',
            errors: [],
            warnings:
              priorNotImplemented.length > 0
                ? [
                    createIssue(
                      ANALYSIS_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
                      'Pipeline placeholder aşamalar içeriyor.',
                      {
                        stage: definition.id,
                        detail: `Not implemented stages: ${priorNotImplemented
                          .map((item) => item.stageId)
                          .join(', ')}`,
                        recoverable: true
                      }
                    )
                  ]
                : [],
            detail: 'AnalysisResult assembly completed.',
            ...endAnalysisStageTimer(timer)
          };
        } else {
          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: 'not-implemented',
            errors: [createNotImplementedIssue(definition.id, definition.name)],
            warnings: [],
            detail: 'Placeholder stage executed.',
            ...endAnalysisStageTimer(timer)
          };
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Beklenmeyen pipeline hatası.';
        execution = {
          stageId: definition.id,
          stageName: definition.name,
          outcome: 'basarisiz',
          errors: [
            createIssue(
              ANALYSIS_RUNTIME_ERROR_CODES.UNEXPECTED,
              'Aşama yürütülürken beklenmeyen hata oluştu.',
              {
                stage: definition.id,
                detail: message,
                recoverable: false
              }
            )
          ],
          warnings: [],
          detail: message,
          ...endAnalysisStageTimer(timer)
        };
        halt = true;
      }

      context.stageExecutions.push(execution);
    }

    const lastStage =
      context.stageExecutions[context.stageExecutions.length - 1]?.stageId ??
      'sonuc-derleme';
    const totalDurationMs = Math.max(0, Math.round(nowMs() - context.startedMark));
    const analysisResult = buildAnalysisResult(context, lastStage);
    context.analysisContext.status = analysisResult.status;
    context.analysisContext.currentStage = lastStage;

    return {
      analysisResult,
      context,
      stageExecutions: context.stageExecutions,
      totalDurationMs,
      telemetry: buildTelemetry(context, totalDurationMs)
    };
  }
}

export function createAnalysisPipelineRuntime(
  options?: AnalysisPipelineRuntimeOptions
): AnalysisPipelineRuntime {
  return new AnalysisPipelineRuntime(options);
}

export default AnalysisPipelineRuntime;
