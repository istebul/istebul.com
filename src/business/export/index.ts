/**
 * İSTEBUL Business Export Engine — dışa aktarım yüzeyi.
 *
 * Architecture Freeze v1.0 — tanım ve port katmanı.
 * Gerçek PDF/DOCX/XLSX/PPTX/HTML/CSV üretimi yoktur.
 */

export { EXPORT_MODEL_COUNT, EXPORT_STATUS_LABELS } from './models';
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
} from './models';

export { EXPORT_ENGINE_PORT_COUNT } from './ports';
export type {
  IExportEngine,
  IExportPipeline,
  IFormatResolver,
  ITemplateResolver,
  IExportComposer,
  IArtifactBuilder
} from './ports';

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
} from './registry';
export type {
  ExportProfileDefinition,
  ArtifactDefinitionEntry
} from './registry';

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
