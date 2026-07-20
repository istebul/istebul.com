/**
 * Builtin Widget tanımları (PR-105C).
 */

import type { WidgetDefinition } from './WidgetDefinition';
import {
  WIDGET_KIND_BY_ID,
  WIDGET_LABELS,
  WIDGET_ORDER,
  WIDGET_SOURCE_PART_BY_ID
} from './WidgetId';

export const BUILTIN_WIDGET_DEFINITIONS: readonly WidgetDefinition[] =
  Object.freeze(
    WIDGET_ORDER.map((id, index) =>
      Object.freeze({
        id,
        widgetCode: `WDG_${id.toUpperCase().replace(/-/g, '_')}`,
        kind: WIDGET_KIND_BY_ID[id],
        title: WIDGET_LABELS[id],
        description: `Standart dashboard widget: ${WIDGET_LABELS[id]}`,
        sourcePartId: WIDGET_SOURCE_PART_BY_ID[id],
        order: index + 1,
        defaultColSpan: 12,
        defaultRowSpan: 1,
        enabled: true
      })
    )
  );

export const BUILTIN_WIDGET_DEFINITION_COUNT = BUILTIN_WIDGET_DEFINITIONS.length;

export function getBuiltinWidgetDefinition(
  id: string
): WidgetDefinition | undefined {
  return BUILTIN_WIDGET_DEFINITIONS.find((item) => item.id === id);
}

export function getBuiltinWidgetDefinitionByCode(
  widgetCode: string
): WidgetDefinition | undefined {
  return BUILTIN_WIDGET_DEFINITIONS.find(
    (item) => item.widgetCode === widgetCode
  );
}
