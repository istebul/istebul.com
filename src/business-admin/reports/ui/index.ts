/**
 * Reports Workspace UI — dışa aktarımlar (PR-202C).
 */

export {
  createReportsWorkspaceHeader,
  createReportsWorkspaceOverview,
  createReportsWorkspaceReportList,
  createReportsWorkspaceReportDetail,
  createReportsWorkspaceSummaryPanel,
  createReportsWorkspaceLayout,
  mountReportsWorkspace
} from './ReportsWorkspaceLayout';
export type { ReportsWorkspaceLayoutOptions } from './ReportsWorkspaceLayout';

export {
  REPORTS_WORKSPACE_STYLE_ID,
  REPORTS_WORKSPACE_CSS,
  ensureReportsWorkspaceStyles
} from './reportsWorkspaceStyles';
