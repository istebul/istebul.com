/**
 * Model dışa aktarımları.
 */

export type {
  DashboardStage,
  DashboardExecutionStatus
} from './DashboardStage';
export { DASHBOARD_EXECUTION_STATUS_LABELS } from './DashboardStage';
export type { DashboardRequest } from './DashboardRequest';
export type { DashboardMetadata } from './DashboardMetadata';
export type {
  DashboardLayout,
  DashboardDensity
} from './DashboardLayout';
export type {
  DashboardWidget,
  DashboardWidgetKind,
  DashboardWidgetPlacement
} from './DashboardWidget';
export type {
  DashboardFilter,
  DashboardFilterKind
} from './DashboardFilter';
export type { DashboardSection } from './DashboardSection';
export type { DashboardKPI } from './DashboardKPI';
export type {
  DashboardNavigation,
  DashboardNavigationItem
} from './DashboardNavigation';
export type { DashboardTheme } from './DashboardTheme';
export type { DashboardModel } from './DashboardModel';
export type { DashboardContext } from './DashboardContext';

export const DASHBOARD_MODEL_COUNT = 10;
