/**
 * İSTEBUL Business Dashboard Engine — WidgetContext (PR-105C).
 */

import type { DashboardModel } from '../../modelBuilder/runtime/DashboardModel';
import type { DashboardModelResult } from '../../modelBuilder/runtime/DashboardModelResult';
import type { DashboardContext } from '../../models/DashboardContext';
import type { DashboardRequest } from '../../models/DashboardRequest';
import { DASHBOARD_ENGINE_DEFAULT_LOCALE } from '../../constants/DashboardEngineConstants';

/**
 * Widget Builder girdi bağlamı.
 */
export interface WidgetContext {
  /** Opsiyonel DashboardContext */
  dashboardContext?: DashboardContext;
  /** Opsiyonel DashboardRequest */
  request?: DashboardRequest;
  /** PR-105B yapısal DashboardModel */
  dashboardModel?: DashboardModel;
  /** PR-105B runtime sonucu */
  dashboardModelResult?: DashboardModelResult;
  /** Dil */
  locale: 'tr' | 'en';
  /** Sınırlı widget id listesi */
  widgetIds?: readonly string[];
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * WidgetContext üretir.
 */
export function createWidgetContext(
  partial: Omit<WidgetContext, 'locale'> & { locale?: 'tr' | 'en' }
): WidgetContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? DASHBOARD_ENGINE_DEFAULT_LOCALE
  };
}
