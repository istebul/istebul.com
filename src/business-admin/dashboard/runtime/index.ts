/**
 * Dashboard Workspace Runtime — dışa aktarımlar (PR-202B).
 */

export type {
  DashboardResult,
  DashboardResultKpi,
  DashboardResultWidget,
  DashboardResultSection,
  DashboardResultMetadata
} from './DashboardResult';

export type {
  DashboardWorkspaceWidgetId,
  DashboardWorkspaceWidgetKind,
  DashboardWorkspaceWidgetStatus,
  DashboardWorkspaceWidgetDefinition,
  DashboardWorkspaceListItem,
  DashboardWorkspaceKpiProjection,
  DashboardWorkspaceOverviewProjection,
  DashboardWorkspaceExecutionProjection,
  DashboardWorkspaceWidgetProjection
} from './DashboardWorkspaceWidget';
export { toEmptyWidgetProjection } from './DashboardWorkspaceWidget';

export type { DashboardWorkspaceContext } from './DashboardWorkspaceContext';
export { createDashboardWorkspaceContext } from './DashboardWorkspaceContext';

export type {
  DashboardWorkspaceSummary,
  DashboardWorkspaceSummaryItem
} from './DashboardWorkspaceSummary';
export {
  buildDashboardWorkspaceSummary,
  buildDashboardWorkspaceSummaryItems
} from './DashboardWorkspaceSummary';

export type {
  DashboardWorkspaceValidationIssue,
  DashboardWorkspaceTelemetry,
  DashboardWorkspaceResult
} from './DashboardWorkspaceResult';
export { PIPELINE_BAG_DASHBOARD_WORKSPACE_RESULT_KEY } from './DashboardWorkspaceResult';

export {
  DashboardWorkspaceRegistry,
  createDashboardWorkspaceRegistry
} from './DashboardWorkspaceRegistry';

export {
  DashboardWorkspaceRuntime,
  createDashboardWorkspaceRuntime
} from './DashboardWorkspaceRuntime';

export {
  BUILTIN_DASHBOARD_WORKSPACE_WIDGETS,
  BUILTIN_DASHBOARD_WORKSPACE_WIDGET_COUNT,
  getBuiltinDashboardWorkspaceWidget
} from './builtinWidgets';

export {
  validateDashboardWorkspaceContext,
  resolveRequestedWidgets
} from './workspaceValidation';

export {
  projectWorkspaceWidget,
  projectWorkspaceWidgets
} from './workspaceProjection';
