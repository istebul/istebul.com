/**
 * İSTEBUL Business Dashboard Engine — Pipeline Runtime Orchestrator (PR-105A).
 *
 * Dashboard Validation gerçek çalışır.
 * Widget / Layout / Filter / Composition aşamaları bu PR'da placeholder olarak kalır.
 * Henüz widget, KPI board veya UI üretmez.
 */

import type { AnalysisResult } from '../../../analysis/models/AnalysisResult';
import type {
  AnalysisStage,
  AnalysisStatus
} from '../../../analysis/models/AnalysisStage';
import type { DecisionResult } from '../../../decision/models/DecisionResult';
import type {
  DecisionStage,
  DecisionStatus
} from '../../../decision/models/DecisionStage';
import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { ValidationResult } from '../../../dataset/validators/ValidationResult';
import type { ReportModel } from '../../../report/models/ReportModel';
import type {
  ReportExecutionStatus,
  ReportStage
} from '../../../report/models/ReportStage';
import {
  DASHBOARD_ENGINE_DEFAULT_LOCALE,
  DASHBOARD_ENGINE_SCHEMA_VERSION
} from '../../constants/DashboardEngineConstants';
import type { DashboardContext } from '../../models/DashboardContext';
import type { DashboardLayout } from '../../models/DashboardLayout';
import type { DashboardModel } from '../../models/DashboardModel';
import type { DashboardRequest } from '../../models/DashboardRequest';
import type {
  DashboardExecutionStatus,
  DashboardStage
} from '../../models/DashboardStage';
import type { DashboardTheme } from '../../models/DashboardTheme';
import type { IDashboardPipeline } from '../../ports/IDashboardPipeline';
import {
  DASHBOARD_PIPELINE_STAGES,
  type DashboardPipelineStageDefinition
} from '../DashboardPipeline';
import type { DashboardPipelineContext } from './DashboardPipelineContext';
import type {
  DashboardPipelineResult,
  DashboardPipelineSummary,
  DashboardPipelineTelemetry
} from './DashboardPipelineResult';
import type {
  DashboardRuntimeIssue,
  DashboardStageExecution
} from './DashboardStageExecution';
import {
  endDashboardStageTimer,
  nowMs,
  startDashboardStageTimer
} from './DashboardTiming';

export const DASHBOARD_RUNTIME_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: 'INVALID_REQUEST',
  CONTEXT_NOT_AVAILABLE: 'CONTEXT_NOT_AVAILABLE',
  SOURCE_REQUIRED: 'SOURCE_REQUIRED',
  REPORT_MODEL_REQUIRED: 'REPORT_MODEL_REQUIRED',
  REPORT_MODEL_ID_MISMATCH: 'REPORT_MODEL_ID_MISMATCH',
  DATASET_ID_MISMATCH: 'DATASET_ID_MISMATCH',
  DECISION_REQUEST_ID_MISMATCH: 'DECISION_REQUEST_ID_MISMATCH',
  ANALYSIS_REQUEST_ID_MISMATCH: 'ANALYSIS_REQUEST_ID_MISMATCH',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  UNEXPECTED: 'UNEXPECTED'
} as const);

export type DashboardRuntimeErrorCode =
  (typeof DASHBOARD_RUNTIME_ERROR_CODES)[keyof typeof DASHBOARD_RUNTIME_ERROR_CODES];

export type DashboardContextResolver = (
  request: DashboardRequest
) => Promise<DashboardContext>;

