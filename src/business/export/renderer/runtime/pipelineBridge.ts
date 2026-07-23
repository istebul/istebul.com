/**
 * Export Pipeline köprüsü — PR-106A–106B dosyalarını değiştirmeden bag’e yazar (PR-106C).
 */

import { readExportModelFromPipelineContext } from '../../modelBuilder/runtime/pipelineBridge';
import type { ExportPipelineContext } from '../../pipeline/runtime/ExportPipelineContext';
import type { ExportPipelineResult } from '../../pipeline/runtime/ExportPipelineResult';
import { createRendererContext } from './RendererContext';
import type { RendererResult } from './RendererResult';
import { PIPELINE_BAG_EXPORT_RENDERER_RUNTIME_RESULT_KEY } from './RendererResult';
import type { RendererRuntime } from './RendererRuntime';
import { createRendererRuntime } from './RendererRuntime';

/**
 * Renderer runtime sonucunu ExportPipelineContext.bag’e işler.
 * PR-106A bag.render alanını da doldurur.
 */
export function attachRendererToPipelineContext(
  context: ExportPipelineContext,
  result: RendererResult
): void {
  context.bag[PIPELINE_BAG_EXPORT_RENDERER_RUNTIME_RESULT_KEY] = result;
  context.bag.render = Object.freeze({
    documentId: result.document.metadata.id,
    sectionCount: result.telemetry.renderedSectionCount,
    blockCount: result.telemetry.renderedBlockCount,
    present: result.document.present
  });
}

/**
 * Bag’den Renderer runtime sonucunu okur.
 */
export function readRendererFromPipelineContext(
  context: ExportPipelineContext
): RendererResult | undefined {
  const value = context.bag[PIPELINE_BAG_EXPORT_RENDERER_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as RendererResult;
}

/**
 * PipelineResult.context.bag üzerinden Renderer sonucunu bağlar.
 */
export function attachRendererToPipelineResult(
  pipelineResult: ExportPipelineResult,
  result: RendererResult
): void {
  const ctx = pipelineResult.context as ExportPipelineContext;
  attachRendererToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Renderer runtime sonucunu okur.
 */
export function readRendererFromPipelineResult(
  pipelineResult: ExportPipelineResult
): RendererResult | undefined {
  return readRendererFromPipelineContext(
    pipelineResult.context as ExportPipelineContext
  );
}

/**
 * Validation + Export Model sonucu üzerinden Renderer uygular.
 * PR-106A–106B orchestrator dosyalarını değiştirmez.
 */
export function applyExportRendererToPipelineResult(
  pipelineResult: ExportPipelineResult,
  runtime: RendererRuntime = createRendererRuntime()
): RendererResult {
  const context = pipelineResult.context as ExportPipelineContext;
  const validation = context.bag.validation;
  const exportModelResult = readExportModelFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = runtime.compute(
      createRendererContext({
        request: context.request,
        locale: context.exportContext.locale
      })
    );
    const withWarning: RendererResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'Export source validation başarısız; RenderDocument boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachRendererToPipelineContext(context, withWarning);
    return withWarning;
  }

  const result = runtime.compute(
    createRendererContext({
      exportContext: context.exportContext,
      request: context.request,
      exportModelResult,
      exportModel: exportModelResult?.model,
      locale: context.exportContext.locale,
      bag: context.bag
    })
  );

  attachRendererToPipelineContext(context, result);
  return result;
}
