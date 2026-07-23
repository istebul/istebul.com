/**
 * İSTEBUL Business Report Engine — NarrativeContext (PR-104C).
 */

import type { ReportContext } from '../../models/ReportContext';
import type { ReportRequest } from '../../models/ReportRequest';
import type { ReportModel } from '../../modelBuilder/runtime/ReportModel';
import type { ReportModelResult } from '../../modelBuilder/runtime/ReportModelResult';
import { REPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ReportEngineConstants';

/**
 * Narrative Composer girdi bağlamı.
 */
export interface NarrativeContext {
  /** Opsiyonel ReportContext */
  reportContext?: ReportContext;
  /** Opsiyonel ReportRequest */
  request?: ReportRequest;
  /** PR-104B yapısal ReportModel */
  reportModel?: ReportModel;
  /** PR-104B runtime sonucu */
  reportModelResult?: ReportModelResult;
  /** Dil */
  locale: 'tr' | 'en';
  /** Sınırlı narrative türleri */
  narrativeKinds?: readonly string[];
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * NarrativeContext üretir.
 */
export function createNarrativeContext(
  partial: Omit<NarrativeContext, 'locale'> & { locale?: 'tr' | 'en' }
): NarrativeContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? REPORT_ENGINE_DEFAULT_LOCALE
  };
}