export interface DashboardPipelineRuntimeOptions {
  /** `run(request)` için context çözücü */
  contextResolver?: DashboardContextResolver;
  /** Test / tek seferlik kullanım için hazır context */
  initialContext?: DashboardContext;
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

const VALID_REPORT_STATUSES: readonly ReportExecutionStatus[] = [
  'bekliyor',
  'suruyor',
  'basarili',
  'basarisiz',
  'iptal'
];

const VALID_REPORT_STAGES: readonly ReportStage[] = [
  'karar-dogrulama',
  'bolum-derleme',
  'kanit-toplama',
  'rapor-birlestirme',
  'rapor-inceleme',
  'rapor-derleme'
];

const DEFAULT_LAYOUT_ID = 'dashboard-layout-default';
const DEFAULT_THEME_ID = 'dashboard-theme-default';

function createIssue(
  code: string,
  message: string,
  options?: Readonly<{
    stage?: DashboardStage;
    detail?: string;
    recoverable?: boolean;
  }>
): DashboardRuntimeIssue {
  return {
    code,
    message,
    stage: options?.stage,
    detail: options?.detail,
    recoverable: options?.recoverable
  };
}

function createNotImplementedIssue(
  stage: DashboardStage,
  stageName: string
): DashboardRuntimeIssue {
  return createIssue(
    DASHBOARD_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
    `${stageName} aşaması henüz uygulanmadı.`,
    {
      stage,
      detail: `Stage '${stage}' is not implemented in Dashboard Pipeline Runtime (PR-105A).`,
      recoverable: false
    }
  );
}

function createEmptyReportModel(request: DashboardRequest): ReportModel {
  return {
    id: request.reportModelId || 'unknown-report',
    metadata: {
      id: request.reportModelId || 'unknown-report',
      title: '',
      reportDnaId: request.reportDnaId || 'unknown-report-dna',
      locale: request.locale ?? DASHBOARD_ENGINE_DEFAULT_LOCALE,
      createdAt: new Date().toISOString(),
      version: '0.0.0'
    },
    status: 'basarisiz',
    lastStage: 'rapor-derleme',
    executiveSummary: {
      headline: '',
      body: '',
      highlights: Object.freeze([])
    },
    sections: Object.freeze([]),
    findings: Object.freeze([]),
    recommendations: Object.freeze([]),
    appendices: Object.freeze([]),
    references: Object.freeze([])
  };
}

function createFallbackDashboardContext(
  request: DashboardRequest
): DashboardContext {
  return {
    dashboardJobId: request.id || 'unknown-dashboard-job',
    locale: request.locale ?? DASHBOARD_ENGINE_DEFAULT_LOCALE,
    layoutId: request.layoutId ?? DEFAULT_LAYOUT_ID,
    themeId: request.themeId ?? DEFAULT_THEME_ID,
    currentStage: 'dashboard-dogrulama',
    status: 'bekliyor',
    reportModel: createEmptyReportModel(request),
    metadata: undefined
  };
}

function createPipelineContext(
  request: DashboardRequest,
  dashboardContext: DashboardContext
): DashboardPipelineContext {
  return {
    request,
    dashboardContext,
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

function createSkeletonLayout(layoutId: string): DashboardLayout {
  return {
    id: layoutId,
    name: 'Varsayılan yerleşim',
    columnCount: 12,
    rowHeightToken: 'dashboard.row.height.default',
    density: 'standart',
    gapToken: 'dashboard.gap.default'
  };
}

function createSkeletonTheme(themeId: string, layoutId: string): DashboardTheme {
  return {
    id: themeId,
    name: 'Varsayılan tema',
    description: 'Dashboard Pipeline Runtime (PR-105A) iskelet teması.',
    defaultLayoutId: layoutId,
    surfaceColorToken: 'dashboard.color.surface',
    accentColorToken: 'dashboard.color.accent',
    typographyToken: 'dashboard.typography.default',
    version: DASHBOARD_ENGINE_SCHEMA_VERSION
  };
}

function validateReportModel(
  reportModel: ReportModel | undefined,
  request: DashboardRequest,
  results: ValidationResult[],
  required: boolean
): void {
  const pushError = (code: string, message: string) => {
    results.push({ severity: 'error', code, message });
  };
  const pushWarning = (code: string, message: string) => {
    results.push({ severity: 'warning', code, message });
  };

  if (!reportModel || typeof reportModel !== 'object') {
    if (required) {
      pushError(
        DASHBOARD_RUNTIME_ERROR_CODES.REPORT_MODEL_REQUIRED,
        'DashboardContext.reportModel (ReportResult) zorunludur.'
      );
    }
    return;
  }

  if (!reportModel.id || typeof reportModel.id !== 'string') {
    pushError(
      'REPORT_MODEL_ID_REQUIRED',
      'ReportModel.id zorunludur.'
    );
  }
  if (
    reportModel.id &&
    request.reportModelId &&
    reportModel.id !== request.reportModelId
  ) {
    pushError(
      DASHBOARD_RUNTIME_ERROR_CODES.REPORT_MODEL_ID_MISMATCH,
      'Request.reportModelId ile ReportModel.id eşleşmiyor.'
    );
  }

  if (!reportModel.metadata || typeof reportModel.metadata !== 'object') {
    pushError(
      'REPORT_METADATA_REQUIRED',
      'ReportModel.metadata zorunludur.'
    );
  } else {
    if (
      !reportModel.metadata.reportDnaId ||
      typeof reportModel.metadata.reportDnaId !== 'string'
    ) {
      pushError(
        'REPORT_DNA_ID_REQUIRED',
        'ReportModel.metadata.reportDnaId zorunludur.'
      );
    } else if (
      request.reportDnaId &&
      reportModel.metadata.reportDnaId !== request.reportDnaId
    ) {
      pushError(
        'REPORT_DNA_ID_MISMATCH',
        'Request.reportDnaId ile ReportModel.metadata.reportDnaId eşleşmiyor.'
      );
    }
  }

  if (
    !reportModel.status ||
    !VALID_REPORT_STATUSES.includes(reportModel.status)
  ) {
    pushError(
      'REPORT_STATUS_INVALID',
      'ReportModel.status geçerli bir değer olmalıdır.'
    );
  } else if (reportModel.status === 'basarisiz') {
    pushWarning(
      'REPORT_STATUS_FAILED',
      'ReportModel.status basarisiz; dashboard çıktısı sınırlı olabilir.'
    );
  } else if (
    reportModel.status === 'bekliyor' ||
    reportModel.status === 'suruyor'
  ) {
    pushWarning(
      'REPORT_STATUS_INCOMPLETE',
      'ReportModel henüz tamamlanmamış görünüyor.'
    );
  }

  if (
    !reportModel.lastStage ||
    !VALID_REPORT_STAGES.includes(reportModel.lastStage)
  ) {
    pushError(
      'REPORT_LAST_STAGE_INVALID',
      'ReportModel.lastStage geçerli bir aşama kimliği olmalıdır.'
    );
  }

  if (
    !reportModel.executiveSummary ||
    typeof reportModel.executiveSummary !== 'object'
  ) {
    pushError(
      'REPORT_EXECUTIVE_SUMMARY_REQUIRED',
      'ReportModel.executiveSummary zorunludur.'
    );
  }

  if (!Array.isArray(reportModel.sections)) {
    pushError(
      'REPORT_SECTIONS_REQUIRED',
      'ReportModel.sections dizi olmalıdır.'
    );
  }
  if (!Array.isArray(reportModel.findings)) {
    pushError(
      'REPORT_FINDINGS_REQUIRED',
      'ReportModel.findings dizi olmalıdır.'
    );
  }
  if (!Array.isArray(reportModel.recommendations)) {
    pushError(
      'REPORT_RECOMMENDATIONS_REQUIRED',
      'ReportModel.recommendations dizi olmalıdır.'
    );
  }
  if (!Array.isArray(reportModel.appendices)) {
    pushError(
      'REPORT_APPENDICES_REQUIRED',
      'ReportModel.appendices dizi olmalıdır.'
    );
  }
  if (!Array.isArray(reportModel.references)) {
    pushError(
      'REPORT_REFERENCES_REQUIRED',
      'ReportModel.references dizi olmalıdır.'
    );
  }

  if (
    Array.isArray(reportModel.sections) &&
    reportModel.sections.length === 0 &&
    Array.isArray(reportModel.findings) &&
    reportModel.findings.length === 0 &&
    Array.isArray(reportModel.recommendations) &&
    reportModel.recommendations.length === 0
  ) {
    pushWarning(
      'REPORT_CONTENT_EMPTY',
      'ReportModel bölüm/bulgu/öneri içeriği boş; widget/KPI girdileri sınırlı olabilir.'
    );
  }
}

function validateDecisionResult(
  decisionResult: DecisionResult | undefined,
  request: DashboardRequest,
  results: ValidationResult[]
): void {
  if (!decisionResult || typeof decisionResult !== 'object') {
    return;
  }

  const pushError = (code: string, message: string) => {
    results.push({ severity: 'error', code, message });
  };
  const pushWarning = (code: string, message: string) => {
    results.push({ severity: 'warning', code, message });
  };

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
      DASHBOARD_RUNTIME_ERROR_CODES.DECISION_REQUEST_ID_MISMATCH,
      'Request.decisionRequestId ile DecisionResult.requestId eşleşmiyor.'
    );
  }

  if (!decisionResult.datasetId || typeof decisionResult.datasetId !== 'string') {
    pushError(
      'DECISION_DATASET_ID_REQUIRED',
      'DecisionResult.datasetId zorunludur.'
    );
  } else if (
    request.datasetId &&
    decisionResult.datasetId !== request.datasetId
  ) {
    pushError(
      DASHBOARD_RUNTIME_ERROR_CODES.DATASET_ID_MISMATCH,
      'Request.datasetId ile DecisionResult.datasetId eşleşmiyor.'
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
      'DecisionResult.status basarisiz; dashboard çıktısı sınırlı olabilir.'
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

  if (!Array.isArray(decisionResult.recommendations)) {
    pushError(
      'DECISION_RECOMMENDATIONS_REQUIRED',
      'DecisionResult.recommendations dizi olmalıdır.'
    );
  }
  if (!Array.isArray(decisionResult.scores)) {
    pushError(
      'DECISION_SCORES_REQUIRED',
      'DecisionResult.scores dizi olmalıdır.'
    );
  }
}

function validateAnalysisResult(
  analysisResult: AnalysisResult | undefined,
  request: DashboardRequest,
  results: ValidationResult[]
): void {
  if (!analysisResult || typeof analysisResult !== 'object') {
    return;
  }

  const pushError = (code: string, message: string) => {
    results.push({ severity: 'error', code, message });
  };
  const pushWarning = (code: string, message: string) => {
    results.push({ severity: 'warning', code, message });
  };

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
      DASHBOARD_RUNTIME_ERROR_CODES.ANALYSIS_REQUEST_ID_MISMATCH,
      'Request.analysisRequestId ile AnalysisResult.requestId eşleşmiyor.'
    );
  }

  if (!analysisResult.datasetId || typeof analysisResult.datasetId !== 'string') {
    pushError(
      'ANALYSIS_DATASET_ID_REQUIRED',
      'AnalysisResult.datasetId zorunludur.'
    );
  } else if (
    request.datasetId &&
    analysisResult.datasetId !== request.datasetId
  ) {
    pushError(
      DASHBOARD_RUNTIME_ERROR_CODES.DATASET_ID_MISMATCH,
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
      'AnalysisResult.status basarisiz; dashboard çıktısı sınırlı olabilir.'
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
}

function validateDashboardSources(
  dashboardContext: DashboardContext,
  request: DashboardRequest
): {
  validation: BusinessValidationResult;
  warnings: DashboardRuntimeIssue[];
  errors: DashboardRuntimeIssue[];
} {
  const results: ValidationResult[] = [];
  const hasAnalysis = Boolean(dashboardContext.analysisResult);
  const hasDecision = Boolean(dashboardContext.decisionResult);
  const hasReport = Boolean(dashboardContext.reportModel);

  if (!hasAnalysis && !hasDecision && !hasReport) {
    results.push({
      severity: 'error',
      code: DASHBOARD_RUNTIME_ERROR_CODES.SOURCE_REQUIRED,
      message:
        'DashboardContext en az bir kaynak (analysisResult, decisionResult veya reportModel) içermelidir.'
    });
  }

  // ReportResult (ReportModel) — pipeline girdisi; mevcutsa yapısal doğrulama
  validateReportModel(
    dashboardContext.reportModel,
    request,
    results,
    hasReport && !hasAnalysis && !hasDecision
  );

  validateDecisionResult(dashboardContext.decisionResult, request, results);
  validateAnalysisResult(dashboardContext.analysisResult, request, results);

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
          stage: 'dashboard-dogrulama',
          recoverable: true
        })
      ),
    errors: results
      .filter((result) => result.severity === 'error')
      .map((result) =>
        createIssue(result.code, result.message, {
          stage: 'dashboard-dogrulama',
          recoverable: false
        })
      )
  };
}

