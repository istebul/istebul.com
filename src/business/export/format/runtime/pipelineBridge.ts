/**
 * Export Pipeline köprüsü — PR-106A–106C dosyalarını değiştirmeden bag’e yazar (PR-106D).
 */

import type { ExportPipelineContext } from '../../pipeline/runtime/ExportPipelineContext';
import type { ExportPipelineResult } from '../../pipeline/runtime/ExportPipelineResult';
import { readRendererFromPipelineContext } from '../../renderer/runtime/pipelineBridge';
import { createFormatContext } from './FormatContext';
import type { FormatResult } from './FormatResult';
import { PIPELINE_BAG_EXPORT_FORMAT_RUNTIME_RESULT_KEY } from './FormatResult';
import type { FormatRuntime } from './FormatRuntime';
import { createFormatRuntime, toExportFormats } from './FormatRuntime';

/**
 * Format runtime sonucunu ExportPipelineContext.bag’e işler.
 * PR-106A bag.format alanını da doldurur (ExportFormat[] projeksiyonu).
 */
export function attachFormatToPipelineContext(
  context: ExportPipelineContext,
  result: FormatResult
): void {
  context.bag[PIPELINE_BAG_EXPORT_FORMAT_RUNTIME_RESULT_KEY] = result;
  context.bag.format = toExportFormats(result.documents);
}

/**
 * Bag’den Format runtime sonucunu okur.
 */
export function readFormatFromPipelineContext(
  context: ExportPipelineContext
): FormatResult | undefined {
  const value = context.bag[PIPELINE_BAG_EXPORT_FORMAT_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as FormatResult;
}

/**
 * PipelineResult.context.bag üzerinden Format sonucunu bağlar.
 */
export function attachFormatToPipelineResult(
  pipelineResult: ExportPipelineResult,
  result: FormatResult
): void {
  const ctx = pipelineResult.context as ExportPipelineContext;
  attachFormatToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Format runtime sonucunu okur.
 */
export function readFormatFromPipelineResult(
  pipelineResult: ExportPipelineResult
): FormatResult | undefined {
  return readFormatFromPipelineContext(
    pipelineResult.context as ExportPipelineContext
  );
}

/**
 * Validation + Renderer sonucu üzerinden Format Runtime uygular.
 * PR-106A–106C orchestrator dosyalarını değiştirmez.
 */
export function applyExportFormatToPipelineResult(
  pipelineResult: ExportPipelineResult,
  runtime: FormatRuntime = createFormatRuntime()
): FormatResult {
  const context = pipelineResult.context as ExportPipelineContext;
  const validation = context.bag.validation;
  const rendererResult = readRendererFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = runtime.compute(
      createFormatContext({
        request: context.request,
        locale: context.exportContext.locale
      })
    );
    const withWarning: FormatResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'Export source validation başarısız; FormatDocument listesi boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachFormatToPipelineContext(context, withWarning);
    return withWarning;
  }

  const result = runtime.compute(
    createFormatContext({
      exportContext: context.exportContext,
      request: context.request,
      rendererResult,
      renderDocument: rendererResult?.document,
      locale: context.exportContext.locale,
      bag: context.bag
    })
  );

  attachFormatToPipelineContext(context, result);
  return result;
}
