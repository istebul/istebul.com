/**
 * İSTEBUL Business Admin — yerleşik Export Workspace widget tanımları (PR-202D).
 */

import type { ExportWorkspaceWidgetDefinition } from './ExportWorkspaceWidget';

/**
 * Yerleşik Export Workspace widget'ları.
 */
export const BUILTIN_EXPORT_WORKSPACE_WIDGETS: readonly ExportWorkspaceWidgetDefinition[] =
  Object.freeze([
    {
      id: 'exports-overview',
      name: 'Exports Overview',
      description: 'Export genel bakış (iskelet)',
      order: 1,
      kind: 'overview',
      status: 'active',
      visible: true
    },
    {
      id: 'recent-exports',
      name: 'Recent Exports',
      description: 'Son dışa aktarımlar listesi (iskelet)',
      order: 2,
      kind: 'list',
      status: 'active',
      visible: true
    },
    {
      id: 'available-formats',
      name: 'Available Formats',
      description: 'Kullanılabilir formatlar (iskelet)',
      order: 3,
      kind: 'formats',
      status: 'active',
      visible: true
    },
    {
      id: 'export-status',
      name: 'Export Status',
      description: 'Export durumu (iskelet)',
      order: 4,
      kind: 'status',
      status: 'active',
      visible: true
    },
    {
      id: 'execution-summary',
      name: 'Execution Summary',
      description: 'Export yürütme özeti (iskelet)',
      order: 5,
      kind: 'summary',
      status: 'active',
      visible: true
    }
  ]);

/** Yerleşik widget sayısı */
export const BUILTIN_EXPORT_WORKSPACE_WIDGET_COUNT =
  BUILTIN_EXPORT_WORKSPACE_WIDGETS.length;

/**
 * Yerleşik widget tanımını id ile döndürür.
 */
export function getBuiltinExportWorkspaceWidget(
  widgetId: string
): ExportWorkspaceWidgetDefinition | undefined {
  return BUILTIN_EXPORT_WORKSPACE_WIDGETS.find((item) => item.id === widgetId);
}
