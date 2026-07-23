/**
 * Export Pipeline köprüsü — PR-106A dosyalarını değiştirmeden bag’e yazar (PR-106B).
 */

import type { ExportPipelineContext } from '../../pipeline/runtime/ExportPipelineContext';
import type { ExportPipelineResult } from '../../pipeline/runtime/ExportPipelineResult';
import type { ExportModelBuilderRuntime } from './ExportModelBuilderRuntime';
import { createExportModelBuilderRuntime } from './ExportModelBuilderRuntime';
import { createExportModelContext } from './ExportModelContext';
import type { ExportModelResult } from './ExportModelResult';
import { PIPELINE_BAG_EXPORT_MODEL_RUNTIME_RESULT_KEY } from './ExportModelResult';

/**
 * Export Model runtime sonucunu ExportPipelineContext.bag’e işler.
 * PR-106A bag.exportModel alanını da doldurur (iskelet uyumlu).
 */
export function attachExportModelToPipelineContext(
  context: ExportPipelineContext,
  result: ExportModelResult
): void {
  context.bag[PIPELINE_BAG_EXPORT_MODEL_RUNTIME_RESULT_KEY] = result;
  context.bag.exportModel = result.skeletonModel;
}

/**
 * Bag’den zengin Export Model runtime sonucunu okur.
 */
export function readExportModelFromPipelineContext(
  context: ExportPipelineContext
): ExportModelResult | undefined {
  const value = context.bag[PIPELINE_BAG_EXPORT_MODEL_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as ExportModelResult;
}

/**
 * PipelineResult.context.bag üzerinden Export Model sonucunu bağlar.
 */
export function attachExportModelToPipelineResult(
  pipelineResult: ExportPipelineResult,
  result: ExportModelResult
): void {
  const ctx = pipelineResult.context as ExportPipelineContext;
  attachExportModelToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Export Model runtime sonucunu okur.
 */
export function readExportModelFromPipelineResult(
  pipelineResult: ExportPipelineResult
): ExportModelResult | undefined {
  return readExportModelFromPipelineContext(
    pipelineResult.context as ExportPipelineContext
  );
}

/**
 * Validation geçmiş pipeline sonucuna Export Model Builder uygular.
 * PR-106A orchestrator dosyalarını değiştirmez.
 */
export function applyExportModelBuilderToPipelineResult(
  pipelineResult: ExportPipelineResult,
  builder: ExportModelBuilderRuntime = createExportModelBuilderRuntime()
): ExportModelResult {
  const context = pipelineResult.context as ExportPipelineContext;
  const validation = context.bag.validation;

  if (validation && validation.isValid === false) {
    const skipped = builder.compute(
      createExportModelContext({
        request: context.request,
        locale: context.exportContext.locale
      })
    );
    const withWarning: ExportModelResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'Export source validation başarısız; Export Model boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachExportModelToPipelineContext(context, withWarning);
    return withWarning;
  }

  const result = builder.compute(
    createExportModelContext({
      exportContext: context.exportContext,
      request: context.request,
      documentModel: context.exportContext.documentModel,
      dashboardModel: context.exportContext.dashboardModel,
      locale: context.exportContext.locale,
      bag: context.bag
    })
  );

  attachExportModelToPipelineContext(context, result);
  return result;
}
