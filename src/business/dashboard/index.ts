/**
 * İSTEBUL Business Dashboard Engine — dışa aktarım yüzeyi.
 *
 * Architecture Freeze v1.0 — tanım ve port katmanı.
 * Pipeline Runtime (PR-105A) additive; React / grafik / UI yoktur.
 */

export {
  DASHBOARD_MODEL_COUNT,
  DASHBOARD_EXECUTION_STATUS_LABELS
} from './models/index';
export type {
  DashboardStage,
  DashboardExecutionStatus,
  DashboardRequest,
  DashboardMetadata,
  DashboardLayout,
  DashboardDensity,
  DashboardWidget,
  DashboardWidgetKind,
  DashboardWidgetPlacement,
  DashboardFilter,
  DashboardFilterKind,
  DashboardSection,
  DashboardKPI,
  DashboardNavigation,
  DashboardNavigationItem,
  DashboardTheme,
  DashboardModel,
  DashboardContext
} from './models/index';

export { DASHBOARD_ENGINE_PORT_COUNT } from './ports/index';
export type {
  IDashboardEngine,
  IDashboardPipeline,
  IWidgetBuilder,
  ILayoutResolver,
  IFilterResolver,
  IDashboardComposer
} from './ports/index';

export type { DashboardPipelineStageDefinition } from './pipeline/DashboardPipeline';
export {
  DASHBOARD_PIPELINE_STAGES,
  DASHBOARD_PIPELINE_STAGE_COUNT,
  getDashboardPipelineStage,
  listDashboardPipelineStages
} from './pipeline/DashboardPipeline';

export {
  DASHBOARD_RUNTIME_ERROR_CODES,
  DashboardPipelineRuntime,
  createDashboardPipelineRuntime,
  nowMs,
  startDashboardStageTimer,
  endDashboardStageTimer
} from './pipeline/runtime/index';
export type {
  DashboardTiming,
  DashboardStageTimer,
  DashboardRuntimeIssue,
  DashboardStageExecution,
  DashboardStageExecutionOutcome,
  DashboardPipelineBag,
  DashboardPipelineContext,
  DashboardPipelineSummary,
  DashboardPipelineTelemetry,
  DashboardPipelineResult,
  DashboardRuntimeErrorCode,
  DashboardContextResolver,
  DashboardPipelineRuntimeOptions
} from './pipeline/runtime/index';

export {
  DASHBOARD_REGISTRY_STRUCTURE_COUNT,
  DASHBOARD_PROFILE_REGISTRY,
  DASHBOARD_PROFILE_REGISTRY_COUNT,
  DASHBOARD_WIDGET_REGISTRY,
  DASHBOARD_WIDGET_REGISTRY_COUNT,
  DASHBOARD_LAYOUT_REGISTRY,
  DASHBOARD_LAYOUT_REGISTRY_COUNT,
  DASHBOARD_THEME_REGISTRY,
  DASHBOARD_THEME_REGISTRY_COUNT,
  listDashboardProfiles,
  getDashboardProfileById,
  listWidgetDefinitions,
  getWidgetDefinitionByCode,
  listDashboardLayouts,
  getDashboardLayoutById,
  listDashboardThemes,
  getDashboardThemeById
} from './registry/index';
export type {
  DashboardProfileDefinition,
  DashboardThemeDefinitionEntry
} from './registry/index';

export {
  DASHBOARD_ENGINE_SCHEMA_VERSION,
  DASHBOARD_ENGINE_NAME,
  DASHBOARD_ENGINE_DEFAULT_LOCALE,
  DASHBOARD_PIPELINE_STAGE_IDS,
  DASHBOARD_REGISTRY_KIND
} from './constants/DashboardEngineConstants';
export type { DashboardRegistryKind } from './constants/DashboardEngineConstants';

export type { WidgetDefinitionEntry } from './widgets/WidgetContract';
export type { DashboardLayoutDefinitionEntry } from './layouts/LayoutContract';

