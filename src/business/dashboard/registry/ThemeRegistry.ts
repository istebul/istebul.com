/**
 * Dashboard tema kayıt sistemi — henüz içerik yok.
 *
 * Document Engine `THEME_REGISTRY` ile karışmaması için
 * dışa aktarım adı `DASHBOARD_THEME_REGISTRY`dır.
 */

export interface DashboardThemeDefinitionEntry {
  id: string;
  name: string;
  description: string;
  defaultLayoutId: string;
  surfaceColorToken: string;
  accentColorToken: string;
  typographyToken: string;
  version: string;
}

const THEMES: DashboardThemeDefinitionEntry[] = [];

export const DASHBOARD_THEME_REGISTRY: readonly DashboardThemeDefinitionEntry[] =
  Object.freeze(THEMES);

export function listDashboardThemes(): readonly DashboardThemeDefinitionEntry[] {
  return DASHBOARD_THEME_REGISTRY;
}

export function getDashboardThemeById(
  id: string
): DashboardThemeDefinitionEntry | undefined {
  return DASHBOARD_THEME_REGISTRY.find((entry) => entry.id === id);
}

export const DASHBOARD_THEME_REGISTRY_COUNT = DASHBOARD_THEME_REGISTRY.length;

export default DASHBOARD_THEME_REGISTRY;
