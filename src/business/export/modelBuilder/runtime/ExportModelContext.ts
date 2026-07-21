/**
 * İSTEBUL Business Export Engine — ExportModelContext (PR-106B).
 */

import type { DashboardModel } from '../../../dashboard/models/DashboardModel';
import type { DocumentModel } from '../../../document/models/DocumentModel';
import { EXPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ExportEngineConstants';
import type { ExportContext } from '../../models/ExportContext';
import type { ExportRequest } from '../../models/ExportRequest';

/**
 * Export Model Builder girdi bağlamı.
 */
export interface ExportModelContext {
  /** Opsiyonel ExportContext */
  exportContext?: ExportContext;
  /** Opsiyonel ExportRequest */
  request?: ExportRequest;
  /** Document Engine modeli */
  documentModel?: DocumentModel;
  /** Dashboard Engine modeli (DashboardResult) */
  dashboardModel?: DashboardModel;
  /** Dil */
  locale: 'tr' | 'en';
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * ExportModelContext üretir.
 */
export function createExportModelContext(
  partial: Omit<ExportModelContext, 'locale'> & { locale?: 'tr' | 'en' }
): ExportModelContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? EXPORT_ENGINE_DEFAULT_LOCALE
  };
}
