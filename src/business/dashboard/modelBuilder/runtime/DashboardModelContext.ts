/**
 * İSTEBUL Business Dashboard Engine — DashboardModelContext (PR-105B).
 */

import type { DecisionResult } from '../../../decision/models/DecisionResult';
import type { ReportModel } from '../../../report/models/ReportModel';
import { DASHBOARD_ENGINE_DEFAULT_LOCALE } from '../../constants/DashboardEngineConstants';
import type { DashboardContext } from '../../models/DashboardContext';
import type { DashboardRequest } from '../../models/DashboardRequest';

/**
 * Dashboard Model Builder girdi bağlamı.
 */
export interface DashboardModelContext {
  /** Opsiyonel DashboardContext */
  dashboardContext?: DashboardContext;
  /** Opsiyonel DashboardRequest */
  request?: DashboardRequest;
  /** Report Engine sonucu (ReportResult) */
  reportModel?: ReportModel;
  /** Opsiyonel Decision Engine sonucu (aksiyon planı referansları) */
  decisionResult?: DecisionResult;
  /** Dil */
  locale: 'tr' | 'en';
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * DashboardModelContext üretir.
 */
export function createDashboardModelContext(
  partial: Omit<DashboardModelContext, 'locale'> & { locale?: 'tr' | 'en' }
): DashboardModelContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? DASHBOARD_ENGINE_DEFAULT_LOCALE
  };
}
