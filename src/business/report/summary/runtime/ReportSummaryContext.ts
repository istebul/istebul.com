/**
 * İSTEBUL Business Report Engine — ReportSummaryContext (PR-104E).
 */

import type { ReportContext } from '../../models/ReportContext';
import type { ReportRequest } from '../../models/ReportRequest';
import type { ReportModel } from '../../modelBuilder/runtime/ReportModel';
import type { ReportModelResult } from '../../modelBuilder/runtime/ReportModelResult';
import type { NarrativeResult } from '../../narrative/runtime/NarrativeResult';
import type { ReportSectionResult } from '../../sectionBuilder/runtime/ReportSectionResult';
import { REPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ReportEngineConstants';

/**
 * Report Summary Runtime girdi bağlamı.
 */
export interface ReportSummaryContext {
  /** Opsiyonel ReportContext */
  reportContext?: ReportContext;
  /** Opsiyonel ReportRequest */
  request?: ReportRequest;
  /** PR-104B yapısal ReportModel */
  reportModel?: ReportModel;
  /** PR-104B runtime sonucu */
  reportModelResult?: ReportModelResult;
  /** PR-104C Narrative sonucu */
  narrativeResult?: NarrativeResult;
  /** PR-104D Report Section sonucu */
  reportSectionResult?: ReportSectionResult;
  /** Dil */
  locale: 'tr' | 'en';
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * ReportSummaryContext üretir.
 */
export function createReportSummaryContext(
  partial: Omit<ReportSummaryContext, 'locale'> & { locale?: 'tr' | 'en' }
): ReportSummaryContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? REPORT_ENGINE_DEFAULT_LOCALE
  };
}
