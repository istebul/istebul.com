/**
 * Dashboard Pipeline köprüsü — PR-105A–D dosyalarını değiştirmeden bag’e yazar (PR-105E).
 */

import { readDashboardModelFromPipelineContext } from '../../modelBuilder/runtime/pipelineBridge';
import { readKpiBoardFromPipelineContext } from '../../kpiBoard/runtime/pipelineBridge';
import type { DashboardPipelineContext } from '../../pipeline/runtime/DashboardPipelineContext';
import type { DashboardPipelineResult } from '../../pipeline/runtime/DashboardPipelineResult';
import { readWidgetFromPipelineContext } from '../../widgetBuilder/runtime/pipelineBridge';
import type { DashboardSummaryResult } from './DashboardSummaryResult';
import { PIPELINE_BAG_DASHBOARD_SUMMARY_RUNTIME_RESULT_KEY } from './DashboardSummaryResult';
import type { DashboardSummaryRuntime } from './DashboardSummaryRuntime';
import { createDashboardSummaryRuntime } from './DashboardSummaryRuntime';
import { createDashboardSummaryContext } from './DashboardSummaryContext';

/**
 * Dashboard Summary runtime sonucunu DashboardPipelineContext.bag’e işler.
 * `bag.dashboardSummary` alanını da doldurur (index signature).
 */
export function attachDashboardSummaryToPipelineContext(
  context: DashboardPipelineContext,
  result: DashboardSummaryResult
): void {
  context.bag[PIPELINE_BAG_DASHBOARD_SUMMARY_RUNTIME_RESULT_KEY] = result;
  context.bag.dashboardSummary = result.summary;
}

/**
 * Bag’den zengin Dashboard Summary runtime sonucunu okur.
 */
export function readDashboardSummaryFromPipelineContext(
  context: DashboardPipelineContext
): DashboardSummaryResult | undefined {
  const value = context.bag[PIPELINE_BAG_DASHBOARD_SUMMARY_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as DashboardSummaryResult;
}

/**
 * PipelineResult.context.bag üzerinden Dashboard Summary sonucunu bağlar.
 */
export function attachDashboardSummaryToPipelineResult(
  pipelineResult: DashboardPipelineResult,
  result: DashboardSummaryResult
): void {
  const ctx = pipelineResult.context as DashboardPipelineContext;
  attachDashboardSummaryToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Dashboard Summary runtime sonucunu okur.
 */
export function readDashboardSummaryFromPipelineResult(
  pipelineResult: DashboardPipelineResult
): DashboardSummaryResult | undefined {
  return readDashboardSummaryFromPipelineContext(
    pipelineResult.context as DashboardPipelineContext
  );
}

/**
 * Validation + prior stage sonuçları üzerinden Dashboard Summary uygular.
 * PR-105A–D orchestrator dosyalarını değiştirmez.
 */
export function applyDashboardSummaryToPipelineResult(
  pipelineResult: DashboardPipelineResult,
  runtime: DashboardSummaryRuntime = createDashboardSummaryRuntime()
): DashboardSummaryResult {
  const context = pipelineResult.context as DashboardPipelineContext;
  const validation = context.bag.sourceValidation;
  const dashboardModelResult = readDashboardModelFromPipelineContext(context);
  const widgetResult = readWidgetFromPipelineContext(context);
  const kpiBoardResult = readKpiBoardFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = runtime.compute(
      createDashboardSummaryContext({
        dashboardContext: context.dashboardContext,
        request: context.request,
        locale: context.dashboardContext.locale
      })
    );
    const withWarning: DashboardSummaryResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'Dashboard source validation başarısız; Dashboard Summary boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachDashboardSummaryToPipelineContext(context, withWarning);
    return withWarning;
  }

  const result = runtime.compute(
    createDashboardSummaryContext({
      dashboardContext: context.dashboardContext,
      request: context.request,
      dashboardModelResult,
      dashboardModel: dashboardModelResult?.model,
      widgetResult,
      kpiBoardResult,
      locale: context.dashboardContext.locale,
      bag: context.bag
    })
  );

  attachDashboardSummaryToPipelineContext(context, result);
  return result;
}
