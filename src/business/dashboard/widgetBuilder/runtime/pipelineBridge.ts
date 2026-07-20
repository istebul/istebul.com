/**
 * Dashboard Pipeline köprüsü — PR-105A–B dosyalarını değiştirmeden bag’e yazar (PR-105C).
 */

import { readDashboardModelFromPipelineContext } from '../../modelBuilder/runtime/pipelineBridge';
import type { DashboardPipelineContext } from '../../pipeline/runtime/DashboardPipelineContext';
import type { DashboardPipelineResult } from '../../pipeline/runtime/DashboardPipelineResult';
import type { WidgetBuilderRuntime } from './WidgetBuilderRuntime';
import { createWidgetBuilderRuntime } from './WidgetBuilderRuntime';
import { createWidgetContext } from './WidgetContext';
import type { WidgetResult } from './WidgetResult';
import { PIPELINE_BAG_DASHBOARD_WIDGET_RUNTIME_RESULT_KEY } from './WidgetResult';

/**
 * Widget runtime sonucunu DashboardPipelineContext.bag’e işler.
 * Foundation bag.widgets alanını da doldurur.
 */
export function attachWidgetToPipelineContext(
  context: DashboardPipelineContext,
  result: WidgetResult
): void {
  context.bag[PIPELINE_BAG_DASHBOARD_WIDGET_RUNTIME_RESULT_KEY] = result;
  context.bag.widgets = result.widgets;
}

/**
 * Bag’den zengin Widget runtime sonucunu okur.
 */
export function readWidgetFromPipelineContext(
  context: DashboardPipelineContext
): WidgetResult | undefined {
  const value = context.bag[PIPELINE_BAG_DASHBOARD_WIDGET_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as WidgetResult;
}

/**
 * PipelineResult.context.bag üzerinden Widget sonucunu bağlar.
 */
export function attachWidgetToPipelineResult(
  pipelineResult: DashboardPipelineResult,
  result: WidgetResult
): void {
  const ctx = pipelineResult.context as DashboardPipelineContext;
  attachWidgetToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Widget runtime sonucunu okur.
 */
export function readWidgetFromPipelineResult(
  pipelineResult: DashboardPipelineResult
): WidgetResult | undefined {
  return readWidgetFromPipelineContext(
    pipelineResult.context as DashboardPipelineContext
  );
}

/**
 * Validation + prior model sonuçlarına Widget Builder uygular.
 * PR-105A–B orchestrator dosyalarını değiştirmez.
 */
export function applyWidgetBuilderToPipelineResult(
  pipelineResult: DashboardPipelineResult,
  builder: WidgetBuilderRuntime = createWidgetBuilderRuntime()
): WidgetResult {
  const context = pipelineResult.context as DashboardPipelineContext;
  const validation = context.bag.sourceValidation;
  const dashboardModelResult = readDashboardModelFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = builder.compute(
      createWidgetContext({
        dashboardContext: context.dashboardContext,
        request: context.request,
        locale: context.dashboardContext.locale
      })
    );
    const withWarning: WidgetResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'Dashboard source validation başarısız; Widget seti boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachWidgetToPipelineContext(context, withWarning);

    const mutableSkip = pipelineResult.dashboardModel as {
      widgets: typeof pipelineResult.dashboardModel.widgets;
    };
    mutableSkip.widgets = withWarning.widgets;
    return withWarning;
  }

  const result = builder.compute(
    createWidgetContext({
      dashboardContext: context.dashboardContext,
      request: context.request,
      dashboardModelResult,
      dashboardModel: dashboardModelResult?.model,
      locale: context.dashboardContext.locale,
      bag: context.bag
    })
  );

  attachWidgetToPipelineContext(context, result);

  const mutableResult = pipelineResult.dashboardModel as {
    widgets: typeof pipelineResult.dashboardModel.widgets;
    lastStage: typeof pipelineResult.dashboardModel.lastStage;
  };
  mutableResult.widgets = result.widgets;
  mutableResult.lastStage = 'widget-derleme';

  return result;
}
