/**
 * İSTEBUL Business Decision Engine — Pipeline Runtime Orchestrator (PR-103A).
 *
 * AnalysisResult Validation gerçek çalışır.
 * Risk / Opportunity / Recommendation / Priority aşamaları bu PR'da placeholder olarak kalır.
 */

import type { AnalysisResult } from '../../../analysis/models/AnalysisResult';
import type { AnalysisStage } from '../../../analysis/models/AnalysisStage';
import type { AnalysisStatus } from '../../../analysis/models/AnalysisStage';
import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { ValidationResult } from '../../../dataset/validators/ValidationResult';
import { DECISION_ENGINE_DEFAULT_LOCALE } from '../../constants/DecisionEngineConstants';
import type { DecisionContext } from '../../models/DecisionContext';
import type { DecisionRequest } from '../../models/DecisionRequest';
import type { DecisionResult } from '../../models/DecisionResult';
import type { DecisionStage, DecisionStatus } from '../../models/DecisionStage';
import type { IDecisionPipeline } from '../../ports/IDecisionPipeline';
import {
  DECISION_PIPELINE_STAGES,
  type DecisionPipelineStageDefinition
} from '../DecisionPipeline';
import type { DecisionPipelineContext } from './DecisionPipelineContext';
import type {
  DecisionPipelineResult,
  DecisionPipelineSummary,
  DecisionPipelineTelemetry
} from './DecisionPipelineResult';
import type {
  DecisionRuntimeIssue,
  DecisionStageExecution
} from './DecisionStageExecution';
import {
  endDecisionStageTimer,
  nowMs,
  startDecisionStageTimer
} from './DecisionTiming';

export const DECISION_RUNTIME_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: 'INVALID_REQUEST',
  CONTEXT_NOT_AVAILABLE: 'CONTEXT_NOT_AVAILABLE',
  ANALYSIS_REQUEST_ID_MISMATCH: 'ANALYSIS_REQUEST_ID_MISMATCH',
  DATASET_ID_MISMATCH: 'DATASET_ID_MISMATCH',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  UNEXPECTED: 'UNEXPECTED'
} as const);

export type DecisionRuntimeErrorCode =
  (typeof DECISION_RUNTIME_ERROR_CODES)[keyof typeof DECISION_RUNTIME_ERROR_CODES];

export type DecisionContextResolver = (
  request: DecisionRequest
) => Promise<DecisionContext>;

export interface DecisionPipelineRuntimeOptions {
  /** `run(request)` için context çözücü */
  contextResolver?: DecisionContextResolver;
  /** Test / tek seferlik kullanım için hazır context */
  initialContext?: DecisionContext;
}

const VALID_ANALYSIS_STATUSES: readonly AnalysisStatus[] = [
  'bekliyor',
  'suruyor',
  'basarili',
  'basarisiz',
  'iptal'
];

const VALID_ANALYSIS_STAGES: readonly AnalysisStage[] = [
  'dataset-dogrulama',
  'kpi-hesaplama',
  'kural-degerlendirme',
  'bulgu-uretimi',
  'ozet-uretimi',
  'sonuc-derleme'
];

function createIssue(
  code: string,
  message: string,
  options?: Readonly<{
    stage?: DecisionStage;
    detail?: string;
    recoverable?: boolean;
  }>
): DecisionRuntimeIssue {
  return {
    code,
    message,
    stage: options?.stage,
    detail: options?.detail,
    recoverable: options?.recoverable
  };
}

function createNotImplementedIssue(
  stage: DecisionStage,
  stageName: string
): DecisionRuntimeIssue {
  return createIssue(
    DECISION_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
    `${stageName} aşaması henüz uygulanmadı.`,
    {
      stage,
      detail: `Stage '${stage}' is not implemented in Decision Pipeline Runtime (PR-103A).`,
      recoverable: false
    }
  );
}

function createEmptyAnalysisResult(
  request: DecisionRequest
): AnalysisResult {
  return {
    requestId: request.analysisRequestId || 'unknown-analysis',
    datasetId: request.datasetId || 'unknown-dataset',
    status: 'basarisiz',
    lastStage: 'sonuc-derleme',
    kpiResults: [],
    findings: [],
    scores: [],
    statistics: {
      entityCount: 0,
      rowCount: 0,
      relationCount: 0,
      kpiResultCount: 0,
      findingCount: 0
    },
    warnings: []
  };
}

