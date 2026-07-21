/**
 * İSTEBUL Business Admin — Reports Workspace (PR-202C).
 *
 * Architecture Freeze v1.0 — additive runtime + UI iskeleti.
 * Report Engine / Platform Admin / Dashboard Workspace / Foundation değiştirilmez.
 * Yalnızca projeksiyon; CRUD, API, DB, Realtime, Export yok.
 */

export type {
  ReportResult,
  ReportResultMetadata,
  ReportResultExecutiveSummary,
  ReportResultSection,
  ReportResultFinding,
  ReportResultRecommendation,
  ReportsWorkspaceWidgetId,
  ReportsWorkspaceWidgetKind,
  ReportsWorkspaceWidgetStatus,
  ReportsWorkspaceWidgetDefinition,
  ReportsWorkspaceListItem,
  ReportsWorkspaceOverviewProjection,
  ReportsWorkspaceDetailProjection,
  ReportsWorkspaceStatusProjection,
  ReportsWorkspaceExecutionProjection,
  ReportsWorkspaceWidgetProjection,
  ReportsWorkspaceContext,
  ReportsWorkspaceSummary,
  ReportsWorkspaceSummaryItem,
  ReportsWorkspaceValidationIssue,
  ReportsWorkspaceTelemetry,
  ReportsWorkspaceResult
} from './runtime/index';

export {
  toEmptyReportsWidgetProjection,
  createReportsWorkspaceContext,
  buildReportsWorkspaceSummary,
  buildReportsWorkspaceSummaryItems,
  PIPELINE_BAG_REPORTS_WORKSPACE_RESULT_KEY,
  ReportsWorkspaceRegistry,
  createReportsWorkspaceRegistry,
  ReportsWorkspaceRuntime,
  createReportsWorkspaceRuntime,
  BUILTIN_REPORTS_WORKSPACE_WIDGETS,
  BUILTIN_REPORTS_WORKSPACE_WIDGET_COUNT,
  getBuiltinReportsWorkspaceWidget,
  validateReportsWorkspaceContext,
  resolveRequestedReportsWidgets,
  projectReportsWorkspaceWidget,
  projectReportsWorkspaceWidgets
} from './runtime/index';

export type { ReportsWorkspaceLayoutOptions } from './ui/index';

export {
  createReportsWorkspaceHeader,
  createReportsWorkspaceOverview,
  createReportsWorkspaceReportList,
  createReportsWorkspaceReportDetail,
  createReportsWorkspaceSummaryPanel,
  createReportsWorkspaceLayout,
  mountReportsWorkspace,
  REPORTS_WORKSPACE_STYLE_ID,
  REPORTS_WORKSPACE_CSS,
  ensureReportsWorkspaceStyles
} from './ui/index';
