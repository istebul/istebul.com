/**
 * İSTEBUL Business Admin — foundation + Dashboard + Reports Workspace.
 *
 * Architecture Freeze v1.0 — additive katmanlar.
 * PR-202A foundation / PR-202B Dashboard Workspace runtime dosyaları değiştirilmez.
 * Report Engine / Platform Admin / Business Runtime Engine'lerine dokunulmaz.
 * Yalnızca projeksiyon; CRUD / API / DB / Auth / Charts / Realtime / Export yok.
 */

export type {
  BusinessAdminModuleId,
  BusinessAdminModuleCategory,
  BusinessAdminModuleStatus,
  BusinessAdminModule,
  BusinessAdminModuleProjection,
  BusinessAdminContext,
  BusinessAdminValidationIssue,
  BusinessAdminSummaryItem,
  BusinessAdminExecutionSummary,
  BusinessAdminTelemetry,
  BusinessAdminResult,
  StageTimer
} from './runtime/index';

export {
  toModuleProjection,
  createBusinessAdminContext,
  PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY,
  BusinessAdminRegistryRuntime,
  createBusinessAdminRegistryRuntime,
  BusinessAdminRuntime,
  createBusinessAdminRuntime,
  BUILTIN_BUSINESS_ADMIN_MODULES,
  BUILTIN_BUSINESS_ADMIN_MODULE_COUNT,
  getBuiltinBusinessAdminModule,
  validateBusinessAdminContext,
  resolveRequestedModules,
  buildBusinessAdminSummaryItems,
  nowMs,
  startStageTimer,
  endStageTimer
} from './runtime/index';

/** Dashboard Workspace — PR-202B */
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
  DashboardWorkspaceResult,
  DashboardWorkspaceLayoutOptions
} from './dashboard/index';

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
  projectWorkspaceWidgets,
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
} from './dashboard/index';

/** Reports Workspace — PR-202C */
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
  ReportsWorkspaceResult,
  ReportsWorkspaceLayoutOptions
} from './reports/index';

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
  projectReportsWorkspaceWidgets,
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
} from './reports/index';
