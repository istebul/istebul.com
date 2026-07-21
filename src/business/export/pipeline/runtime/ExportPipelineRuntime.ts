/**
 * İSTEBUL Business Export Engine — Pipeline Runtime Orchestrator (PR-106A).
 *
 * Export Validation gerçek çalışır.
 * Validation başarılıysa iskelet ExportModel bag'e yazılır.
 * Format / Template / Composition / Artifact aşamaları bu PR'da placeholder kalır.
 * Henüz renderer, format dosyası veya bayt üretmez.
 */

import type { DashboardModel } from '../../../dashboard/models/DashboardModel';
import type {
  DashboardExecutionStatus,
  DashboardStage
} from '../../../dashboard/models/DashboardStage';
import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { ValidationResult } from '../../../dataset/validators/ValidationResult';
import type { DocumentModel } from '../../../document/models/DocumentModel';
import type {
  DocumentExecutionStatus,
  DocumentStage
} from '../../../document/models/DocumentStage';
import type { OutputFormatId } from '../../../knowledge/outputs/OutputDefinition';
import {
  EXPORT_ENGINE_DEFAULT_LOCALE,
  EXPORT_ENGINE_SCHEMA_VERSION
} from '../../constants/ExportEngineConstants';
import type { ExportContext } from '../../models/ExportContext';
import type { ExportMetadata } from '../../models/ExportMetadata';
import type { ExportRequest } from '../../models/ExportRequest';
import type { ExportResult } from '../../models/ExportResult';
import type { ExportStage, ExportStatus } from '../../models/ExportStatus';
import type { ExportSummary } from '../../models/ExportSummary';
import type { IExportPipeline } from '../../ports/IExportPipeline';
import {
  EXPORT_PIPELINE_STAGES,
  type ExportPipelineStageDefinition
} from '../ExportPipeline';
import type {
  ExportModel,
  ExportPipelineContext
} from './ExportPipelineContext';
import type {
  ExportPipelineResult,
  ExportPipelineSummary,
  ExportPipelineTelemetry
} from './ExportPipelineResult';
import type {
  ExportRuntimeIssue,
  ExportStageExecution
} from './ExportStageExecution';
import {
  endExportStageTimer,
  nowMs,
  startExportStageTimer
} from './ExportTiming';

export const EXPORT_RUNTIME_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: 'INVALID_REQUEST',
  CONTEXT_NOT_AVAILABLE: 'CONTEXT_NOT_AVAILABLE',
  SOURCE_REQUIRED: 'SOURCE_REQUIRED',
  DOCUMENT_MODEL_REQUIRED: 'DOCUMENT_MODEL_REQUIRED',
  DOCUMENT_MODEL_ID_MISMATCH: 'DOCUMENT_MODEL_ID_MISMATCH',
  DASHBOARD_MODEL_REQUIRED: 'DASHBOARD_MODEL_REQUIRED',
  DASHBOARD_MODEL_ID_MISMATCH: 'DASHBOARD_MODEL_ID_MISMATCH',
  REPORT_DNA_ID_MISMATCH: 'REPORT_DNA_ID_MISMATCH',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  UNEXPECTED: 'UNEXPECTED'
} as const);

export type ExportRuntimeErrorCode =
  (typeof EXPORT_RUNTIME_ERROR_CODES)[keyof typeof EXPORT_RUNTIME_ERROR_CODES];

export type ExportContextResolver = (
  request: ExportRequest
) => Promise<ExportContext>;

export interface ExportPipelineRuntimeOptions {
  /** `run(request)` için context çözücü */
  contextResolver?: ExportContextResolver;
  /** Test / tek seferlik kullanım için hazır context */
  initialContext?: ExportContext;
}

const VALID_OUTPUT_FORMAT_IDS: readonly OutputFormatId[] = [
  'dashboard',
  'pdf',
  'word',
  'powerpoint',
  'excel',
  'csv',
  'json'
];