/** Dashboard Model Builder Runtime (PR-105B) */
export {
  DASHBOARD_PART_LABELS,
  DASHBOARD_PART_ORDER,
  createDashboardModelContext,
  PIPELINE_BAG_DASHBOARD_MODEL_RUNTIME_RESULT_KEY,
  DashboardRegistryRuntime,
  createDashboardRegistryRuntime,
  DashboardModelBuilderRuntime,
  createDashboardModelBuilderRuntime,
  attachDashboardModelToPipelineContext,
  readDashboardModelFromPipelineContext,
  attachDashboardModelToPipelineResult,
  readDashboardModelFromPipelineResult,
  applyDashboardModelBuilderToPipelineResult
} from './modelBuilder/runtime/index';
export type {
  DashboardPartId,
  DashboardPartDefinition,
  DashboardDataset,
  DashboardReportSummaryInformation,
  DashboardSectionReference,
  DashboardSectionReferences,
  DashboardNarrativeReferenceKind,
  DashboardNarrativeReference,
  DashboardNarrativeReferences,
  DashboardRecommendationReference,
  DashboardRecommendationReferences,
  DashboardActionPlanReference,
  DashboardActionPlanReferences,
  DashboardModelContext,
  DashboardModelWarning,
  DashboardModelTelemetry,
  DashboardModelResult,
  DashboardModel as DashboardBuilderModel,
  DashboardMetadata as DashboardBuilderMetadata
} from './modelBuilder/runtime/index';

/** Widget Builder Runtime (PR-105C) */
export {
  WIDGET_LABELS,
  WIDGET_ORDER,
  WIDGET_KIND_BY_ID,
  WIDGET_SOURCE_PART_BY_ID,
  createWidgetContext,
  PIPELINE_BAG_DASHBOARD_WIDGET_RUNTIME_RESULT_KEY,
  WidgetRegistryRuntime,
  createWidgetRegistryRuntime,
  WidgetBuilderRuntime,
  createWidgetBuilderRuntime,
  BUILTIN_WIDGET_DEFINITIONS,
  BUILTIN_WIDGET_DEFINITION_COUNT,
  getBuiltinWidgetDefinition,
  getBuiltinWidgetDefinitionByCode,
  attachWidgetToPipelineContext,
  readWidgetFromPipelineContext,
  attachWidgetToPipelineResult,
  readWidgetFromPipelineResult,
  applyWidgetBuilderToPipelineResult
} from './widgetBuilder/runtime/index';
export type {
  WidgetId,
  WidgetDefinition,
  WidgetRecord,
  WidgetContext,
  WidgetWarning,
  WidgetTelemetry,
  WidgetMetadata,
  WidgetResult
} from './widgetBuilder/runtime/index';

/** KPI Board Runtime (PR-105D) */
export {
  KPI_LABELS,
  KPI_ORDER,
  KPI_UNIT_BY_ID,
  KPI_SOURCE_PART_BY_ID,
  createKpiBoardContext,
  PIPELINE_BAG_DASHBOARD_KPI_BOARD_RUNTIME_RESULT_KEY,
  KpiRegistryRuntime,
  createKpiRegistryRuntime,
  KpiBoardRuntime,
  createKpiBoardRuntime,
  BUILTIN_KPI_DEFINITIONS,
  BUILTIN_KPI_DEFINITION_COUNT,
  getBuiltinKpiDefinition,
  getBuiltinKpiDefinitionByCode,
  attachKpiBoardToPipelineContext,
  readKpiBoardFromPipelineContext,
  attachKpiBoardToPipelineResult,
  readKpiBoardFromPipelineResult,
  applyKpiBoardToPipelineResult
} from './kpiBoard/runtime/index';
export type {
  KpiId,
  KpiDefinition,
  KpiRecord,
  KpiBoardContext,
  KpiBoardWarning,
  KpiBoardTelemetry,
  KpiBoardMetadata,
  KpiBoardResult
} from './kpiBoard/runtime/index';
