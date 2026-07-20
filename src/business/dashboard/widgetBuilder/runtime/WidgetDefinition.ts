/**
 * İSTEBUL Business Dashboard Engine — WidgetDefinition (PR-105C).
 *
 * Foundation `WidgetDefinitionEntry` ile karıştırılmamalıdır; bu tip yalnızca
 * Widget Builder Runtime tanımıdır.
 */

import type { DashboardWidgetKind } from '../../models/DashboardWidget';
import type { WidgetId } from './WidgetId';

/**
 * Runtime Widget tanımı — veri tanımı; render bilgisi yoktur.
 */
export interface WidgetDefinition {
  /** Kararlı kimlik */
  id: WidgetId;
  /** WidgetRegistry kodu */
  widgetCode: string;
  /** Foundation tür */
  kind: DashboardWidgetKind;
  /** Başlık */
  title: string;
  /** Açıklama */
  description: string;
  /** Kaynak Dashboard Model parça kimliği */
  sourcePartId: string;
  /** Sıra — deterministic */
  order: number;
  /** Grid sütun span (veri; CSS/layout motoru değil) */
  defaultColSpan: number;
  /** Grid satır span */
  defaultRowSpan: number;
  /** Aktif mi */
  enabled: boolean;
}
