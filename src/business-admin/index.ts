/**
 * İSTEBUL Business Admin — foundation + workspaces + E2E facade.
 *
 * Architecture Freeze v1.0 — additive katmanlar.
 * PR-202A–202E runtime dosyaları değiştirilmez.
 * Core Runtime / Platform Admin / Business Runtime Engine'lerine dokunulmaz.
 * Yalnızca projeksiyon; CRUD / API / DB / Auth / Charts / Realtime yok.
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

/** Export Workspace — PR-202D */
export type {
  ExportResult,
  ExportResultMetadata,
  ExportResultSummary,
  ExportResultArtifact,
  ExportWorkspaceWidgetId,
  ExportWorkspaceWidgetKind,
  ExportWorkspaceWidgetStatus,
  ExportWorkspaceWidgetDefinition,
  ExportWorkspaceListItem,
  ExportWorkspaceOverviewProjection,
  ExportWorkspaceStatusProjection,
  ExportWorkspaceExecutionProjection,
  ExportWorkspaceWidgetProjection,
  ExportWorkspaceContext,
  ExportWorkspaceSummary,
  ExportWorkspaceSummaryItem,
  ExportWorkspaceValidationIssue,
  ExportWorkspaceTelemetry,
  ExportWorkspaceResult,
  ExportWorkspaceLayoutOptions
} from './exports/index';

export {
  toEmptyExportWidgetProjection,
  createExportWorkspaceContext,
  buildExportWorkspaceSummary,
  buildExportWorkspaceSummaryItems,
  PIPELINE_BAG_EXPORT_WORKSPACE_RESULT_KEY,
  ExportWorkspaceRegistry,
  createExportWorkspaceRegistry,
  ExportWorkspaceRuntime,
  createExportWorkspaceRuntime,
  BUILTIN_EXPORT_WORKSPACE_WIDGETS,
  BUILTIN_EXPORT_WORKSPACE_WIDGET_COUNT,
  getBuiltinExportWorkspaceWidget,
  validateExportWorkspaceContext,
  resolveRequestedExportWidgets,
  projectExportWorkspaceWidget,
  projectExportWorkspaceWidgets,
  createExportWorkspaceHeader,
  createExportWorkspaceOverview,
  createExportWorkspaceFormats,
  createExportWorkspaceRecentExports,
  createExportWorkspaceStatus,
  createExportWorkspaceSummaryPanel,
  createExportWorkspaceLayout,
  mountExportWorkspace,
  EXPORT_WORKSPACE_STYLE_ID,
  EXPORT_WORKSPACE_CSS,
  ensureExportWorkspaceStyles
} from './exports/index';

/** Business Settings Workspace — PR-202E */
export type {
  BusinessSettings,
  BusinessSettingsProfile,
  BusinessSettingsOrganization,
  BusinessSettingsBranding,
  BusinessSettingsLocalization,
  BusinessSettingsNotifications,
  BusinessSettingsAiPreferences,
  BusinessSettingsWorkspaceWidgetId,
  BusinessSettingsWorkspaceWidgetKind,
  BusinessSettingsWorkspaceWidgetStatus,
  BusinessSettingsWorkspaceWidgetDefinition,
  BusinessSettingsWorkspaceFieldItem,
  BusinessSettingsProfileProjection,
  BusinessSettingsOrganizationProjection,
  BusinessSettingsBrandingProjection,
  BusinessSettingsLocalizationProjection,
  BusinessSettingsNotificationsProjection,
  BusinessSettingsAiPreferencesProjection,
  BusinessSettingsExecutionProjection,
  BusinessSettingsWorkspaceWidgetProjection,
  BusinessSettingsWorkspaceContext,
  BusinessSettingsWorkspaceSummary,
  BusinessSettingsWorkspaceSummaryItem,
  BusinessSettingsWorkspaceValidationIssue,
  BusinessSettingsWorkspaceTelemetry,
  BusinessSettingsWorkspaceResult,
  BusinessSettingsWorkspaceLayoutOptions
} from './settings/index';

export {
  toEmptyBusinessSettingsWidgetProjection,
  createBusinessSettingsWorkspaceContext,
  buildBusinessSettingsWorkspaceSummary,
  buildBusinessSettingsWorkspaceSummaryItems,
  PIPELINE_BAG_BUSINESS_SETTINGS_WORKSPACE_RESULT_KEY,
  BusinessSettingsWorkspaceRegistry,
  createBusinessSettingsWorkspaceRegistry,
  BusinessSettingsWorkspaceRuntime,
  createBusinessSettingsWorkspaceRuntime,
  BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGETS,
  BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGET_COUNT,
  getBuiltinBusinessSettingsWorkspaceWidget,
  validateBusinessSettingsWorkspaceContext,
  resolveRequestedBusinessSettingsWidgets,
  projectBusinessSettingsWorkspaceWidget,
  projectBusinessSettingsWorkspaceWidgets,
  createBusinessSettingsWorkspaceHeader,
  createBusinessSettingsWorkspaceProfile,
  createBusinessSettingsWorkspaceOrganization,
  createBusinessSettingsWorkspaceBranding,
  createBusinessSettingsWorkspaceLocalization,
  createBusinessSettingsWorkspaceNotifications,
  createBusinessSettingsWorkspaceAiPreferences,
  createBusinessSettingsWorkspaceSummaryPanel,
  createBusinessSettingsWorkspaceLayout,
  mountBusinessSettingsWorkspace,
  BUSINESS_SETTINGS_WORKSPACE_STYLE_ID,
  BUSINESS_SETTINGS_WORKSPACE_CSS,
  ensureBusinessSettingsWorkspaceStyles
} from './settings/index';

/** End-to-End Business Admin Runtime — PR-202F */
export type {
  BusinessAdminPipelineStage,
  BusinessAdminStageOutcome,
  BusinessAdminPipelineBag,
  BusinessAdminExecutionContext,
  BusinessAdminStageExecution,
  BusinessAdminPipelineExecutionSummary,
  BusinessAdminExecutionTelemetry,
  BusinessAdminExecutionResult,
  BusinessAdminPipelineRunnerDependencies
} from './integration/index';

export {
  BUSINESS_ADMIN_PIPELINE_STAGES,
  BUSINESS_ADMIN_SKIP_ON_VALIDATION_FAILURE,
  BUSINESS_ADMIN_STAGE_LABELS,
  createBusinessAdminExecutionContext,
  createSkippedStageExecution,
  createStageExecution,
  buildBusinessAdminExecutionTelemetry,
  createEmptyBusinessAdminResult,
  buildE2ESummaryItems,
  BusinessAdminPipelineRunner,
  createBusinessAdminPipelineRunner,
  BusinessAdminRuntimeFacade,
  createBusinessAdminRuntimeFacade
} from './integration/index';
