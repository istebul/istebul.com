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
