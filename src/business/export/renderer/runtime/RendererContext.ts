/**
 * İSTEBUL Business Export Engine — RendererContext (PR-106C).
 */

import { EXPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ExportEngineConstants';
import type { ExportModel } from '../../modelBuilder/runtime/ExportModel';
import type { ExportModelResult } from '../../modelBuilder/runtime/ExportModelResult';
import type { ExportContext } from '../../models/ExportContext';
import type { ExportRequest } from '../../models/ExportRequest';

/**
 * Renderer Runtime girdi bağlamı.
 */
export interface RendererContext {
  /** Opsiyonel ExportContext */
  exportContext?: ExportContext;
  /** Opsiyonel ExportRequest */
  request?: ExportRequest;
  /** PR-106B Export Model runtime sonucu */
  exportModelResult?: ExportModelResult;
  /** Doğrudan ExportModel (builder modeli) */
  exportModel?: ExportModel;
  /** Dil */
  locale: 'tr' | 'en';
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * RendererContext üretir.
 */
export function createRendererContext(
  partial: Omit<RendererContext, 'locale'> & { locale?: 'tr' | 'en' }
): RendererContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? EXPORT_ENGINE_DEFAULT_LOCALE
  };
}
