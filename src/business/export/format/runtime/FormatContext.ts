/**
 * İSTEBUL Business Export Engine — FormatContext (PR-106D).
 */

import { EXPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ExportEngineConstants';
import type { ExportContext } from '../../models/ExportContext';
import type { ExportRequest } from '../../models/ExportRequest';
import type { RenderDocument } from '../../renderer/runtime/RenderDocument';
import type { RendererResult } from '../../renderer/runtime/RendererResult';
import type { FormatRepresentationKind } from './FormatRepresentation';

/**
 * Format Runtime girdi bağlamı.
 */
export interface FormatContext {
  /** Opsiyonel ExportContext */
  exportContext?: ExportContext;
  /** Opsiyonel ExportRequest */
  request?: ExportRequest;
  /** PR-106C Renderer sonucu */
  rendererResult?: RendererResult;
  /** Doğrudan RenderDocument */
  renderDocument?: RenderDocument;
  /** İstenen temsil kimlikleri (boşsa registry enabled) */
  formatIds?: readonly FormatRepresentationKind[];
  /** Dil */
  locale: 'tr' | 'en';
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * FormatContext üretir.
 */
export function createFormatContext(
  partial: Omit<FormatContext, 'locale'> & { locale?: 'tr' | 'en' }
): FormatContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? EXPORT_ENGINE_DEFAULT_LOCALE
  };
}
