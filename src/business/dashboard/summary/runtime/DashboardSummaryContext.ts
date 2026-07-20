/**
 * İSTEBUL Business Dashboard Engine — DashboardSummaryContext (PR-105E).
 */

import type { DashboardModel } from '../../modelBuilder/runtime/DashboardModel';
import type { DashboardModelResult } from '../../modelBuilder/runtime/DashboardModelResult';
import type { DashboardContext } from '../../models/DashboardContext';
import type { DashboardRequest } from '../../models/DashboardRequest';
import type { KpiBoardResult } from '../../kpiBoard/runtime/KpiBoardResult';
import type { WidgetResult } from '../../widgetBuilder/runtime/WidgetResult';
import { DASHBOARD_ENGINE_DEFAULT_LOCALE } from '../../constants/DashboardEngineConstants';

/**
 * Dashboard Summary Runtime girdi bağlamı.
 */
export interface DashboardSummaryContext {
  /** Opsiyonel DashboardContext */
  dashboardContext?: DashboardContext;
  /** Opsiyonel DashboardRequest */
  request?: DashboardRequest;
  /** PR-105B yapısal DashboardModel */
  dashboardModel?: DashboardModel;
  /** PR-105B runtime sonucu */
  dashboardModelResult?: DashboardModelResult;
  /** PR-105C Widget sonucu */
  widgetResult?: WidgetResult;
  /** PR-105D KPI Board sonucu */
  kpiBoardResult?: KpiBoardResult;
  /** Dil */
  locale: 'tr' | 'en';
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * DashboardSummaryContext üretir.
 */
export function createDashboardSummaryContext(
  partial: Omit<DashboardSummaryContext, 'locale'> & { locale?: 'tr' | 'en' }
): DashboardSummaryContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? DASHBOARD_ENGINE_DEFAULT_LOCALE
  };
}