function createFallbackDecisionContext(
  request: DecisionRequest
): DecisionContext {
  return {
    decisionId: request.id || 'unknown-decision',
    analysisResult: createEmptyAnalysisResult(request),
    locale: request.locale ?? DECISION_ENGINE_DEFAULT_LOCALE,
    reportId: request.reportId,
    currentStage: 'analiz-sonuc-dogrulama',
    status: 'bekliyor',
    strategyIds: request.strategyIds,
    metadata: undefined
  };
}

function createPipelineContext(
  request: DecisionRequest,
  decisionContext: DecisionContext
): DecisionPipelineContext {
  return {
    request,
    decisionContext,
    stageExecutions: [],
    bag: {},
    startedAt: new Date().toISOString(),
    startedMark: nowMs()
  };
}

function aggregateCounts(
  results: readonly ValidationResult[]
): BusinessValidationResult['counts'] {
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

function validateAnalysisResult(
  analysisResult: AnalysisResult,
  request: DecisionRequest
): {
  validation: BusinessValidationResult;
  warnings: DecisionRuntimeIssue[];
  errors: DecisionRuntimeIssue[];
} {
  const results: ValidationResult[] = [];

  const pushError = (code: string, message: string) => {
    results.push({ severity: 'error', code, message });
  };
  const pushWarning = (code: string, message: string) => {
    results.push({ severity: 'warning', code, message });
  };

  if (!analysisResult || typeof analysisResult !== 'object') {
    pushError(
      'ANALYSIS_RESULT_REQUIRED',
      'DecisionContext.analysisResult zorunludur.'
    );
  } else {
    if (!analysisResult.requestId || typeof analysisResult.requestId !== 'string') {
      pushError(
        'ANALYSIS_REQUEST_ID_REQUIRED',
        'AnalysisResult.requestId zorunludur.'
      );
    }
    if (
      analysisResult.requestId &&
      request.analysisRequestId &&
      analysisResult.requestId !== request.analysisRequestId
    ) {
      pushError(
        DECISION_RUNTIME_ERROR_CODES.ANALYSIS_REQUEST_ID_MISMATCH,
        'Request.analysisRequestId ile AnalysisResult.requestId eşleşmiyor.'
      );
    }

    if (!analysisResult.datasetId || typeof analysisResult.datasetId !== 'string') {
      pushError(
        'ANALYSIS_DATASET_ID_REQUIRED',
        'AnalysisResult.datasetId zorunludur.'
      );
    }
    if (
      analysisResult.datasetId &&
      request.datasetId &&
      analysisResult.datasetId !== request.datasetId
    ) {
      pushError(
        DECISION_RUNTIME_ERROR_CODES.DATASET_ID_MISMATCH,
        'Request.datasetId ile AnalysisResult.datasetId eşleşmiyor.'
      );
    }

    if (
      !analysisResult.status ||
      !VALID_ANALYSIS_STATUSES.includes(analysisResult.status)
    ) {
      pushError(
        'ANALYSIS_STATUS_INVALID',
        'AnalysisResult.status geçerli bir değer olmalıdır.'
      );
    } else if (analysisResult.status === 'basarisiz') {
      pushWarning(
        'ANALYSIS_STATUS_FAILED',
        'AnalysisResult.status basarisiz; karar çıktısı sınırlı olabilir.'
      );
    } else if (
      analysisResult.status === 'bekliyor' ||
      analysisResult.status === 'suruyor'
    ) {
      pushWarning(
        'ANALYSIS_STATUS_INCOMPLETE',
        'AnalysisResult henüz tamamlanmamış görünüyor.'
      );
    }

    if (
      !analysisResult.lastStage ||
      !VALID_ANALYSIS_STAGES.includes(analysisResult.lastStage)
    ) {
      pushError(
        'ANALYSIS_LAST_STAGE_INVALID',
        'AnalysisResult.lastStage geçerli bir aşama kimliği olmalıdır.'
      );
    }

    if (!Array.isArray(analysisResult.kpiResults)) {
      pushError(
        'ANALYSIS_KPI_RESULTS_REQUIRED',
        'AnalysisResult.kpiResults dizi olmalıdır.'
      );
    }
    if (!Array.isArray(analysisResult.findings)) {
      pushError(
        'ANALYSIS_FINDINGS_REQUIRED',
        'AnalysisResult.findings dizi olmalıdır.'
      );
    }
    if (!Array.isArray(analysisResult.scores)) {
      pushError(
        'ANALYSIS_SCORES_REQUIRED',
        'AnalysisResult.scores dizi olmalıdır.'
      );
    }
    if (!Array.isArray(analysisResult.warnings)) {
      pushError(
        'ANALYSIS_WARNINGS_REQUIRED',
        'AnalysisResult.warnings dizi olmalıdır.'
      );
    }
    if (!analysisResult.statistics || typeof analysisResult.statistics !== 'object') {
      pushError(
        'ANALYSIS_STATISTICS_REQUIRED',
        'AnalysisResult.statistics zorunludur.'
      );
    }

    if (
      Array.isArray(analysisResult.findings) &&
      analysisResult.findings.length === 0
    ) {
      pushWarning(
        'ANALYSIS_FINDINGS_EMPTY',
        'AnalysisResult.findings boş; risk/fırsat aşamaları sınırlı girdi alabilir.'
      );
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
          stage: 'analiz-sonuc-dogrulama',
          recoverable: true
        })
      ),
    errors: results
      .filter((result) => result.severity === 'error')
      .map((result) =>
        createIssue(result.code, result.message, {
          stage: 'analiz-sonuc-dogrulama',
          recoverable: false
        })
      )
  };
}

