/**
 * İSTEBUL Business Admin — Dashboard Workspace (PR-202B).
 *
 * Architecture Freeze v1.0 — additive runtime + UI iskeleti.
 * Dashboard Engine / Platform Admin / Business Runtime / Foundation değiştirilmez.
 * Yalnızca projeksiyon; CRUD, API, DB, Charts, Realtime yok.
 */

export type {
  DashboardResult,
  DashboardResultKpi,
  DashboardResultWidget,
  DashboardResultSection,
  DashboardResultMetadata,
  DashboardWorkspaceWidgetId,
  DashboardWorkspaceWidgetKind,
  DashboardWorkspaceWidgetStatus,
  DashboardWorkspaceWidgetDefinition,
  DashboardWorkspaceListItem,
  DashboardWorkspaceKpiProjection,
  DashboardWorkspaceOverviewProjection,
  DashboardWorkspaceExecutionProjection,
  DashboardWorkspaceWidgetProjection,
  DashboardWorkspaceContext,
  DashboardWorkspaceSummary,
  DashboardWorkspaceSummaryItem,
  DashboardWorkspaceValidationIssue,
  DashboardWorkspaceTelemetry,
  DashboardWorkspaceResult
} from './runtime/index';

export {
  toEmptyWidgetProjection,
  createDashboardWorkspaceContext,
  buildDashboardWorkspaceSummary,
  buildDashboardWorkspaceSummaryItems,
  PIPELINE_BAG_DASHBOARD_WORKSPACE_RESULT_KEY,
  DashboardWorkspaceRegistry,
  createDashboardWorkspaceRegistry,
  DashboardWorkspaceRuntime,
  createDashboardWorkspaceRuntime,
  BUILTIN_DASHBOARD_WORKSPACE_WIDGETS,
  BUILTIN_DASHBOARD_WORKSPACE_WIDGET_COUNT,
  getBuiltinDashboardWorkspaceWidget,
  validateDashboardWorkspaceContext,
  resolveRequestedWidgets,
  projectWorkspaceWidget,
  projectWorkspaceWidgets
} from './runtime/index';

export type { DashboardWorkspaceLayoutOptions } from './ui/index';

export {
  createDashboardWorkspaceHeader,
  createDashboardWorkspaceOverview,
  createDashboardWorkspaceCards,
  createDashboardWorkspaceLists,
  createDashboardWorkspaceSummaryPanel,
  createDashboardWorkspaceLayout,
  mountDashboardWorkspace,
  DASHBOARD_WORKSPACE_STYLE_ID,
  DASHBOARD_WORKSPACE_CSS,
  ensureDashboardWorkspaceStyles
} from './ui/index';
