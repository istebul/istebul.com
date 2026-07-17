/**
 * Registry dışa aktarımları.
 */

export type { DashboardProfileDefinition } from './DashboardRegistryTypes';
export {
  DASHBOARD_PROFILE_REGISTRY,
  DASHBOARD_PROFILE_REGISTRY_COUNT,
  getDashboardProfileById,
  listDashboardProfiles
} from './DashboardRegistry';

export {
  DASHBOARD_WIDGET_REGISTRY,
  DASHBOARD_WIDGET_REGISTRY_COUNT,
  getWidgetDefinitionByCode,
  listWidgetDefinitions
} from './WidgetRegistry';

export {
  DASHBOARD_LAYOUT_REGISTRY,
  DASHBOARD_LAYOUT_REGISTRY_COUNT,
  getDashboardLayoutById,
  listDashboardLayouts
} from './LayoutRegistry';

export type { DashboardThemeDefinitionEntry } from './ThemeRegistry';
export {
  DASHBOARD_THEME_REGISTRY,
  DASHBOARD_THEME_REGISTRY_COUNT,
  getDashboardThemeById,
  listDashboardThemes
} from './ThemeRegistry';

export const DASHBOARD_REGISTRY_STRUCTURE_COUNT = 4;
