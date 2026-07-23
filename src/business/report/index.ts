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

/** Report Model Builder Runtime (PR-104B) */
export {
  REPORT_PART_LABELS,
  REPORT_PART_ORDER,
  createReportModelContext,
  PIPELINE_BAG_REPORT_MODEL_RUNTIME_RESULT_KEY,
  ReportRegistryRuntime,
  createReportRegistryRuntime,
  ReportModelBuilderRuntime,
  createReportModelBuilderRuntime,
  attachReportModelToPipelineContext,
  readReportModelFromPipelineContext,
  attachReportModelToPipelineResult,
  readReportModelFromPipelineResult,
  applyReportModelBuilderToPipelineResult
} from './modelBuilder/runtime/index';
export type {
  ReportPartId,
  ReportPartDefinition,
  ReportDataset,
  ReportDecision,
  ReportPolicyInformation,
  ReportMappedRecommendation,
  ReportRecommendationInformation,
  ReportMappedAction,
  ReportActionPlanInformation,
  ReportSummaryInformation,
  ReportModelContext,
  ReportModelWarning,
  ReportModelTelemetry,
  ReportModelResult,
  /** Sunumdan bağımsız ReportModel (PR-104B) — foundation ReportModel ile karışmaz */
  ReportModel as ReportBuilderModel,
  /** Builder metadata (PR-104B) — foundation ReportMetadata ile karışmaz */
  ReportMetadata as ReportBuilderMetadata
} from './modelBuilder/runtime/index';

/** Narrative Composer Runtime (PR-104C) */
export {
  NARRATIVE_KIND_LABELS,
  NARRATIVE_KIND_ORDER,
  createNarrativeContext,
  PIPELINE_BAG_NARRATIVE_RUNTIME_RESULT_KEY,
  NarrativeRegistryRuntime,
  createNarrativeRegistryRuntime,
  NarrativeComposerRuntime,
  createNarrativeComposerRuntime,
  BUILTIN_NARRATIVE_TEMPLATES,
  BUILTIN_NARRATIVE_TEMPLATE_COUNT,
  getBuiltinNarrativeTemplate,
  getBuiltinNarrativeTemplateByKind,
  attachNarrativeToPipelineContext,
  readNarrativeFromPipelineContext,
  attachNarrativeToPipelineResult,
  readNarrativeFromPipelineResult,
  applyNarrativeComposerToPipelineResult
} from './narrative/runtime/index';
export type {
  NarrativeKind,
  NarrativeTemplate,
  NarrativeRecord,
  NarrativeContext,
  NarrativeWarning,
  NarrativeTelemetry,
  NarrativeMetadata,
  NarrativeResult
} from './narrative/runtime/index';

/** Report Section Builder Runtime (PR-104D) */
export {
  REPORT_SECTION_LABELS,
  REPORT_SECTION_ORDER,
  REPORT_SECTION_KIND_BY_ID,
  REPORT_SECTION_NARRATIVE_KIND,
  createReportSectionContext,
  PIPELINE_BAG_REPORT_SECTION_RUNTIME_RESULT_KEY,
  ReportSectionRegistryRuntime,
  createReportSectionRegistryRuntime,
  ReportSectionBuilderRuntime,
  createReportSectionBuilderRuntime,
  BUILTIN_REPORT_SECTION_DEFINITIONS,
  BUILTIN_REPORT_SECTION_DEFINITION_COUNT,
  getBuiltinReportSectionDefinition,
  getBuiltinReportSectionDefinitionByCode,
  attachReportSectionToPipelineContext,
  readReportSectionFromPipelineContext,
  attachReportSectionToPipelineResult,
  readReportSectionFromPipelineResult,
  applyReportSectionBuilderToPipelineResult
} from './sectionBuilder/runtime/index';
export type {
  ReportSectionId,
  ReportSectionDefinition,
  ReportSectionRecord,
  ReportSectionContext,
  ReportSectionWarning,
  ReportSectionTelemetry,
  ReportSectionMetadata,
  ReportSectionResult
} from './sectionBuilder/runtime/index';

/** Report Summary Runtime (PR-104E) */
export {
  REPORT_SUMMARY_SECTION_LABELS,
  REPORT_SUMMARY_SECTION_ORDER,
  createReportSummaryContext,
  PIPELINE_BAG_REPORT_SUMMARY_RUNTIME_RESULT_KEY,
  ReportSummaryRegistryRuntime,
  createReportSummaryRegistryRuntime,
  ReportSummaryRuntime,
  createReportSummaryRuntime,
  attachReportSummaryToPipelineContext,
  readReportSummaryFromPipelineContext,
  attachReportSummaryToPipelineResult,
  readReportSummaryFromPipelineResult,
  applyReportSummaryToPipelineResult
} from './summary/runtime/index';
export type {
  ReportSummary,
  ReportSummarySectionId,
  ReportSummarySection,
  ReportSummaryMetadata,
  ReportSummaryRecord,
  ReportSummaryContext,
  ReportSummaryWarning,
  ReportSummaryTelemetry,
  ReportSummaryResult,
  ReportSummarySectionDefinition
} from './summary/runtime/index';

/** End-to-End Report Runtime (PR-104F) */
export {
  ReportRuntimeFacade,
  createReportRuntimeFacade,
  ReportPipelineRunner,
  createReportPipelineRunner,
  createReportExecutionContext,
  resolveReportContext,
  ensureRequestIds,
  createSkippedStageExecution,
  createStageExecution,
  replaceStageExecution,
  mutateReportModel,
  syncReportModelFromBag,
  buildReportExecutionTelemetry
} from './integration/runtime/index';
export type {
  ReportExecutionContext,
  CreateReportExecutionContextInput,
  ReportExecutionResult,
  ReportExecutionTelemetry,
  ReportPipelineExecutionSummary,
  ReportPipelineRunnerDependencies
} from './integration/runtime/index';

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
