/**
 * Reports Workspace Runtime — dışa aktarımlar (PR-202C).
 */

export type {
  ReportResult,
  ReportResultMetadata,
  ReportResultExecutiveSummary,
  ReportResultSection,
  ReportResultFinding,
  ReportResultRecommendation
} from './ReportResult';

export type {
  ReportsWorkspaceWidgetId,
  ReportsWorkspaceWidgetKind,
  ReportsWorkspaceWidgetStatus,
  ReportsWorkspaceWidgetDefinition,
  ReportsWorkspaceListItem,
  ReportsWorkspaceOverviewProjection,
  ReportsWorkspaceDetailProjection,
  ReportsWorkspaceStatusProjection,
  ReportsWorkspaceExecutionProjection,
  ReportsWorkspaceWidgetProjection
} from './ReportsWorkspaceWidget';
export { toEmptyReportsWidgetProjection } from './ReportsWorkspaceWidget';

export type { ReportsWorkspaceContext } from './ReportsWorkspaceContext';
export { createReportsWorkspaceContext } from './ReportsWorkspaceContext';

export type {
  ReportsWorkspaceSummary,
  ReportsWorkspaceSummaryItem
} from './ReportsWorkspaceSummary';
export {
  buildReportsWorkspaceSummary,
  buildReportsWorkspaceSummaryItems
} from './ReportsWorkspaceSummary';

export type {
  ReportsWorkspaceValidationIssue,
  ReportsWorkspaceTelemetry,
  ReportsWorkspaceResult
} from './ReportsWorkspaceResult';
export { PIPELINE_BAG_REPORTS_WORKSPACE_RESULT_KEY } from './ReportsWorkspaceResult';

export {
  ReportsWorkspaceRegistry,
  createReportsWorkspaceRegistry
} from './ReportsWorkspaceRegistry';

export {
  ReportsWorkspaceRuntime,
  createReportsWorkspaceRuntime
} from './ReportsWorkspaceRuntime';

export {
  BUILTIN_REPORTS_WORKSPACE_WIDGETS,
  BUILTIN_REPORTS_WORKSPACE_WIDGET_COUNT,
  getBuiltinReportsWorkspaceWidget
} from './builtinWidgets';

export {
  validateReportsWorkspaceContext,
  resolveRequestedReportsWidgets
} from './workspaceValidation';

export {
  projectReportsWorkspaceWidget,
  projectReportsWorkspaceWidgets
} from './workspaceProjection';
