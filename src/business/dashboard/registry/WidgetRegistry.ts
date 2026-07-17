/**
 * Widget kayıt sistemi — henüz içerik yok.
 */

import type { WidgetDefinitionEntry } from '../widgets/WidgetContract';

const WIDGETS: WidgetDefinitionEntry[] = [];

export const DASHBOARD_WIDGET_REGISTRY: readonly WidgetDefinitionEntry[] =
  Object.freeze(WIDGETS);

export function listWidgetDefinitions(): readonly WidgetDefinitionEntry[] {
  return DASHBOARD_WIDGET_REGISTRY;
}

export function getWidgetDefinitionByCode(
  code: string
): WidgetDefinitionEntry | undefined {
  return DASHBOARD_WIDGET_REGISTRY.find((entry) => entry.widgetCode === code);
}

export const DASHBOARD_WIDGET_REGISTRY_COUNT = DASHBOARD_WIDGET_REGISTRY.length;

export default DASHBOARD_WIDGET_REGISTRY;