const VALID_DOCUMENT_STATUSES: readonly DocumentExecutionStatus[] = [
  'bekliyor',
  'suruyor',
  'basarili',
  'basarisiz',
  'iptal'
];

const VALID_DOCUMENT_STAGES: readonly DocumentStage[] = [
  'rapor-dogrulama',
  'yerlesim-derleme',
  'bolum-formatlama',
  'stil-cozumu',
  'dokuman-birlestirme',
  'dokuman-derleme'
];

const VALID_DASHBOARD_STATUSES: readonly DashboardExecutionStatus[] = [
  'bekliyor',
  'suruyor',
  'basarili',
  'basarisiz',
  'iptal'
];

const VALID_DASHBOARD_STAGES: readonly DashboardStage[] = [
  'dashboard-dogrulama',
  'widget-derleme',
  'yerlesim-cozumu',
  'filtre-cozumu',
  'dashboard-birlestirme',
  'dashboard-derleme'
];

const FORMAT_LABELS: Readonly<Record<OutputFormatId, string>> = Object.freeze({
  dashboard: 'Dashboard',
  pdf: 'PDF',
  word: 'Word',
  powerpoint: 'PowerPoint',
  excel: 'Excel',
  csv: 'CSV',
  json: 'JSON'
});

function createIssue(
  code: string,
  message: string,
  options?: Readonly<{
    stage?: ExportStage;
    detail?: string;
    recoverable?: boolean;
  }>
): ExportRuntimeIssue {
  return {
    code,
    message,
    stage: options?.stage,
    detail: options?.detail,
    recoverable: options?.recoverable
  };
}

function createNotImplementedIssue(
  stage: ExportStage,
  stageName: string
): ExportRuntimeIssue {
  return createIssue(
    EXPORT_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
    `${stageName} aşaması henüz uygulanmadı.`,
    {
      stage,
      detail: `Stage '${stage}' is not implemented in Export Pipeline Runtime (PR-106A).`,
      recoverable: false
    }
  );
}

function createEmptyDashboardModel(request: ExportRequest): DashboardModel {
  return {
    id: request.dashboardModelId || 'unknown-dashboard',
    metadata: {
      id: request.dashboardModelId || 'unknown-dashboard',
      title: '',
      reportDnaId: request.reportDnaId || 'unknown-report-dna',
      datasetId: 'unknown-dataset',
      locale: request.locale ?? EXPORT_ENGINE_DEFAULT_LOCALE,
      createdAt: new Date().toISOString(),
      version: '0.0.0',
      layoutId: 'unknown-layout',
      themeId: 'unknown-theme'
    },
    status: 'basarisiz',
    lastStage: 'dashboard-derleme',
    layout: {
      id: 'unknown-layout',
      name: '',
      columnCount: 12,
      rowHeightToken: '',
      density: 'standart',
      gapToken: ''
    },
    theme: {
      id: 'unknown-theme',
      name: '',
      description: '',
      defaultLayoutId: 'unknown-layout',
      surfaceColorToken: '',
      accentColorToken: '',
      typographyToken: '',
      version: '0.0.0'
    },
    sections: Object.freeze([]),
    widgets: Object.freeze([]),
    kpis: Object.freeze([]),
    filters: Object.freeze([]),
    navigation: { items: Object.freeze([]) }
  };
}

function createFallbackExportContext(request: ExportRequest): ExportContext {
  return {
    exportJobId: request.id || 'unknown-export-job',
    locale: request.locale ?? EXPORT_ENGINE_DEFAULT_LOCALE,
    currentStage: 'export-dogrulama',
    status: 'bekliyor',
    dashboardModel: request.dashboardModelId
      ? createEmptyDashboardModel(request)
      : undefined,
    documentModel: undefined,
    metadata: undefined
  };
}

