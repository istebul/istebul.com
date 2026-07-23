/**
 * Widget kayıt sözleşmesi.
 */

import type { DashboardWidgetKind } from '../models/DashboardWidget';

export interface WidgetDefinitionEntry {
  widgetCode: string;
  kind: DashboardWidgetKind;
  title: string;
  description: string;
  defaultColSpan: number;
  defaultRowSpan: number;
  version: string;
}
