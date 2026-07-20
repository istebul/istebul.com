/**
 * İSTEBUL Business Report Engine — ReportSectionContext (PR-104D).
 */

import type { ReportContext } from '../../models/ReportContext';
import type { ReportRequest } from '../../models/ReportRequest';
import type { ReportModel } from '../../modelBuilder/runtime/ReportModel';
import type { ReportModelResult } from '../../modelBuilder/runtime/ReportModelResult';
import type { NarrativeResult } from '../../narrative/runtime/NarrativeResult';
import { REPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ReportEngineConstants';

/**
 * Report Section Builder girdi bağlamı.
 */
export interface ReportSectionContext {
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
  /** Dil */
  locale: 'tr' | 'en';
  /** Sınırlı section id listesi */
  sectionIds?: readonly string[];
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * ReportSectionContext üretir.
 */
export function createReportSectionContext(
  partial: Omit<ReportSectionContext, 'locale'> & { locale?: 'tr' | 'en' }
): ReportSectionContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? REPORT_ENGINE_DEFAULT_LOCALE
  };
}
