/**
 * Report Pipeline köprüsü — PR-104A dosyalarını değiştirmeden bag’e yazar (PR-104B).
 */

import type { ReportPipelineContext } from '../../pipeline/runtime/ReportPipelineContext';
import type { ReportPipelineResult } from '../../pipeline/runtime/ReportPipelineResult';
import type { ReportModelResult } from './ReportModelResult';
import { PIPELINE_BAG_REPORT_MODEL_RUNTIME_RESULT_KEY } from './ReportModelResult';
import type { ReportModelBuilderRuntime } from './ReportModelBuilderRuntime';
import { createReportModelBuilderRuntime } from './ReportModelBuilderRuntime';
import { createReportModelContext } from './ReportModelContext';

/**
 * Report Model runtime sonucunu ReportPipelineContext.bag’e işler.
 * Foundation bag.reportModel alanını da doldurur.
 */
export function attachReportModelToPipelineContext(
  context: ReportPipelineContext,
  result: ReportModelResult
): void {
  context.bag[PIPELINE_BAG_REPORT_MODEL_RUNTIME_RESULT_KEY] = result;
  context.bag.reportModel = result.foundationModel;
  context.bag.recommendations = result.foundationModel.recommendations;
}

/**
 * Bag’den zengin Report Model runtime sonucunu okur.
 */
export function readReportModelFromPipelineContext(
  context: ReportPipelineContext
): ReportModelResult | undefined {
  const value = context.bag[PIPELINE_BAG_REPORT_MODEL_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as ReportModelResult;
}

/**
 * PipelineResult.context.bag üzerinden Report Model sonucunu bağlar.
 */
export function attachReportModelToPipelineResult(
  pipelineResult: ReportPipelineResult,
  result: ReportModelResult
): void {
  const ctx = pipelineResult.context as ReportPipelineContext;
  attachReportModelToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Report Model runtime sonucunu okur.
 */
export function readReportModelFromPipelineResult(
  pipelineResult: ReportPipelineResult
): ReportModelResult | undefined {
  return readReportModelFromPipelineContext(
    pipelineResult.context as ReportPipelineContext
  );
}

/**
 * Validation geçmiş pipeline sonucuna Report Model Builder uygular.
 * PR-104A orchestrator dosyalarını değiştirmez.
 */
export function applyReportModelBuilderToPipelineResult(
  pipelineResult: ReportPipelineResult,
  builder: ReportModelBuilderRuntime = createReportModelBuilderRuntime()
): ReportModelResult {
  const context = pipelineResult.context as ReportPipelineContext;
  const validation = context.bag.decisionValidation;

  if (validation && validation.isValid === false) {
    const skipped = builder.compute(
      createReportModelContext({
        reportContext: context.reportContext,
        request: context.request,
        locale: context.reportContext.locale
      })
    );
    const withWarning: ReportModelResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'DecisionResult validation başarısız; Report Model boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachReportModelToPipelineContext(context, withWarning);

    const mutableSkip = pipelineResult.reportModel as {
      metadata: typeof pipelineResult.reportModel.metadata;
      recommendations: typeof pipelineResult.reportModel.recommendations;
    };
    mutableSkip.metadata = withWarning.foundationMetadata;
    mutableSkip.recommendations = withWarning.foundationModel.recommendations;
    return withWarning;
  }

  const result = builder.compute(
    createReportModelContext({
      reportContext: context.reportContext,
      request: context.request,
      decisionResult: context.reportContext.decisionResult,
      locale: context.reportContext.locale,
      bag: context.bag
    })
  );

  attachReportModelToPipelineContext(context, result);

  const mutableResult = pipelineResult.reportModel as {
    metadata: typeof pipelineResult.reportModel.metadata;
    recommendations: typeof pipelineResult.reportModel.recommendations;
    lastStage: typeof pipelineResult.reportModel.lastStage;
  };
  mutableResult.metadata = result.foundationMetadata;
  mutableResult.recommendations = result.foundationModel.recommendations;
  mutableResult.lastStage = 'bolum-derleme';

  return result;
}
