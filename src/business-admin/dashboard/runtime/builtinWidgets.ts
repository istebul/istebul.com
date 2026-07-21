/**
 * İSTEBUL Business Admin — yerleşik workspace widget tanımları (PR-202B).
 */

import type { DashboardWorkspaceWidgetDefinition } from './DashboardWorkspaceWidget';

/**
 * Yerleşik Dashboard Workspace widget'ları.
 */
export const BUILTIN_DASHBOARD_WORKSPACE_WIDGETS: readonly DashboardWorkspaceWidgetDefinition[] =
  Object.freeze([
    {
      id: 'overview',
      name: 'Overview',
      description: 'Dashboard genel bakış (iskelet)',
      order: 1,
      kind: 'overview',
      status: 'active',
      visible: true
    },
    {
      id: 'kpi-cards',
      name: 'KPI Cards',
      description: 'KPI kartları (iskelet)',
      order: 2,
      kind: 'kpi-cards',
      status: 'active',
      visible: true
    },
    {
      id: 'recent-analysis',
      name: 'Recent Analysis',
      description: 'Son analizler listesi (iskelet)',
      order: 3,
      kind: 'list',
      status: 'active',
      visible: true
    },
    {
      id: 'recent-decisions',
      name: 'Recent Decisions',
      description: 'Son kararlar listesi (iskelet)',
      order: 4,
      kind: 'list',
      status: 'active',
      visible: true
    },
    {
      id: 'recent-reports',
      name: 'Recent Reports',
      description: 'Son raporlar listesi (iskelet)',
      order: 5,
      kind: 'list',
      status: 'active',
      visible: true
    },
    {
      id: 'recent-exports',
      name: 'Recent Exports',
      description: 'Son dışa aktarımlar listesi (iskelet)',
      order: 6,
      kind: 'list',
      status: 'active',
      visible: true
    },
    {
      id: 'execution-summary',
      name: 'Execution Summary',
      description: 'Dashboard yürütme özeti (iskelet)',
      order: 7,
      kind: 'summary',
      status: 'active',
      visible: true
    }
  ]);

/** Yerleşik widget sayısı */
export const BUILTIN_DASHBOARD_WORKSPACE_WIDGET_COUNT =
  BUILTIN_DASHBOARD_WORKSPACE_WIDGETS.length;

/**
 * Yerleşik widget tanımını id ile döndürür.
 */
export function getBuiltinDashboardWorkspaceWidget(
  widgetId: string
): DashboardWorkspaceWidgetDefinition | undefined {
  return BUILTIN_DASHBOARD_WORKSPACE_WIDGETS.find(
    (item) => item.id === widgetId
  );
}
