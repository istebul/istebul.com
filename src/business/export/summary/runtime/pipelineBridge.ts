/**
 * Export Pipeline köprüsü — PR-106A–106D dosyalarını değiştirmeden bag’e yazar (PR-106E).
 */

import { readFormatFromPipelineContext } from '../../format/runtime/pipelineBridge';
import { readExportModelFromPipelineContext } from '../../modelBuilder/runtime/pipelineBridge';
import type { ExportPipelineContext } from '../../pipeline/runtime/ExportPipelineContext';
import type { ExportPipelineResult } from '../../pipeline/runtime/ExportPipelineResult';
import { readRendererFromPipelineContext } from '../../renderer/runtime/pipelineBridge';
import { createExportSummaryContext } from './ExportSummaryContext';
import type { ExportSummaryResult } from './ExportSummaryResult';
import { PIPELINE_BAG_EXPORT_SUMMARY_RUNTIME_RESULT_KEY } from './ExportSummaryResult';
import type { ExportSummaryRuntime } from './ExportSummaryRuntime';
import { createExportSummaryRuntime } from './ExportSummaryRuntime';

/**
 * Export Summary runtime sonucunu ExportPipelineContext.bag’e işler.
 * PR-106A bag.summary alanını da doldurur (foundation ExportSummary).
 */
export function attachExportSummaryToPipelineContext(
  context: ExportPipelineContext,
  result: ExportSummaryResult
): void {
  context.bag[PIPELINE_BAG_EXPORT_SUMMARY_RUNTIME_RESULT_KEY] = result;
  context.bag.summary = result.foundationSummary;
}

/**
 * Bag’den Export Summary runtime sonucunu okur.
 */
export function readExportSummaryFromPipelineContext(
  context: ExportPipelineContext
): ExportSummaryResult | undefined {
  const value = context.bag[PIPELINE_BAG_EXPORT_SUMMARY_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as ExportSummaryResult;
}

/**
 * PipelineResult.context.bag üzerinden Export Summary sonucunu bağlar.
 */
export function attachExportSummaryToPipelineResult(
  pipelineResult: ExportPipelineResult,
  result: ExportSummaryResult
): void {
  const ctx = pipelineResult.context as ExportPipelineContext;
  attachExportSummaryToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Export Summary runtime sonucunu okur.
 */
export function readExportSummaryFromPipelineResult(
  pipelineResult: ExportPipelineResult
): ExportSummaryResult | undefined {
  return readExportSummaryFromPipelineContext(
    pipelineResult.context as ExportPipelineContext
  );
}

/**
 * Validation + prior stage sonuçları üzerinden Export Summary uygular.
 * PR-106A–106D orchestrator dosyalarını değiştirmez.
 */
export function applyExportSummaryToPipelineResult(
  pipelineResult: ExportPipelineResult,
  runtime: ExportSummaryRuntime = createExportSummaryRuntime()
): ExportSummaryResult {
  const context = pipelineResult.context as ExportPipelineContext;
  const validation = context.bag.validation;
  const exportModelResult = readExportModelFromPipelineContext(context);
  const rendererResult = readRendererFromPipelineContext(context);
  const formatResult = readFormatFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = runtime.compute(
      createExportSummaryContext({
        request: context.request,
        validation,
        locale: context.exportContext.locale,
        pipelineTelemetry: pipelineResult.telemetry
      })
    );
    const withWarning: ExportSummaryResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'Export source validation başarısız; Export Summary kısmi girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachExportSummaryToPipelineContext(context, withWarning);
    return withWarning;
  }

  const result = runtime.compute(
    createExportSummaryContext({
      exportContext: context.exportContext,
      request: context.request,
      validation,
      exportModelResult,
      exportModel: exportModelResult?.model,
      rendererResult,
      renderDocument: rendererResult?.document,
      formatResult,
      pipelineTelemetry: pipelineResult.telemetry,
      locale: context.exportContext.locale,
      bag: context.bag
    })
  );

  attachExportSummaryToPipelineContext(context, result);
  return result;
}
