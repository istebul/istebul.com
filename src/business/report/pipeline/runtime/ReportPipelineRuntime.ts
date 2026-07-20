/**
 * İSTEBUL Business Report Engine — Pipeline Runtime Orchestrator (PR-104A).
 *
 * DecisionResult Validation gerçek çalışır.
 * Section / Evidence / Composition / Review aşamaları bu PR'da placeholder olarak kalır.
 */

import type { DecisionResult } from '../../../decision/models/DecisionResult';
import type { DecisionStage } from '../../../decision/models/DecisionStage';
import type { DecisionStatus } from '../../../decision/models/DecisionStage';
import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { ValidationResult } from '../../../dataset/validators/ValidationResult';
import {
  REPORT_ENGINE_DEFAULT_LOCALE,
  REPORT_ENGINE_SCHEMA_VERSION
} from '../../constants/ReportEngineConstants';
import type { ReportContext } from '../../models/ReportContext';
import type { ReportModel } from '../../models/ReportModel';
import type { ReportRequest } from '../../models/ReportRequest';
import type {
  ReportExecutionStatus,
  ReportStage
} from '../../models/ReportStage';
import type { IReportPipeline } from '../../ports/IReportPipeline';
import {
  REPORT_PIPELINE_STAGES,
  type ReportPipelineStageDefinition
} from '../ReportPipeline';
import type { ReportPipelineContext } from './ReportPipelineContext';
import type {
  ReportPipelineResult,
  ReportPipelineSummary,
  ReportPipelineTelemetry
} from './ReportPipelineResult';
import type {
  ReportRuntimeIssue,
  ReportStageExecution
} from './ReportStageExecution';
import {
  endReportStageTimer,
  nowMs,
  startReportStageTimer
} from './ReportTiming';

export const REPORT_RUNTIME_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: 'INVALID_REQUEST',
  CONTEXT_NOT_AVAILABLE: 'CONTEXT_NOT_AVAILABLE',
  DECISION_REQUEST_ID_MISMATCH: 'DECISION_REQUEST_ID_MISMATCH',
  DATASET_ID_MISMATCH: 'DATASET_ID_MISMATCH',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  UNEXPECTED: 'UNEXPECTED'
} as const);

export type ReportRuntimeErrorCode =
  (typeof REPORT_RUNTIME_ERROR_CODES)[keyof typeof REPORT_RUNTIME_ERROR_CODES];

export type ReportContextResolver = (
  request: ReportRequest
) => Promise<ReportContext>;

export interface ReportPipelineRuntimeOptions {
  /** `run(request)` için context çözücü */
  contextResolver?: ReportContextResolver;
  /** Test / tek seferlik kullanım için hazır context */
  initialContext?: ReportContext;
}

const VALID_DECISION_STATUSES: readonly DecisionStatus[] = [
  'bekliyor',
  'suruyor',
  'basarili',
  'basarisiz',
  'iptal'
];

const VALID_DECISION_STAGES: readonly DecisionStage[] = [
  'analiz-sonuc-dogrulama',
  'risk-degerlendirme',
  'firsat-degerlendirme',
  'oneri-olusturma',
  'oncelik-hesaplama',
  'karar-derleme'
];

function createIssue(
  code: string,
  message: string,
  options?: Readonly<{
    stage?: ReportStage;
    detail?: string;
    recoverable?: boolean;
  }>
): ReportRuntimeIssue {
  return {
    code,
    message,
    stage: options?.stage,
    detail: options?.detail,
    recoverable: options?.recoverable
  };
}

function createNotImplementedIssue(
  stage: ReportStage,
  stageName: string
): ReportRuntimeIssue {
  return createIssue(
    REPORT_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
    `${stageName} aşaması henüz uygulanmadı.`,
    {
      stage,
      detail: `Stage '${stage}' is not implemented in Report Pipeline Runtime (PR-104A).`,
      recoverable: false
    }
  );
}

function createEmptyDecisionResult(request: ReportRequest): DecisionResult {
  return {
    requestId: request.decisionRequestId || 'unknown-decision',
    analysisRequestId: 'unknown-analysis',
    datasetId: request.datasetId || 'unknown-dataset',
    status: 'basarisiz',
    lastStage: 'karar-derleme',
    summary: {
      headline: '',
      highlights: Object.freeze([])
    },
    recommendations: Object.freeze([]),
    actions: Object.freeze([]),
    risks: Object.freeze([]),
    opportunities: Object.freeze([]),
    priorities: Object.freeze([]),
    scores: Object.freeze([])
  };
}

