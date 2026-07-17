/**
 * Dashboard yerleşim kayıt sistemi — henüz içerik yok.
 *
 * Document Engine `LAYOUT_REGISTRY` ile karışmaması için
 * dışa aktarım adı `DASHBOARD_LAYOUT_REGISTRY`dır.
 */

import type { DashboardLayoutDefinitionEntry } from '../layouts/LayoutContract';

const LAYOUTS: DashboardLayoutDefinitionEntry[] = [];

export const DASHBOARD_LAYOUT_REGISTRY: readonly DashboardLayoutDefinitionEntry[] =
  Object.freeze(LAYOUTS);

export function listDashboardLayouts(): readonly DashboardLayoutDefinitionEntry[] {
  return DASHBOARD_LAYOUT_REGISTRY;
}

export function getDashboardLayoutById(
  id: string
): DashboardLayoutDefinitionEntry | undefined {
  return DASHBOARD_LAYOUT_REGISTRY.find((entry) => entry.id === id);
}

export const DASHBOARD_LAYOUT_REGISTRY_COUNT =
  DASHBOARD_LAYOUT_REGISTRY.length;

export default DASHBOARD_LAYOUT_REGISTRY;