function createPipelineContext(
  request: ExportRequest,
  exportContext: ExportContext
): ExportPipelineContext {
  return {
    request,
    exportContext,
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

function validateDocumentModel(
  documentModel: DocumentModel | undefined,
  request: ExportRequest,
  results: ValidationResult[],
  required: boolean
): void {
  const pushError = (code: string, message: string) => {
    results.push({ severity: 'error', code, message });
  };
  const pushWarning = (code: string, message: string) => {
    results.push({ severity: 'warning', code, message });
  };

  if (!documentModel || typeof documentModel !== 'object') {
    if (required) {
      pushError(
        EXPORT_RUNTIME_ERROR_CODES.DOCUMENT_MODEL_REQUIRED,
        'ExportContext.documentModel zorunludur.'
      );
    }
    return;
  }

  if (!documentModel.id || typeof documentModel.id !== 'string') {
    pushError(
      'DOCUMENT_MODEL_ID_REQUIRED',
      'DocumentModel.id zorunludur.'
    );
  }
  if (
    documentModel.id &&
    request.documentModelId &&
    documentModel.id !== request.documentModelId
  ) {
    pushError(
      EXPORT_RUNTIME_ERROR_CODES.DOCUMENT_MODEL_ID_MISMATCH,
      'Request.documentModelId ile DocumentModel.id eşleşmiyor.'
    );
  }

  if (!documentModel.metadata || typeof documentModel.metadata !== 'object') {
    pushError(
      'DOCUMENT_METADATA_REQUIRED',
      'DocumentModel.metadata zorunludur.'
    );
  } else {
    if (
      !documentModel.metadata.reportDnaId ||
      typeof documentModel.metadata.reportDnaId !== 'string'
    ) {
      pushError(
        'DOCUMENT_REPORT_DNA_ID_REQUIRED',
        'DocumentModel.metadata.reportDnaId zorunludur.'
      );
    } else if (
      request.reportDnaId &&
      documentModel.metadata.reportDnaId !== request.reportDnaId
    ) {
      pushError(
        EXPORT_RUNTIME_ERROR_CODES.REPORT_DNA_ID_MISMATCH,
        'Request.reportDnaId ile DocumentModel.metadata.reportDnaId eşleşmiyor.'
      );
    }
  }

  if (
    !documentModel.status ||
    !VALID_DOCUMENT_STATUSES.includes(documentModel.status)
  ) {
    pushError(
      'DOCUMENT_STATUS_INVALID',
      'DocumentModel.status geçerli bir değer olmalıdır.'
    );
  } else if (documentModel.status === 'basarisiz') {
    pushWarning(
      'DOCUMENT_STATUS_FAILED',
      'DocumentModel.status basarisiz; export çıktısı sınırlı olabilir.'
    );
  } else if (
    documentModel.status === 'bekliyor' ||
    documentModel.status === 'suruyor'
  ) {
    pushWarning(
      'DOCUMENT_STATUS_INCOMPLETE',
      'DocumentModel henüz tamamlanmamış görünüyor.'
    );
  }

  if (
    !documentModel.lastStage ||
    !VALID_DOCUMENT_STAGES.includes(documentModel.lastStage)
  ) {
    pushError(
      'DOCUMENT_LAST_STAGE_INVALID',
      'DocumentModel.lastStage geçerli bir aşama kimliği olmalıdır.'
    );
  }

  if (!documentModel.layout || typeof documentModel.layout !== 'object') {
    pushError('DOCUMENT_LAYOUT_REQUIRED', 'DocumentModel.layout zorunludur.');
  }
  if (!documentModel.style || typeof documentModel.style !== 'object') {
    pushError('DOCUMENT_STYLE_REQUIRED', 'DocumentModel.style zorunludur.');
  }
  if (!documentModel.theme || typeof documentModel.theme !== 'object') {
    pushError('DOCUMENT_THEME_REQUIRED', 'DocumentModel.theme zorunludur.');
  }
  if (!Array.isArray(documentModel.sections)) {
    pushError(
      'DOCUMENT_SECTIONS_REQUIRED',
      'DocumentModel.sections dizi olmalıdır.'
    );
  } else if (documentModel.sections.length === 0) {
    pushWarning(
      'DOCUMENT_CONTENT_EMPTY',
      'DocumentModel.sections boş; export içeriği sınırlı olabilir.'
    );
  }
}

function validateDashboardModel(
  dashboardModel: DashboardModel | undefined,
  request: ExportRequest,
  results: ValidationResult[],
  required: boolean
): void {
  const pushError = (code: string, message: string) => {
    results.push({ severity: 'error', code, message });
  };
  const pushWarning = (code: string, message: string) => {
    results.push({ severity: 'warning', code, message });
  };

  if (!dashboardModel || typeof dashboardModel !== 'object') {
    if (required) {
      pushError(
        EXPORT_RUNTIME_ERROR_CODES.DASHBOARD_MODEL_REQUIRED,
        'ExportContext.dashboardModel (DashboardResult) zorunludur.'
      );
    }
    return;
  }

  if (!dashboardModel.id || typeof dashboardModel.id !== 'string') {
    pushError(
      'DASHBOARD_MODEL_ID_REQUIRED',
      'DashboardModel.id zorunludur.'
    );
  }
  if (
    dashboardModel.id &&
    request.dashboardModelId &&
    dashboardModel.id !== request.dashboardModelId
  ) {
    pushError(
      EXPORT_RUNTIME_ERROR_CODES.DASHBOARD_MODEL_ID_MISMATCH,
      'Request.dashboardModelId ile DashboardModel.id eşleşmiyor.'
    );
  }

  if (!dashboardModel.metadata || typeof dashboardModel.metadata !== 'object') {
    pushError(
      'DASHBOARD_METADATA_REQUIRED',
      'DashboardModel.metadata zorunludur.'
    );
  } else {
    if (
      !dashboardModel.metadata.reportDnaId ||
      typeof dashboardModel.metadata.reportDnaId !== 'string'
    ) {
      pushError(
        'DASHBOARD_REPORT_DNA_ID_REQUIRED',
        'DashboardModel.metadata.reportDnaId zorunludur.'
      );
    } else if (
      request.reportDnaId &&
      dashboardModel.metadata.reportDnaId !== request.reportDnaId
    ) {
      pushError(
        EXPORT_RUNTIME_ERROR_CODES.REPORT_DNA_ID_MISMATCH,
        'Request.reportDnaId ile DashboardModel.metadata.reportDnaId eşleşmiyor.'
      );
    }

    if (
      !dashboardModel.metadata.datasetId ||
      typeof dashboardModel.metadata.datasetId !== 'string'
    ) {
      pushError(
        'DASHBOARD_DATASET_ID_REQUIRED',
        'DashboardModel.metadata.datasetId zorunludur.'
      );
    }
  }

  if (
    !dashboardModel.status ||
    !VALID_DASHBOARD_STATUSES.includes(dashboardModel.status)
  ) {
    pushError(
      'DASHBOARD_STATUS_INVALID',
      'DashboardModel.status geçerli bir değer olmalıdır.'
    );
  } else if (dashboardModel.status === 'basarisiz') {
    pushWarning(
      'DASHBOARD_STATUS_FAILED',
      'DashboardModel.status basarisiz; export çıktısı sınırlı olabilir.'
    );
  } else if (
    dashboardModel.status === 'bekliyor' ||
    dashboardModel.status === 'suruyor'
  ) {
    pushWarning(
      'DASHBOARD_STATUS_INCOMPLETE',
      'DashboardModel henüz tamamlanmamış görünüyor.'
    );
  }

  if (
    !dashboardModel.lastStage ||
    !VALID_DASHBOARD_STAGES.includes(dashboardModel.lastStage)
  ) {
    pushError(
      'DASHBOARD_LAST_STAGE_INVALID',
      'DashboardModel.lastStage geçerli bir aşama kimliği olmalıdır.'
    );
  }

  if (!dashboardModel.layout || typeof dashboardModel.layout !== 'object') {
    pushError(
      'DASHBOARD_LAYOUT_REQUIRED',
      'DashboardModel.layout zorunludur.'
    );
  }
  if (!dashboardModel.theme || typeof dashboardModel.theme !== 'object') {
    pushError('DASHBOARD_THEME_REQUIRED', 'DashboardModel.theme zorunludur.');
  }
  if (!dashboardModel.navigation || typeof dashboardModel.navigation !== 'object') {
    pushError(
      'DASHBOARD_NAVIGATION_REQUIRED',
      'DashboardModel.navigation zorunludur.'
    );
  }

  if (!Array.isArray(dashboardModel.sections)) {
    pushError(
      'DASHBOARD_SECTIONS_REQUIRED',
      'DashboardModel.sections dizi olmalıdır.'
    );
  }
  if (!Array.isArray(dashboardModel.widgets)) {
    pushError(
      'DASHBOARD_WIDGETS_REQUIRED',
      'DashboardModel.widgets dizi olmalıdır.'
    );
  }
  if (!Array.isArray(dashboardModel.kpis)) {
    pushError(
      'DASHBOARD_KPIS_REQUIRED',
      'DashboardModel.kpis dizi olmalıdır.'
    );
  }
  if (!Array.isArray(dashboardModel.filters)) {
    pushError(
      'DASHBOARD_FILTERS_REQUIRED',
      'DashboardModel.filters dizi olmalıdır.'
    );
  }

  if (
    Array.isArray(dashboardModel.sections) &&
    dashboardModel.sections.length === 0 &&
    Array.isArray(dashboardModel.widgets) &&
    dashboardModel.widgets.length === 0 &&
    Array.isArray(dashboardModel.kpis) &&
    dashboardModel.kpis.length === 0
  ) {
    pushWarning(
      'DASHBOARD_CONTENT_EMPTY',
      'DashboardModel bölüm/widget/KPI içeriği boş; export girdileri sınırlı olabilir.'
    );
  }
}

function validateExportSources(
  exportContext: ExportContext,
  request: ExportRequest
): {
  validation: BusinessValidationResult;
  warnings: ExportRuntimeIssue[];
  errors: ExportRuntimeIssue[];
} {
  const results: ValidationResult[] = [];
  const hasDocument = Boolean(exportContext.documentModel);
  const hasDashboard = Boolean(exportContext.dashboardModel);

  if (!hasDocument && !hasDashboard) {
    results.push({
      severity: 'error',
      code: EXPORT_RUNTIME_ERROR_CODES.SOURCE_REQUIRED,
      message:
        'ExportContext en az bir kaynak (documentModel veya dashboardModel) içermelidir.'
    });
  }

  validateDocumentModel(
    exportContext.documentModel,
    request,
    results,
    hasDocument && !hasDashboard
  );
  validateDashboardModel(
    exportContext.dashboardModel,
    request,
    results,
    hasDashboard && !hasDocument
  );

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
          stage: 'export-dogrulama',
          recoverable: true
        })
      ),
    errors: results
      .filter((result) => result.severity === 'error')
      .map((result) =>
        createIssue(result.code, result.message, {
          stage: 'export-dogrulama',
          recoverable: false
        })
      )
  };
}

