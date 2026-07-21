/**
 * İSTEBUL Business Export Engine — dışa aktarım yüzeyi.
 *
 * Architecture Freeze v1.0 — tanım ve port katmanı.
 * Pipeline Runtime (PR-106A) additive; gerçek PDF/DOCX/XLSX/PPTX/HTML/CSV üretimi yoktur.
 */

export { EXPORT_MODEL_COUNT, EXPORT_STATUS_LABELS } from './models/index';
export type {
  ExportStage,
  ExportStatus,
  ExportFormat,
  ExportTarget,
  ExportTargetKind,
  ExportTemplate,
  ExportMetadata,
  ExportArtifact,
  ExportSummary,
  ExportRequest,
  ExportResult,
  ExportContext
} from './models/index';

export { EXPORT_ENGINE_PORT_COUNT } from './ports/index';
export type {
  IExportEngine,
  IExportPipeline,
  IFormatResolver,
  ITemplateResolver,
  IExportComposer,
  IArtifactBuilder
} from './ports/index';

export type { ExportPipelineStageDefinition } from './pipeline/ExportPipeline';
export {
  EXPORT_PIPELINE_STAGES,
  EXPORT_PIPELINE_STAGE_COUNT,
  getExportPipelineStage,
  listExportPipelineStages
} from './pipeline/ExportPipeline';

export {
  EXPORT_RUNTIME_ERROR_CODES,
  ExportPipelineRuntime,
  createExportPipelineRuntime,
  nowMs,
  startExportStageTimer,
  endExportStageTimer
} from './pipeline/runtime/index';
export type {
  ExportTiming,
  ExportStageTimer,
  ExportRuntimeIssue,
  ExportStageExecution,
  ExportStageExecutionOutcome,
  ExportModel,
  ExportPipelineBag,
  ExportPipelineContext,
  ExportPipelineSummary,
  ExportPipelineTelemetry,
  ExportPipelineResult,
  ExportRuntimeErrorCode,
  ExportContextResolver,
  ExportPipelineRuntimeOptions
} from './pipeline/runtime/index';

/** Export Model Builder Runtime (PR-106B) */
export {
  EXPORT_PART_LABELS,
  EXPORT_PART_ORDER,
  createExportModelContext,
  PIPELINE_BAG_EXPORT_MODEL_RUNTIME_RESULT_KEY,
  ExportRegistryRuntime,
  createExportRegistryRuntime,
  ExportModelBuilderRuntime,
  createExportModelBuilderRuntime,
  attachExportModelToPipelineContext,
  readExportModelFromPipelineContext,
  attachExportModelToPipelineResult,
  readExportModelFromPipelineResult,
  applyExportModelBuilderToPipelineResult
} from './modelBuilder/runtime/index';
export type {
  ExportPartId,
  ExportPartDefinition,
  ExportContent,
  ExportDocumentReference,
  ExportDocumentReferences,
  ExportDashboardReference,
  ExportDashboardReferences,
  ExportReportReferenceSource,
  ExportReportReference,
  ExportReportReferences,
  ExportSectionReferenceSource,
  ExportSectionReference,
  ExportSectionReferences,
  ExportWidgetReference,
  ExportWidgetReferences,
  ExportKpiReference,
  ExportKpiReferences,
  ExportModelContext,
  ExportModelWarning,
  ExportModelTelemetry,
  ExportModelResult,
  ExportModel as ExportBuilderModel,
  ExportMetadata as ExportBuilderMetadata
} from './modelBuilder/runtime/index';

/** Export Renderer Runtime (PR-106C) */
export {
  RENDER_PART_LABELS,
  RENDER_PART_ORDER,
  createRendererContext,
  PIPELINE_BAG_EXPORT_RENDERER_RUNTIME_RESULT_KEY,
  RendererRegistryRuntime,
  createRendererRegistryRuntime,
  RendererRuntime,
  createRendererRuntime,
  attachRendererToPipelineContext,
  readRendererFromPipelineContext,
  attachRendererToPipelineResult,
  readRendererFromPipelineResult,
  applyExportRendererToPipelineResult
} from './renderer/runtime/index';
export type {
  RenderPartId,
  RenderPartDefinition,
  RenderBlockKind,
  RenderBlockSource,
  RenderBlock,
  RenderSection,
  RenderMetadata,
  RenderHeader,
  RenderFooter,
  RenderDocument,
  RendererContext,
  RendererWarning,
  RendererTelemetry,
  RendererResult
} from './renderer/runtime/index';

export {
  EXPORT_REGISTRY_STRUCTURE_COUNT,
  EXPORT_PROFILE_REGISTRY,
  EXPORT_PROFILE_REGISTRY_COUNT,
  EXPORT_FORMAT_REGISTRY,
  EXPORT_FORMAT_REGISTRY_COUNT,
  EXPORT_TEMPLATE_REGISTRY,
  EXPORT_TEMPLATE_REGISTRY_COUNT,
  EXPORT_ARTIFACT_REGISTRY,
  EXPORT_ARTIFACT_REGISTRY_COUNT,
  listExportProfiles,
  getExportProfileById,
  listExportFormats,
  getExportFormatById,
  listExportTemplates,
  getExportTemplateById,
  listArtifactDefinitions,
  getArtifactDefinitionById
} from './registry/index';
export type {
  ExportProfileDefinition,
  ArtifactDefinitionEntry
} from './registry/index';

export {
  EXPORT_ENGINE_SCHEMA_VERSION,
  EXPORT_ENGINE_NAME,
  EXPORT_ENGINE_DEFAULT_LOCALE,
  EXPORT_PIPELINE_STAGE_IDS,
  EXPORT_REGISTRY_KIND
} from './constants/ExportEngineConstants';
export type { ExportRegistryKind } from './constants/ExportEngineConstants';

export type { FormatDefinitionEntry } from './formats/FormatContract';
export type { TemplateDefinitionEntry } from './templates/TemplateContract';