function createFallbackReportContext(request: ReportRequest): ReportContext {
  return {
    reportJobId: request.id || 'unknown-report-job',
    decisionResult: createEmptyDecisionResult(request),
    reportDnaId: request.reportId || 'unknown-report-dna',
    locale: request.locale ?? REPORT_ENGINE_DEFAULT_LOCALE,
    currentStage: 'karar-dogrulama',
    status: 'bekliyor',
    metadata: undefined
  };
}

function createPipelineContext(
  request: ReportRequest,
  reportContext: ReportContext
): ReportPipelineContext {
  return {
    request,
    reportContext,
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

function validateDecisionResult(
  decisionResult: DecisionResult,
  request: ReportRequest
): {
  validation: BusinessValidationResult;
  warnings: ReportRuntimeIssue[];
  errors: ReportRuntimeIssue[];
} {
  const results: ValidationResult[] = [];

  const pushError = (code: string, message: string) => {
    results.push({ severity: 'error', code, message });
  };
  const pushWarning = (code: string, message: string) => {
    results.push({ severity: 'warning', code, message });
  };

  if (!decisionResult || typeof decisionResult !== 'object') {
    pushError(
      'DECISION_RESULT_REQUIRED',
      'ReportContext.decisionResult zorunludur.'
    );
  } else {
    if (!decisionResult.requestId || typeof decisionResult.requestId !== 'string') {
      pushError(
        'DECISION_REQUEST_ID_REQUIRED',
        'DecisionResult.requestId zorunludur.'
      );
    }
    if (
      decisionResult.requestId &&
      request.decisionRequestId &&
      decisionResult.requestId !== request.decisionRequestId
    ) {
      pushError(
        REPORT_RUNTIME_ERROR_CODES.DECISION_REQUEST_ID_MISMATCH,
        'Request.decisionRequestId ile DecisionResult.requestId eşleşmiyor.'
      );
    }

    if (!decisionResult.datasetId || typeof decisionResult.datasetId !== 'string') {
      pushError(
        'DECISION_DATASET_ID_REQUIRED',
        'DecisionResult.datasetId zorunludur.'
      );
    }
    if (
      decisionResult.datasetId &&
      request.datasetId &&
      decisionResult.datasetId !== request.datasetId
    ) {
      pushError(
        REPORT_RUNTIME_ERROR_CODES.DATASET_ID_MISMATCH,
        'Request.datasetId ile DecisionResult.datasetId eşleşmiyor.'
      );
    }

    if (
      !decisionResult.analysisRequestId ||
      typeof decisionResult.analysisRequestId !== 'string'
    ) {
      pushError(
        'DECISION_ANALYSIS_REQUEST_ID_REQUIRED',
        'DecisionResult.analysisRequestId zorunludur.'
      );
    }

    if (
      !decisionResult.status ||
      !VALID_DECISION_STATUSES.includes(decisionResult.status)
    ) {
      pushError(
        'DECISION_STATUS_INVALID',
        'DecisionResult.status geçerli bir değer olmalıdır.'
      );
    } else if (decisionResult.status === 'basarisiz') {
      pushWarning(
        'DECISION_STATUS_FAILED',
        'DecisionResult.status basarisiz; rapor çıktısı sınırlı olabilir.'
      );
    } else if (
      decisionResult.status === 'bekliyor' ||
      decisionResult.status === 'suruyor'
    ) {
      pushWarning(
        'DECISION_STATUS_INCOMPLETE',
        'DecisionResult henüz tamamlanmamış görünüyor.'
      );
    }

    if (
      !decisionResult.lastStage ||
      !VALID_DECISION_STAGES.includes(decisionResult.lastStage)
    ) {
      pushError(
        'DECISION_LAST_STAGE_INVALID',
        'DecisionResult.lastStage geçerli bir aşama kimliği olmalıdır.'
      );
    }

    if (!decisionResult.summary || typeof decisionResult.summary !== 'object') {
      pushError(
        'DECISION_SUMMARY_REQUIRED',
        'DecisionResult.summary zorunludur.'
      );
    } else if (typeof decisionResult.summary.headline !== 'string') {
      pushError(
        'DECISION_SUMMARY_HEADLINE_REQUIRED',
        'DecisionResult.summary.headline string olmalıdır.'
      );
    }

    if (!Array.isArray(decisionResult.recommendations)) {
      pushError(
        'DECISION_RECOMMENDATIONS_REQUIRED',
        'DecisionResult.recommendations dizi olmalıdır.'
      );
    }
    if (!Array.isArray(decisionResult.actions)) {
      pushError(
        'DECISION_ACTIONS_REQUIRED',
        'DecisionResult.actions dizi olmalıdır.'
      );
    }
    if (!Array.isArray(decisionResult.risks)) {
      pushError(
        'DECISION_RISKS_REQUIRED',
        'DecisionResult.risks dizi olmalıdır.'
      );
    }
    if (!Array.isArray(decisionResult.opportunities)) {
      pushError(
        'DECISION_OPPORTUNITIES_REQUIRED',
        'DecisionResult.opportunities dizi olmalıdır.'
      );
    }
    if (!Array.isArray(decisionResult.priorities)) {
      pushError(
        'DECISION_PRIORITIES_REQUIRED',
        'DecisionResult.priorities dizi olmalıdır.'
      );
    }
    if (!Array.isArray(decisionResult.scores)) {
      pushError(
        'DECISION_SCORES_REQUIRED',
        'DecisionResult.scores dizi olmalıdır.'
      );
    }

    if (
      Array.isArray(decisionResult.recommendations) &&
      decisionResult.recommendations.length === 0
    ) {
      pushWarning(
        'DECISION_RECOMMENDATIONS_EMPTY',
        'DecisionResult.recommendations boş; bölüm derleme sınırlı girdi alabilir.'
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
          stage: 'karar-dogrulama',
          recoverable: true
        })
      ),
    errors: results
      .filter((result) => result.severity === 'error')
      .map((result) =>
        createIssue(result.code, result.message, {
          stage: 'karar-dogrulama',
          recoverable: false
        })
      )
  };
}

function validateRequest(
  request: ReportRequest
): ReportRuntimeIssue | undefined {
  if (!request?.id || typeof request.id !== 'string') {
    return createIssue(
      REPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Report isteği kimliği geçersiz.',
      { detail: 'ReportRequest.id is required.', recoverable: false }
    );
  }
  if (
    !request?.decisionRequestId ||
    typeof request.decisionRequestId !== 'string'
  ) {
    return createIssue(
      REPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Report karar isteği kimliği geçersiz.',
      {
        detail: 'ReportRequest.decisionRequestId is required.',
        recoverable: false
      }
    );
  }
  if (!request?.reportId || typeof request.reportId !== 'string') {
    return createIssue(
      REPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Report DNA kimliği geçersiz.',
      { detail: 'ReportRequest.reportId is required.', recoverable: false }
    );
  }
  if (!request?.datasetId || typeof request.datasetId !== 'string') {
    return createIssue(
      REPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Report dataset kimliği geçersiz.',
      { detail: 'ReportRequest.datasetId is required.', recoverable: false }
    );
  }
  return undefined;
}

function buildTelemetry(
  context: ReportPipelineContext,
  totalDurationMs: number
): ReportPipelineTelemetry {
  const stageDurationsMs: Partial<Record<ReportStage, number>> = {};
  const stageOutcomes: Partial<
    Record<ReportStage, ReportStageExecution['outcome']>
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

  const summary: ReportPipelineSummary = {
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

function buildReportModel(
  context: ReportPipelineContext,
  lastStage: ReportStage
): ReportModel {
  const hasHardFailure = context.stageExecutions.some(
    (execution) => execution.outcome === 'basarisiz'
  );
  const hasNotImplemented = context.stageExecutions.some(
    (execution) => execution.outcome === 'not-implemented'
  );

  let status: ReportExecutionStatus;
  if (hasHardFailure) {
    status = 'basarisiz';
  } else if (hasNotImplemented) {
    status = 'basarisiz';
  } else {
    status = 'basarili';
  }

  const now = new Date().toISOString();
  const bag = context.bag;

  return {
    id: context.request.id,
    metadata: {
      id: context.request.id,
      title: 'Rapor taslağı',
      description: 'Report Pipeline Runtime (PR-104A) iskelet çıktısı.',
      reportDnaId: context.reportContext.reportDnaId,
      locale: context.reportContext.locale,
      createdAt: now,
      version: REPORT_ENGINE_SCHEMA_VERSION
    },
    status,
    lastStage,
    executiveSummary: bag.executiveSummary ?? {
      headline: '',
      body: '',
      highlights: Object.freeze([])
    },
    sections: bag.sections ?? Object.freeze([]),
    findings: bag.findings ?? Object.freeze([]),
    recommendations: bag.recommendations ?? Object.freeze([]),
    appendices: bag.appendices ?? Object.freeze([]),
    references: bag.references ?? Object.freeze([]),
    review: bag.review
  };
}

/**
 * Report Pipeline Runtime — sıralı aşama orchestrator'ı.
 */
export class ReportPipelineRuntime implements IReportPipeline {
  readonly stages: readonly ReportPipelineStageDefinition[] =
    REPORT_PIPELINE_STAGES;

  private readonly contextResolver?: ReportContextResolver;

  private readonly initialContext?: ReportContext;

  constructor(options: ReportPipelineRuntimeOptions = {}) {
    this.contextResolver = options.contextResolver;
    this.initialContext = options.initialContext;
  }

  async run(request: ReportRequest): Promise<ReportModel> {
    const detailed = await this.runWithDetails(request);
    return detailed.reportModel;
  }

  async runWithDetails(
    request: ReportRequest,
    explicitContext?: ReportContext
  ): Promise<ReportPipelineResult> {
    const resolvedContext =
      explicitContext ??
      this.initialContext ??
      (this.contextResolver ? await this.contextResolver(request) : undefined) ??
      createFallbackReportContext(request);

    const context = createPipelineContext(request, {
      ...resolvedContext,
      currentStage: 'karar-dogrulama',
      status: 'suruyor'
    });

    const requestValidationError = validateRequest(request);
    if (requestValidationError) {
      const stage = this.stages[0];
      const timing = endReportStageTimer(startReportStageTimer());
      context.stageExecutions.push({
        stageId: stage.id,
        stageName: stage.name,
        outcome: 'basarisiz',
        errors: [requestValidationError],
        warnings: [],
        detail: 'Request validation failed before stage loop.',
        ...timing
      });
      context.reportContext.status = 'basarisiz';
      context.reportContext.currentStage = stage.id;
      const totalDurationMs = Math.max(
        0,
        Math.round(nowMs() - context.startedMark)
      );
      const reportModel = buildReportModel(context, stage.id);
      return {
        reportModel,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs,
        telemetry: buildTelemetry(context, totalDurationMs)
      };
    }

    if (!explicitContext && !this.initialContext && !this.contextResolver) {
      const stage = this.stages[0];
      const timing = endReportStageTimer(startReportStageTimer());
      context.stageExecutions.push({
        stageId: stage.id,
        stageName: stage.name,
        outcome: 'basarisiz',
        errors: [
          createIssue(
            REPORT_RUNTIME_ERROR_CODES.CONTEXT_NOT_AVAILABLE,
            'ReportContext sağlanmadı.',
            {
              stage: stage.id,
              detail:
                'Provide explicit context, initialContext, or contextResolver to execute decision result validation.',
              recoverable: false
            }
          )
        ],
        warnings: [],
        detail: 'No report context available.',
        ...timing
      });
      context.reportContext.status = 'basarisiz';
      context.reportContext.currentStage = stage.id;
      const totalDurationMs = Math.max(
        0,
        Math.round(nowMs() - context.startedMark)
      );
      const reportModel = buildReportModel(context, stage.id);
      return {
        reportModel,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs,
        telemetry: buildTelemetry(context, totalDurationMs)
      };
    }

    let halt = false;

    for (const definition of this.stages) {
      if (halt && definition.id !== 'rapor-derleme') {
        const timing = endReportStageTimer(startReportStageTimer());
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

      context.reportContext.currentStage = definition.id;
      const timer = startReportStageTimer();
      let execution: ReportStageExecution;

      try {
        if (definition.id === 'karar-dogrulama') {
          const outcome = validateDecisionResult(
            context.reportContext.decisionResult,
            request
          );
          context.bag.decisionValidation = outcome.validation;

          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: outcome.validation.isValid ? 'basarili' : 'basarisiz',
            errors: outcome.errors,
            warnings: outcome.warnings,
            detail: outcome.validation.isValid
              ? 'DecisionResult validation completed.'
              : 'DecisionResult validation failed.',
            ...endReportStageTimer(timer)
          };

          if (!outcome.validation.isValid) {
            halt = true;
          }
        } else if (definition.id === 'rapor-derleme') {
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
                      REPORT_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
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
            detail: 'ReportModel assembly completed.',
            ...endReportStageTimer(timer)
          };
        } else {
          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: 'not-implemented',
            errors: [createNotImplementedIssue(definition.id, definition.name)],
            warnings: [],
            detail: 'Placeholder stage executed.',
            ...endReportStageTimer(timer)
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
              REPORT_RUNTIME_ERROR_CODES.UNEXPECTED,
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
          ...endReportStageTimer(timer)
        };
        halt = true;
      }

      context.stageExecutions.push(execution);
    }

    const lastStage =
      context.stageExecutions[context.stageExecutions.length - 1]?.stageId ??
      'rapor-derleme';
    const totalDurationMs = Math.max(
      0,
      Math.round(nowMs() - context.startedMark)
    );
    const reportModel = buildReportModel(context, lastStage);
    context.bag.reportModel = reportModel;
    context.reportContext.status = reportModel.status;
    context.reportContext.currentStage = lastStage;

    return {
      reportModel,
      context,
      stageExecutions: context.stageExecutions,
      totalDurationMs,
      telemetry: buildTelemetry(context, totalDurationMs)
    };
  }
}

export function createReportPipelineRuntime(
  options?: ReportPipelineRuntimeOptions
): ReportPipelineRuntime {
  return new ReportPipelineRuntime(options);
}

export default ReportPipelineRuntime;