function validateRequest(request: ExportRequest): ExportRuntimeIssue | undefined {
  if (!request?.id || typeof request.id !== 'string') {
    return createIssue(
      EXPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Export isteği kimliği geçersiz.',
      { detail: 'ExportRequest.id is required.', recoverable: false }
    );
  }
  if (!Array.isArray(request.formatIds) || request.formatIds.length === 0) {
    return createIssue(
      EXPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Export format listesi geçersiz.',
      {
        detail: 'ExportRequest.formatIds must be a non-empty array.',
        recoverable: false
      }
    );
  }
  for (const formatId of request.formatIds) {
    if (!VALID_OUTPUT_FORMAT_IDS.includes(formatId)) {
      return createIssue(
        EXPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
        'Export format kimliği geçersiz.',
        {
          detail: `Unsupported formatId: ${String(formatId)}`,
          recoverable: false
        }
      );
    }
  }
  if (!request.documentModelId && !request.dashboardModelId) {
    return createIssue(
      EXPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
      'Export kaynağı kimliği geçersiz.',
      {
        detail:
          'ExportRequest requires documentModelId and/or dashboardModelId.',
        recoverable: false
      }
    );
  }
  return undefined;
}

function createSkeletonExportModel(
  request: ExportRequest,
  exportContext: ExportContext
): ExportModel {
  return {
    id: `export-model-${request.id}`,
    requestId: request.id,
    locale: exportContext.locale,
    formatIds: Object.freeze([...request.formatIds]),
    documentModelId:
      request.documentModelId ?? exportContext.documentModel?.id,
    dashboardModelId:
      request.dashboardModelId ?? exportContext.dashboardModel?.id,
    reportDnaId: request.reportDnaId,
    templateId: request.templateId,
    targetId: request.targetId,
    status: 'suruyor',
    createdAt: new Date().toISOString(),
    version: EXPORT_ENGINE_SCHEMA_VERSION
  };
}

