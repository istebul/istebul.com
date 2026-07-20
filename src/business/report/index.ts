/**
 * İSTEBUL Business Report Engine — dışa aktarım yüzeyi.
 */

export { REPORT_MODEL_COUNT, REPORT_EXECUTION_STATUS_LABELS } from './models/index';
export type {
  ReportStage,
  ReportExecutionStatus,
  ReportRequest,
  ReportMetadata,
  ExecutiveSummary,
  ReportFinding,
  ReportFindingSeverity,
  ReportRecommendation,
  ReportSection,
  ReportSectionKind,
  ReportAppendix,
  ReportReference,
  ReportReferenceKind,
  ReportReview,
  ReportReviewVerdict,
  ReportModel,
  ReportContext
} from './models/index';

export { REPORT_ENGINE_PORT_COUNT } from './ports/index';
export type {
  IReportEngine,
  IReportPipeline,
  ISectionBuilder,
  IEvidenceCollector,
  IReportComposer,
  IReportReviewer
} from './ports/index';

export type { ReportPipelineStageDefinition } from './pipeline/ReportPipeline';
export {
  REPORT_PIPELINE_STAGES,
  REPORT_PIPELINE_STAGE_COUNT,
  getReportPipelineStage,
  listReportPipelineStages
} from './pipeline/ReportPipeline';
export {
  REPORT_RUNTIME_ERROR_CODES,
  ReportPipelineRuntime,
  createReportPipelineRuntime,
  nowMs,
  startReportStageTimer,
  endReportStageTimer
} from './pipeline/runtime/index';
export type {
  ReportTiming,
  ReportStageTimer,
  ReportRuntimeIssue,
  ReportStageExecution,
  ReportStageExecutionOutcome,
  ReportPipelineBag,
  ReportPipelineContext,
  ReportPipelineSummary,
  ReportPipelineTelemetry,
  ReportPipelineResult,
  ReportRuntimeErrorCode,
  ReportContextResolver,
  ReportPipelineRuntimeOptions
} from './pipeline/runtime/index';

export {
  REPORT_REGISTRY_STRUCTURE_COUNT,
  REPORT_PROFILE_REGISTRY,
  REPORT_PROFILE_REGISTRY_COUNT,
  SECTION_REGISTRY,
  SECTION_REGISTRY_COUNT,
  REFERENCE_REGISTRY,
  REFERENCE_REGISTRY_COUNT,
  TEMPLATE_REGISTRY_BRIDGE_OUTPUTS,
  TEMPLATE_REGISTRY_BRIDGE_REPORT_DNA,
  TEMPLATE_REGISTRY_BRIDGE_OUTPUT_COUNT,
  TEMPLATE_REGISTRY_BRIDGE_REPORT_DNA_COUNT,
  listReportProfiles,
  getReportProfileById,
  listSectionTemplates,
  getSectionTemplateByCode,
  listReferenceTemplates,
  getReferenceTemplateByCode,
  listBridgedOutputTemplates,
  listBridgedReportDna,
  getBridgedReportDnaById
} from './registry/index';
export type {
  ReportProfileDefinition,
  ReferenceTemplateDefinition,
  OutputDefinition,
  ReportDefinition
} from './registry/index';

export {
  REPORT_ENGINE_SCHEMA_VERSION,
  REPORT_ENGINE_NAME,
  REPORT_ENGINE_DEFAULT_LOCALE,
  REPORT_PIPELINE_STAGE_IDS,
  REPORT_REGISTRY_KIND
} from './constants/ReportEngineConstants';
export type { ReportRegistryKind } from './constants/ReportEngineConstants';

export type { SectionTemplateDefinition } from './sections/SectionContract';
