/**
 * İSTEBUL Business Report Engine — ReportModelContext (PR-104B).
 */

import type { DecisionResult } from '../../../decision/models/DecisionResult';
import type { ReportContext } from '../../models/ReportContext';
import type { ReportRequest } from '../../models/ReportRequest';
import { REPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ReportEngineConstants';

/**
 * Report Model Builder girdi bağlamı.
 */
export interface ReportModelContext {
  /** Opsiyonel ReportContext */
  reportContext?: ReportContext;
  /** Opsiyonel ReportRequest */
  request?: ReportRequest;
  /** Decision Engine sonucu */
  decisionResult?: DecisionResult;
  /** Dil */
  locale: 'tr' | 'en';
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * ReportModelContext üretir.
 */
export function createReportModelContext(
  partial: Omit<ReportModelContext, 'locale'> & { locale?: 'tr' | 'en' }
): ReportModelContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? REPORT_ENGINE_DEFAULT_LOCALE
  };
}
