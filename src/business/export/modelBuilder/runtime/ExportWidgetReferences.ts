/**
 * İSTEBUL Business Export Engine — Widget References (PR-106B).
 *
 * DashboardModel.widgets kimliklerini taşır; render üretmez.
 */

import type { DashboardWidgetKind } from '../../../dashboard/models/DashboardWidget';

/**
 * Tek widget referansı.
 */
export interface ExportWidgetReference {
  id: string;
  widgetCode: string;
  kind: DashboardWidgetKind;
  title: string;
  kpiIds: readonly string[];
}

/**
 * Widget referansları bölümü.
 */
export interface ExportWidgetReferences {
  referenceCount: number;
  items: readonly ExportWidgetReference[];
  present: boolean;
}
