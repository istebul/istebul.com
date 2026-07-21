/**
 * İSTEBUL Business Admin — yerleşik Reports Workspace widget tanımları (PR-202C).
 */

import type { ReportsWorkspaceWidgetDefinition } from './ReportsWorkspaceWidget';

/**
 * Yerleşik Reports Workspace widget'ları.
 */
export const BUILTIN_REPORTS_WORKSPACE_WIDGETS: readonly ReportsWorkspaceWidgetDefinition[] =
  Object.freeze([
    {
      id: 'reports-overview',
      name: 'Reports Overview',
      description: 'Rapor genel bakış (iskelet)',
      order: 1,
      kind: 'overview',
      status: 'active',
      visible: true
    },
    {
      id: 'recent-reports',
      name: 'Recent Reports',
      description: 'Son raporlar listesi (iskelet)',
      order: 2,
      kind: 'list',
      status: 'active',
      visible: true
    },
    {
      id: 'report-categories',
      name: 'Report Categories',
      description: 'Rapor kategorileri (iskelet)',
      order: 3,
      kind: 'categories',
      status: 'active',
      visible: true
    },
    {
      id: 'report-details',
      name: 'Report Details',
      description: 'Rapor detayı (iskelet)',
      order: 4,
      kind: 'detail',
      status: 'active',
      visible: true
    },
    {
      id: 'report-status',
      name: 'Report Status',
      description: 'Rapor durumu (iskelet)',
      order: 5,
      kind: 'status',
      status: 'active',
      visible: true
    },
    {
      id: 'execution-summary',
      name: 'Execution Summary',
      description: 'Rapor yürütme özeti (iskelet)',
      order: 6,
      kind: 'summary',
      status: 'active',
      visible: true
    }
  ]);

/** Yerleşik widget sayısı */
export const BUILTIN_REPORTS_WORKSPACE_WIDGET_COUNT =
  BUILTIN_REPORTS_WORKSPACE_WIDGETS.length;

/**
 * Yerleşik widget tanımını id ile döndürür.
 */
export function getBuiltinReportsWorkspaceWidget(
  widgetId: string
): ReportsWorkspaceWidgetDefinition | undefined {
  return BUILTIN_REPORTS_WORKSPACE_WIDGETS.find((item) => item.id === widgetId);
}
