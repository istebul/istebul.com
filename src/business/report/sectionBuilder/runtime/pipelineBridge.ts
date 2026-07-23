/**
 * Report Pipeline köprüsü — PR-104A–C dosyalarını değiştirmeden bag’e yazar (PR-104D).
 */

import type { ReportPipelineContext } from '../../pipeline/runtime/ReportPipelineContext';
import type { ReportPipelineResult } from '../../pipeline/runtime/ReportPipelineResult';
import { readReportModelFromPipelineContext } from '../../modelBuilder/runtime/pipelineBridge';
import { readNarrativeFromPipelineContext } from '../../narrative/runtime/pipelineBridge';
import type { ReportSectionResult } from './ReportSectionResult';
import { PIPELINE_BAG_REPORT_SECTION_RUNTIME_RESULT_KEY } from './ReportSectionResult';
import type { ReportSectionBuilderRuntime } from './ReportSectionBuilderRuntime';
import { createReportSectionBuilderRuntime } from './ReportSectionBuilderRuntime';
import { createReportSectionContext } from './ReportSectionContext';

/**
 * Report Section runtime sonucunu ReportPipelineContext.bag’e işler.
 * Foundation bag.sections alanını da doldurur.
 */
export function attachReportSectionToPipelineContext(
  context: ReportPipelineContext,
  result: ReportSectionResult
): void {
  context.bag[PIPELINE_BAG_REPORT_SECTION_RUNTIME_RESULT_KEY] = result;
  context.bag.sections = result.sections;
}

/**
 * Bag’den zengin Report Section runtime sonucunu okur.
 */
export function readReportSectionFromPipelineContext(
  context: ReportPipelineContext
): ReportSectionResult | undefined {
  const value = context.bag[PIPELINE_BAG_REPORT_SECTION_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as ReportSectionResult;
}

/**
 * PipelineResult.context.bag üzerinden Report Section sonucunu bağlar.
 */
export function attachReportSectionToPipelineResult(
  pipelineResult: ReportPipelineResult,
  result: ReportSectionResult
): void {
  const ctx = pipelineResult.context as ReportPipelineContext;
  attachReportSectionToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Report Section runtime sonucunu okur.
 */
export function readReportSectionFromPipelineResult(
  pipelineResult: ReportPipelineResult
): ReportSectionResult | undefined {
  return readReportSectionFromPipelineContext(
    pipelineResult.context as ReportPipelineContext
  );
}

/**
 * Validation + prior stage sonuçlarına Report Section Builder uygular.
 * PR-104A–C orchestrator dosyalarını değiştirmez.
 */
export function applyReportSectionBuilderToPipelineResult(
  pipelineResult: ReportPipelineResult,
  builder: ReportSectionBuilderRuntime = createReportSectionBuilderRuntime()
): ReportSectionResult {
  const context = pipelineResult.context as ReportPipelineContext;
  const validation = context.bag.decisionValidation;
  const reportModelResult = readReportModelFromPipelineContext(context);
  const narrativeResult = readNarrativeFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = builder.compute(
      createReportSectionContext({
        reportContext: context.reportContext,
        request: context.request,
        locale: context.reportContext.locale
      })
    );
    const withWarning: ReportSectionResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'DecisionResult validation başarısız; Report Section boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachReportSectionToPipelineContext(context, withWarning);

    const mutableSkip = pipelineResult.reportModel as {
      sections: typeof pipelineResult.reportModel.sections;
    };
    mutableSkip.sections = withWarning.sections;
    return withWarning;
  }

  const result = builder.compute(
    createReportSectionContext({
      reportContext: context.reportContext,
      request: context.request,
      reportModelResult,
      reportModel: reportModelResult?.model,
      narrativeResult,
      locale: context.reportContext.locale,
      bag: context.bag
    })
  );

  attachReportSectionToPipelineContext(context, result);

  const mutableResult = pipelineResult.reportModel as {
    sections: typeof pipelineResult.reportModel.sections;
    lastStage: typeof pipelineResult.reportModel.lastStage;
  };
  mutableResult.sections = result.sections;
  mutableResult.lastStage = 'bolum-derleme';

  return result;
}