function createSkeletonSummary(request: ExportRequest): ExportSummary {
  const formatLabels = request.formatIds.map(
    (formatId) => FORMAT_LABELS[formatId] ?? formatId
  );
  return {
    headline: 'Export taslağı',
    artifactCount: 0,
    formatLabels: Object.freeze(formatLabels),
    warnings: Object.freeze([
      'Export Pipeline Runtime (PR-106A) iskelet özeti; renderer/format üretimi yok.'
    ])
  };
}

function buildTelemetry(
  context: ExportPipelineContext,
  totalDurationMs: number
): ExportPipelineTelemetry {
  const stageDurationsMs: Partial<Record<ExportStage, number>> = {};
  const stageOutcomes: Partial<
    Record<ExportStage, ExportStageExecution['outcome']>
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

  const summary: ExportPipelineSummary = {
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

function buildExportResult(
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
    title: 'Export taslağı',
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
    summary: bag.summary ?? createSkeletonSummary(context.request),
    completedAt: now
  };
}

/**
 * Export Pipeline Runtime — sıralı aşama orchestrator'ı.
 */
export class ExportPipelineRuntime implements IExportPipeline {
  readonly stages: readonly ExportPipelineStageDefinition[] =
    EXPORT_PIPELINE_STAGES;

  private readonly contextResolver?: ExportContextResolver;

  private readonly initialContext?: ExportContext;

  constructor(options: ExportPipelineRuntimeOptions = {}) {
    this.contextResolver = options.contextResolver;
    this.initialContext = options.initialContext;
  }

  async run(request: ExportRequest): Promise<ExportResult> {
    const detailed = await this.runWithDetails(request);
    return detailed.exportResult;
  }

  async runWithDetails(
    request: ExportRequest,
    explicitContext?: ExportContext
  ): Promise<ExportPipelineResult> {
    const resolvedContext =
      explicitContext ??
      this.initialContext ??
      (this.contextResolver ? await this.contextResolver(request) : undefined) ??
      createFallbackExportContext(request);

    const context = createPipelineContext(request, {
      ...resolvedContext,
      currentStage: 'export-dogrulama',
      status: 'suruyor'
    });

    const requestValidationError = validateRequest(request);
    if (requestValidationError) {
      const stage = this.stages[0];
      const timing = endExportStageTimer(startExportStageTimer());
      context.stageExecutions.push({
        stageId: stage.id,
        stageName: stage.name,
        outcome: 'basarisiz',
        errors: [requestValidationError],
        warnings: [],
        detail: 'Request validation failed before stage loop.',
        ...timing
      });
      context.exportContext.status = 'basarisiz';
      context.exportContext.currentStage = stage.id;
      const totalDurationMs = Math.max(
        0,
        Math.round(nowMs() - context.startedMark)
      );
      const exportResult = buildExportResult(context, stage.id);
      context.bag.exportResult = exportResult;
      return {
        exportResult,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs,
        telemetry: buildTelemetry(context, totalDurationMs)
      };
    }

    if (!explicitContext && !this.initialContext && !this.contextResolver) {
      const stage = this.stages[0];
      const timing = endExportStageTimer(startExportStageTimer());
      context.stageExecutions.push({
        stageId: stage.id,
        stageName: stage.name,
        outcome: 'basarisiz',
        errors: [
          createIssue(
            EXPORT_RUNTIME_ERROR_CODES.CONTEXT_NOT_AVAILABLE,
            'ExportContext sağlanmadı.',
            {
              stage: stage.id,
              detail:
                'Provide explicit context, initialContext, or contextResolver to execute export source validation.',
              recoverable: false
            }
          )
        ],
        warnings: [],
        detail: 'No export context available.',
        ...timing
      });
      context.exportContext.status = 'basarisiz';
      context.exportContext.currentStage = stage.id;
      const totalDurationMs = Math.max(
        0,
        Math.round(nowMs() - context.startedMark)
      );
      const exportResult = buildExportResult(context, stage.id);
      context.bag.exportResult = exportResult;
      return {
        exportResult,
        context,
        stageExecutions: context.stageExecutions,
        totalDurationMs,
        telemetry: buildTelemetry(context, totalDurationMs)
      };
    }

    let halt = false;

    for (const definition of this.stages) {
      if (halt && definition.id !== 'export-sonuc') {
        const timing = endExportStageTimer(startExportStageTimer());
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

      context.exportContext.currentStage = definition.id;
      const timer = startExportStageTimer();
      let execution: ExportStageExecution;

      try {
        if (definition.id === 'export-dogrulama') {
          const outcome = validateExportSources(
            context.exportContext,
            request
          );
          context.bag.validation = outcome.validation;

          if (outcome.validation.isValid) {
            context.bag.exportModel = createSkeletonExportModel(
              request,
              context.exportContext
            );
          }

          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: outcome.validation.isValid ? 'basarili' : 'basarisiz',
            errors: outcome.errors,
            warnings: outcome.warnings,
            detail: outcome.validation.isValid
              ? 'Export source validation completed; skeleton ExportModel created.'
              : 'Export source validation failed.',
            ...endExportStageTimer(timer)
          };

          if (!outcome.validation.isValid) {
            halt = true;
          }
        } else if (definition.id === 'export-sonuc') {
          const priorNotImplemented = context.stageExecutions.filter(
            (item) => item.outcome === 'not-implemented'
          );
          if (!context.bag.summary) {
            context.bag.summary = createSkeletonSummary(request);
          }
          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: 'basarili',
            errors: [],
            warnings:
              priorNotImplemented.length > 0
                ? [
                    createIssue(
                      EXPORT_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
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
            detail: 'ExportResult assembly completed.',
            ...endExportStageTimer(timer)
          };
        } else {
          execution = {
            stageId: definition.id,
            stageName: definition.name,
            outcome: 'not-implemented',
            errors: [createNotImplementedIssue(definition.id, definition.name)],
            warnings: [],
            detail: 'Placeholder stage executed.',
            ...endExportStageTimer(timer)
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
              EXPORT_RUNTIME_ERROR_CODES.UNEXPECTED,
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
          ...endExportStageTimer(timer)
        };
        halt = true;
      }

      context.stageExecutions.push(execution);
    }

    const lastStage =
      context.stageExecutions[context.stageExecutions.length - 1]?.stageId ??
      'export-sonuc';
    const totalDurationMs = Math.max(
      0,
      Math.round(nowMs() - context.startedMark)
    );
    const exportResult = buildExportResult(context, lastStage);
    context.bag.exportResult = exportResult;
    context.exportContext.status = exportResult.status;
    context.exportContext.currentStage = lastStage;

    return {
      exportResult,
      context,
      stageExecutions: context.stageExecutions,
      totalDurationMs,
      telemetry: buildTelemetry(context, totalDurationMs)
    };
  }
}

export function createExportPipelineRuntime(
  options?: ExportPipelineRuntimeOptions
): ExportPipelineRuntime {
  return new ExportPipelineRuntime(options);
}

export default ExportPipelineRuntime;
