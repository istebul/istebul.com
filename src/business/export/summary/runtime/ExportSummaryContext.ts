/**
 * İSTEBUL Business Export Engine — ExportSummaryContext (PR-106E).
 */

import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import { EXPORT_ENGINE_DEFAULT_LOCALE } from '../../constants/ExportEngineConstants';
import type { FormatResult } from '../../format/runtime/FormatResult';
import type { ExportModel } from '../../modelBuilder/runtime/ExportModel';
import type { ExportModelResult } from '../../modelBuilder/runtime/ExportModelResult';
import type { ExportContext } from '../../models/ExportContext';
import type { ExportRequest } from '../../models/ExportRequest';
import type { ExportPipelineTelemetry } from '../../pipeline/runtime/ExportPipelineResult';
import type { RenderDocument } from '../../renderer/runtime/RenderDocument';
import type { RendererResult } from '../../renderer/runtime/RendererResult';

/**
 * Export Summary Runtime girdi bağlamı.
 */
export interface ExportSummaryContext {
  /** Opsiyonel ExportContext */
  exportContext?: ExportContext;
  /** Opsiyonel ExportRequest */
  request?: ExportRequest;
  /** Pipeline validation sonucu */
  validation?: BusinessValidationResult;
  /** PR-106B Export Model */
  exportModel?: ExportModel;
  /** PR-106B runtime sonucu */
  exportModelResult?: ExportModelResult;
  /** PR-106C RenderDocument */
  renderDocument?: RenderDocument;
  /** PR-106C Renderer sonucu */
  rendererResult?: RendererResult;
  /** PR-106D Format sonucu */
  formatResult?: FormatResult;
  /** Pipeline telemetrisi (opsiyonel) */
  pipelineTelemetry?: ExportPipelineTelemetry;
  /** Dil */
  locale: 'tr' | 'en';
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * ExportSummaryContext üretir.
 */
export function createExportSummaryContext(
  partial: Omit<ExportSummaryContext, 'locale'> & { locale?: 'tr' | 'en' }
): ExportSummaryContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? EXPORT_ENGINE_DEFAULT_LOCALE
  };
}