function validateRequest(
  request: DashboardRequest
): DashboardRuntimeIssue | undefined {
  if (!request?.id || typeof request.id !== 'string') {
    return createIssue(
      DASHBOARD_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Dashboard isteği kimliği geçersiz.',
      { detail: 'DashboardRequest.id is required.', recoverable: false }
    );
  }
  if (!request?.reportDnaId || typeof request.reportDnaId !== 'string') {
    return createIssue(
      DASHBOARD_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Dashboard Report DNA kimliği geçersiz.',
      {
        detail: 'DashboardRequest.reportDnaId is required.',
        recoverable: false
      }
    );
  }
  if (!request?.datasetId || typeof request.datasetId !== 'string') {
    return createIssue(
      DASHBOARD_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Dashboard dataset kimliği geçersiz.',
      { detail: 'DashboardRequest.datasetId is required.', recoverable: false }
    );
  }
  return undefined;
}

function buildTelemetry(
  context: DashboardPipelineContext,
  totalDurationMs: number
): DashboardPipelineTelemetry {
  const stageDurationsMs: Partial<Record<DashboardStage, number>> = {};
  const stageOutcomes: Partial<
    Record<DashboardStage, DashboardStageExecution['outcome']>
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

  const summary: DashboardPipelineSummary = {
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

function buildDashboardModel(
  context: DashboardPipelineContext,
  lastStage: DashboardStage
): DashboardModel {
  const hasHardFailure = context.stageExecutions.some(
    (execution) => execution.outcome === 'basarisiz'
  );
  const hasNotImplemented = context.stageExecutions.some(
    (execution) => execution.outcome === 'not-implemented'
  );

  let status: DashboardExecutionStatus;
  if (hasHardFailure || hasNotImplemented) {
    status = 'basarisiz';
  } else {
    status = 'basarili';
  }

  const now = new Date().toISOString();
  const bag = context.bag;
  const layoutId =
    bag.layout?.id ??
    context.dashboardContext.layoutId ??
    context.request.layoutId ??
    DEFAULT_LAYOUT_ID;
  const themeId =
    bag.theme?.id ??
    context.dashboardContext.themeId ??
    context.request.themeId ??
    DEFAULT_THEME_ID;

  return {
    id: context.request.id,
    metadata: {
      id: context.request.id,
      title: 'Dashboard taslağı',
      description: 'Dashboard Pipeline Runtime (PR-105A) iskelet çıktısı.',
      reportDnaId: context.request.reportDnaId,
      datasetId: context.request.datasetId,
      locale: context.dashboardContext.locale,
      createdAt: now,
      version: DASHBOARD_ENGINE_SCHEMA_VERSION,
      layoutId,
      themeId
    },
    status,
    lastStage,
    layout: bag.layout ?? createSkeletonLayout(layoutId),
    theme: bag.theme ?? createSkeletonTheme(themeId, layoutId),
    sections: bag.sections ?? Object.freeze([]),
    widgets: bag.widgets ?? Object.freeze([]),
    kpis: bag.kpis ?? Object.freeze([]),
    filters: bag.filters ?? Object.freeze([]),
    navigation: bag.navigation ?? { items: Object.freeze([]) }
  };
}

/**
 * Dashboard Pipeline Runtime — sıralı aşama orchestrator'ı.
 */
export class DashboardPipelineRuntime implements IDashboardPipeline {
  readonly stages: readonly DashboardPipelineStageDefinition[] =
    DASHBOARD_PIPELINE_STAGES;

  private readonly contextResolver?: DashboardContextResolver;

  private readonly initialContext?: DashboardContext;

  constructor(options: DashboardPipelineRuntimeOptions = {}) {
    this.contextResolver = options.contextResolver;
    this.initialContext = options.initialContext;
  }

  async run(request: DashboardRequest): Promise<DashboardModel> {
    const detailed = await this.runWithDetails(request);
    return detailed.dashboardModel;
  }

  async runWithDetails(
    request: DashboardRequest,
    explicitContext?: DashboardContext
  ): Promise<DashboardPipelineResult> {
    const resolvedContext =
      explicitContext ??
      this.initialContext ??
      (this.contextResolver ? await this.contextResolver(request) : undefined) ??
      createFallbackDashboardContext(request);

    const context = createPipelineContext(request, {
      ...resolvedContext,
      currentStage: 'dashboard-dogrulama',
      status: 'suruyor'
    });

    const requestValidationError = validateRequest(request);
    if (requestValidationError) {
      const stage = this.stages[0];
      const timing = endDashboardStageTimer(startDashboardStageTimer());
      context.stageExecutions.push({
        stageId: stage.id,
        stageName: stage.name,
        outcome: 'basarisiz',
        errors: [requestValidationError],
        warnings: [],
        detail: 'Request validation failed before stage loop.',
        ...timing
      });
      context.dashboardContext.status = 'basarisiz';
      context.dashboardContext.currentStage = stage.id;
      const totalDurationMs = Math.max(
        0,
        Math.round(nowMs() - context.startedMark)
      );
      const dashboardModel = buildDashboardModel(context, stage.id);
      return {
        dashboardModel,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs,
        telemetry: buildTelemetry(context, totalDurationMs)
      };
    }

    if (!explicitContext && !this.initialContext && !this.contextResolver) {
      const stage = this.stages[0];
      const timing = endDashboardStageTimer(startDashboardStageTimer());
      context.stageExecutions.push({
        stageId: stage.id,
        stageName: stage.name,
        outcome: 'basarisiz',
        errors: [
          createIssue(
            DASHBOARD_RUNTIME_ERROR_CODES.CONTEXT_NOT_AVAILABLE,
            'DashboardContext sağlanmadı.',
            {
              stage: stage.id,
              detail:
                'Provide explicit context, initialContext, or contextResolver to execute dashboard source validation.',
              recoverable: false
            }
          )
        ],
        warnings: [],
        detail: 'No dashboard context available.',
        ...timing
      });
      context.dashboardContext.status = 'basarisiz';
      context.dashboardContext.currentStage = stage.id;
      const totalDurationMs = Math.max(
        0,
        Math.round(nowMs() - context.startedMark)
      );
      const dashboardModel = buildDashboardModel(context, stage.id);
      return {
        dashboardModel,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs,
        telemetry: buildTelemetry(context, totalDurationMs)
      };
    }

    let halt = false;

    for (const definition of this.stages) {
      if (halt && definition.id !== 'dashboard-derleme') {
        const timing = endDashboardStageTimer(startDashboardStageTimer());
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

      context.dashboardContext.currentStage = definition.id;
      const timer = startDashboardStageTimer();
      let execution: DashboardStageExecution;

      try {
        if (definition.id === 'dashboard-dogrulama') {
          const outcome = validateDashboardSources(
            context.dashboardContext,
            request
          );
          context.bag.sourceValidation = outcome.validation;

          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: outcome.validation.isValid ? 'basarili' : 'basarisiz',
            errors: outcome.errors,
            warnings: outcome.warnings,
            detail: outcome.validation.isValid
              ? 'Dashboard source validation completed.'
              : 'Dashboard source validation failed.',
            ...endDashboardStageTimer(timer)
          };

          if (!outcome.validation.isValid) {
            halt = true;
          }
        } else if (definition.id === 'dashboard-derleme') {
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
                      DASHBOARD_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
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
            detail: 'DashboardModel assembly completed.',
            ...endDashboardStageTimer(timer)
          };
        } else {
          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: 'not-implemented',
            errors: [createNotImplementedIssue(definition.id, definition.name)],
            warnings: [],
            detail: 'Placeholder stage executed.',
            ...endDashboardStageTimer(timer)
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
              DASHBOARD_RUNTIME_ERROR_CODES.UNEXPECTED,
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
          ...endDashboardStageTimer(timer)
        };
        halt = true;
      }

      context.stageExecutions.push(execution);
    }

    const lastStage =
      context.stageExecutions[context.stageExecutions.length - 1]?.stageId ??
      'dashboard-derleme';
    const totalDurationMs = Math.max(
      0,
      Math.round(nowMs() - context.startedMark)
    );
    const dashboardModel = buildDashboardModel(context, lastStage);
    context.bag.dashboardModel = dashboardModel;
    context.dashboardContext.status = dashboardModel.status;
    context.dashboardContext.currentStage = lastStage;

    return {
      dashboardModel,
      context,
      stageExecutions: context.stageExecutions,
      totalDurationMs,
      telemetry: buildTelemetry(context, totalDurationMs)
    };
  }
}

export function createDashboardPipelineRuntime(
  options?: DashboardPipelineRuntimeOptions
): DashboardPipelineRuntime {
  return new DashboardPipelineRuntime(options);
}

export default DashboardPipelineRuntime;
