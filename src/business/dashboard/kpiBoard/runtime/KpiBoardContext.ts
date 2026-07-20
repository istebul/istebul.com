/**
 * İSTEBUL Business Dashboard Engine — KpiBoardContext (PR-105D).
 */

import type { DashboardModel } from '../../modelBuilder/runtime/DashboardModel';
import type { DashboardModelResult } from '../../modelBuilder/runtime/DashboardModelResult';
import type { DashboardContext } from '../../models/DashboardContext';
import type { DashboardRequest } from '../../models/DashboardRequest';
import { DASHBOARD_ENGINE_DEFAULT_LOCALE } from '../../constants/DashboardEngineConstants';
import type { WidgetResult } from '../../widgetBuilder/runtime/WidgetResult';

/**
 * KPI Board girdi bağlamı.
 */
export interface KpiBoardContext {
  /** Opsiyonel DashboardContext */
  dashboardContext?: DashboardContext;
  /** Opsiyonel DashboardRequest */
  request?: DashboardRequest;
  /** PR-105B yapısal DashboardModel */
  dashboardModel?: DashboardModel;
  /** PR-105B runtime sonucu */
  dashboardModelResult?: DashboardModelResult;
  /** PR-105C Widget sonucu (opsiyonel; KPI üretiminde zorunlu değil) */
  widgetResult?: WidgetResult;
  /** Dil */
  locale: 'tr' | 'en';
  /** Sınırlı KPI id listesi */
  kpiIds?: readonly string[];
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * KpiBoardContext üretir.
 */
export function createKpiBoardContext(
  partial: Omit<KpiBoardContext, 'locale'> & { locale?: 'tr' | 'en' }
): KpiBoardContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? DASHBOARD_ENGINE_DEFAULT_LOCALE
  };
}