function validateRequest(
  request: DecisionRequest
): DecisionRuntimeIssue | undefined {
  if (!request?.id || typeof request.id !== 'string') {
    return createIssue(
      DECISION_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Decision isteği kimliği geçersiz.',
      { detail: 'DecisionRequest.id is required.', recoverable: false }
    );
  }
  if (
    !request?.analysisRequestId ||
    typeof request.analysisRequestId !== 'string'
  ) {
    return createIssue(
      DECISION_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Decision analiz isteği kimliği geçersiz.',
      {
        detail: 'DecisionRequest.analysisRequestId is required.',
        recoverable: false
      }
    );
  }
  if (!request?.datasetId || typeof request.datasetId !== 'string') {
    return createIssue(
      DECISION_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Decision dataset kimliği geçersiz.',
      { detail: 'DecisionRequest.datasetId is required.', recoverable: false }
    );
  }
  return undefined;
}

function buildTelemetry(
  context: DecisionPipelineContext,
  totalDurationMs: number
): DecisionPipelineTelemetry {
  const stageDurationsMs: Partial<Record<DecisionStage, number>> = {};
  const stageOutcomes: Partial<
    Record<DecisionStage, DecisionStageExecution['outcome']>
  > = {};
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

  const summary: DecisionPipelineSummary = {
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

function buildDecisionResult(
  context: DecisionPipelineContext,
  lastStage: DecisionStage
): DecisionResult {
  const hasHardFailure = context.stageExecutions.some(
    (execution) => execution.outcome === 'basarisiz'
  );
  const hasNotImplemented = context.stageExecutions.some(
    (execution) => execution.outcome === 'not-implemented'
  );

  let status: DecisionStatus;
  if (hasHardFailure) {
    status = 'basarisiz';
  } else if (hasNotImplemented) {
    status = 'basarisiz';
  } else {
    status = 'basarili';
  }

  return {
    requestId: context.request.id,
    analysisRequestId: context.request.analysisRequestId,
    datasetId: context.request.datasetId,
    status,
    lastStage,
    summary: context.bag.summary ?? {
      headline: '',
      highlights: Object.freeze([])
    },
    recommendations: context.bag.recommendations ?? [],
    actions: context.bag.actions ?? [],
    risks: context.bag.risks ?? [],
    opportunities: context.bag.opportunities ?? [],
    priorities: context.bag.priorities ?? [],
    scores: context.bag.scores ?? [],
    completedAt: new Date().toISOString()
  };
}

/**
 * Decision Pipeline Runtime — sıralı aşama orchestrator'ı.
 */
export class DecisionPipelineRuntime implements IDecisionPipeline {
  readonly stages: readonly DecisionPipelineStageDefinition[] =
    DECISION_PIPELINE_STAGES;

  private readonly contextResolver?: DecisionContextResolver;

  private readonly initialContext?: DecisionContext;

  constructor(options: DecisionPipelineRuntimeOptions = {}) {
    this.contextResolver = options.contextResolver;
    this.initialContext = options.initialContext;
  }

  async run(request: DecisionRequest): Promise<DecisionResult> {
    const detailed = await this.runWithDetails(request);
    return detailed.decisionResult;
  }

  async runWithDetails(
    request: DecisionRequest,
    explicitContext?: DecisionContext
  ): Promise<DecisionPipelineResult> {
    const resolvedContext =
      explicitContext ??
      this.initialContext ??
      (this.contextResolver ? await this.contextResolver(request) : undefined) ??
      createFallbackDecisionContext(request);

    const context = createPipelineContext(request, {
      ...resolvedContext,
      currentStage: 'analiz-sonuc-dogrulama',
      status: 'suruyor'
    });

    const requestValidationError = validateRequest(request);
    if (requestValidationError) {
      const stage = this.stages[0];
      const timing = endDecisionStageTimer(startDecisionStageTimer());
      context.stageExecutions.push({
        stageId: stage.id,
        stageName: stage.name,
        outcome: 'basarisiz',
        errors: [requestValidationError],
        warnings: [],
        detail: 'Request validation failed before stage loop.',
        ...timing
      });
      context.decisionContext.status = 'basarisiz';
      context.decisionContext.currentStage = stage.id;
      const totalDurationMs = Math.max(
        0,
        Math.round(nowMs() - context.startedMark)
      );
      const decisionResult = buildDecisionResult(context, stage.id);
      return {
        decisionResult,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs,
        telemetry: buildTelemetry(context, totalDurationMs)
      };
    }

    if (!explicitContext && !this.initialContext && !this.contextResolver) {
      const stage = this.stages[0];
      const timing = endDecisionStageTimer(startDecisionStageTimer());
      context.stageExecutions.push({
        stageId: stage.id,
        stageName: stage.name,
        outcome: 'basarisiz',
        errors: [
          createIssue(
            DECISION_RUNTIME_ERROR_CODES.CONTEXT_NOT_AVAILABLE,
            'DecisionContext sağlanmadı.',
            {
              stage: stage.id,
              detail:
                'Provide explicit context, initialContext, or contextResolver to execute analysis result validation.',
              recoverable: false
            }
          )
        ],
        warnings: [],
        detail: 'No decision context available.',
        ...timing
      });
      context.decisionContext.status = 'basarisiz';
      context.decisionContext.currentStage = stage.id;
      const totalDurationMs = Math.max(
        0,
        Math.round(nowMs() - context.startedMark)
      );
      const decisionResult = buildDecisionResult(context, stage.id);
      return {
        decisionResult,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs,
        telemetry: buildTelemetry(context, totalDurationMs)
      };
    }

    let halt = false;

    for (const definition of this.stages) {
      if (halt && definition.id !== 'karar-derleme') {
        const timing = endDecisionStageTimer(startDecisionStageTimer());
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

      context.decisionContext.currentStage = definition.id;
      const timer = startDecisionStageTimer();
      let execution: DecisionStageExecution;

      try {
        if (definition.id === 'analiz-sonuc-dogrulama') {
          const outcome = validateAnalysisResult(
            context.decisionContext.analysisResult,
            request
          );
          context.bag.analysisValidation = outcome.validation;

          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: outcome.validation.isValid ? 'basarili' : 'basarisiz',
            errors: outcome.errors,
            warnings: outcome.warnings,
            detail: outcome.validation.isValid
              ? 'AnalysisResult validation completed.'
              : 'AnalysisResult validation failed.',
            ...endDecisionStageTimer(timer)
          };

          if (!outcome.validation.isValid) {
            halt = true;
          }
        } else if (definition.id === 'karar-derleme') {
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
                      DECISION_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
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
            detail: 'DecisionResult assembly completed.',
            ...endDecisionStageTimer(timer)
          };
        } else {
          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: 'not-implemented',
            errors: [createNotImplementedIssue(definition.id, definition.name)],
            warnings: [],
            detail: 'Placeholder stage executed.',
            ...endDecisionStageTimer(timer)
          };
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Beklenmeyen pipeline hatası.';
        execution = {
          stageId: definition.id,
          stageName: definition.name,
          outcome: 'basarisiz',
          errors: [
            createIssue(
              DECISION_RUNTIME_ERROR_CODES.UNEXPECTED,
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
          ...endDecisionStageTimer(timer)
        };
        halt = true;
      }

      context.stageExecutions.push(execution);
    }

    const lastStage =
      context.stageExecutions[context.stageExecutions.length - 1]?.stageId ??
      'karar-derleme';
    const totalDurationMs = Math.max(
      0,
      Math.round(nowMs() - context.startedMark)
    );
    const decisionResult = buildDecisionResult(context, lastStage);
    context.decisionContext.status = decisionResult.status;
    context.decisionContext.currentStage = lastStage;

    return {
      decisionResult,
      context,
      stageExecutions: context.stageExecutions,
      totalDurationMs,
      telemetry: buildTelemetry(context, totalDurationMs)
    };
  }
}

export function createDecisionPipelineRuntime(
  options?: DecisionPipelineRuntimeOptions
): DecisionPipelineRuntime {
  return new DecisionPipelineRuntime(options);
}

export default DecisionPipelineRuntime;
