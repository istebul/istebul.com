/**
 * İSTEBUL Business Dashboard Engine — WidgetRecord (PR-105C).
 */

import type { DashboardWidget } from '../../models/DashboardWidget';
import type { WidgetId } from './WidgetId';

/**
 * Zengin Widget kaydı — foundation DashboardWidget + runtime alanlar.
 */
export interface WidgetRecord {
  /** Kimlik */
  id: string;
  /** Standart widget id */
  widgetId: WidgetId;
  /** Widget kodu */
  widgetCode: string;
  /** Başlık */
  title: string;
  /** Sıra */
  order: number;
  /** Kaynak model parça kimliği */
  sourcePartId: string;
  /** Kaynak veri mevcut mu */
  sourcePresent: boolean;
  /** Yapılandırılmış veri yükü — render değil */
  payload: Readonly<Record<string, unknown>>;
  /** Foundation projeksiyonu */
  widget: DashboardWidget;
}
