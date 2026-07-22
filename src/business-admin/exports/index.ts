/**
 * İSTEBUL Business Admin — Export Workspace (PR-202D).
 *
 * Architecture Freeze v1.0 — additive runtime + UI iskeleti.
 * Export Engine / Platform Admin / Dashboard / Reports Workspace / Foundation değiştirilmez.
 * Yalnızca projeksiyon; CRUD, API, DB, Realtime yok.
 */

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
  ExportWorkspaceResult
} from './runtime/index';

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
  projectExportWorkspaceWidgets
} from './runtime/index';

export type { ExportWorkspaceLayoutOptions } from './ui/index';

export {
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
} from './ui/index';
