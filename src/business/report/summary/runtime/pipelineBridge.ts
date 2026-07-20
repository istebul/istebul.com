/**
 * Report Pipeline köprüsü — PR-104A–D dosyalarını değiştirmeden bag’e yazar (PR-104E).
 */

import type { ReportPipelineContext } from '../../pipeline/runtime/ReportPipelineContext';
import type { ReportPipelineResult } from '../../pipeline/runtime/ReportPipelineResult';
import { readReportModelFromPipelineContext } from '../../modelBuilder/runtime/pipelineBridge';
import { readNarrativeFromPipelineContext } from '../../narrative/runtime/pipelineBridge';
import { readReportSectionFromPipelineContext } from '../../sectionBuilder/runtime/pipelineBridge';
import type { ReportSummaryResult } from './ReportSummaryResult';
import { PIPELINE_BAG_REPORT_SUMMARY_RUNTIME_RESULT_KEY } from './ReportSummaryResult';
import type { ReportSummaryRuntime } from './ReportSummaryRuntime';
import { createReportSummaryRuntime } from './ReportSummaryRuntime';
import { createReportSummaryContext } from './ReportSummaryContext';

/**
 * Report Summary runtime sonucunu ReportPipelineContext.bag’e işler.
 * `bag.reportSummary` alanını da doldurur (index signature).
 */
export function attachReportSummaryToPipelineContext(
  context: ReportPipelineContext,
  result: ReportSummaryResult
): void {
  context.bag[PIPELINE_BAG_REPORT_SUMMARY_RUNTIME_RESULT_KEY] = result;
  context.bag.reportSummary = result.reportSummary;
}

/**
 * Bag’den zengin Report Summary runtime sonucunu okur.
 */
export function readReportSummaryFromPipelineContext(
  context: ReportPipelineContext
): ReportSummaryResult | undefined {
  const value = context.bag[PIPELINE_BAG_REPORT_SUMMARY_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as ReportSummaryResult;
}

/**
 * PipelineResult.context.bag üzerinden Report Summary sonucunu bağlar.
 */
export function attachReportSummaryToPipelineResult(
  pipelineResult: ReportPipelineResult,
  result: ReportSummaryResult
): void {
  const ctx = pipelineResult.context as ReportPipelineContext;
  attachReportSummaryToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Report Summary runtime sonucunu okur.
 */
export function readReportSummaryFromPipelineResult(
  pipelineResult: ReportPipelineResult
): ReportSummaryResult | undefined {
  return readReportSummaryFromPipelineContext(
    pipelineResult.context as ReportPipelineContext
  );
}

/**
 * Validation + prior stage sonuçları üzerinden Report Summary uygular.
 * PR-104A–D orchestrator dosyalarını değiştirmez.
 */
export function applyReportSummaryToPipelineResult(
  pipelineResult: ReportPipelineResult,
  runtime: ReportSummaryRuntime = createReportSummaryRuntime()
): ReportSummaryResult {
  const context = pipelineResult.context as ReportPipelineContext;
  const validation = context.bag.decisionValidation;
  const reportModelResult = readReportModelFromPipelineContext(context);
  const narrativeResult = readNarrativeFromPipelineContext(context);
  const reportSectionResult = readReportSectionFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = runtime.compute(
      createReportSummaryContext({
        reportContext: context.reportContext,
        request: context.request,
        locale: context.reportContext.locale
      })
    );
    const withWarning: ReportSummaryResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'DecisionResult validation başarısız; Report Summary boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachReportSummaryToPipelineContext(context, withWarning);
    return withWarning;
  }

  const result = runtime.compute(
    createReportSummaryContext({
      reportContext: context.reportContext,
      request: context.request,
      reportModelResult,
      reportModel: reportModelResult?.model,
      narrativeResult,
      reportSectionResult,
      locale: context.reportContext.locale,
      bag: context.bag
    })
  );

  attachReportSummaryToPipelineContext(context, result);
  return result;
}
