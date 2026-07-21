/**
 * Dashboard Workspace UI — dışa aktarımlar (PR-202B).
 */

export {
  createDashboardWorkspaceHeader,
  createDashboardWorkspaceOverview,
  createDashboardWorkspaceCards,
  createDashboardWorkspaceLists,
  createDashboardWorkspaceSummaryPanel,
  createDashboardWorkspaceLayout,
  mountDashboardWorkspace
} from './DashboardWorkspaceLayout';
export type { DashboardWorkspaceLayoutOptions } from './DashboardWorkspaceLayout';

export {
  DASHBOARD_WORKSPACE_STYLE_ID,
  DASHBOARD_WORKSPACE_CSS,
  ensureDashboardWorkspaceStyles
} from './dashboardWorkspaceStyles';
