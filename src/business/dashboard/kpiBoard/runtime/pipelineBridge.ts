/**
 * Dashboard Pipeline köprüsü — PR-105A–C dosyalarını değiştirmeden bag’e yazar (PR-105D).
 */

import { readDashboardModelFromPipelineContext } from '../../modelBuilder/runtime/pipelineBridge';
import type { DashboardPipelineContext } from '../../pipeline/runtime/DashboardPipelineContext';
import type { DashboardPipelineResult } from '../../pipeline/runtime/DashboardPipelineResult';
import { readWidgetFromPipelineContext } from '../../widgetBuilder/runtime/pipelineBridge';
import type { KpiBoardRuntime } from './KpiBoardRuntime';
import { createKpiBoardRuntime } from './KpiBoardRuntime';
import { createKpiBoardContext } from './KpiBoardContext';
import type { KpiBoardResult } from './KpiBoardResult';
import { PIPELINE_BAG_DASHBOARD_KPI_BOARD_RUNTIME_RESULT_KEY } from './KpiBoardResult';

/**
 * KPI Board runtime sonucunu DashboardPipelineContext.bag’e işler.
 * Foundation bag.kpis alanını da doldurur.
 */
export function attachKpiBoardToPipelineContext(
  context: DashboardPipelineContext,
  result: KpiBoardResult
): void {
  context.bag[PIPELINE_BAG_DASHBOARD_KPI_BOARD_RUNTIME_RESULT_KEY] = result;
  context.bag.kpis = result.kpis;
}

/**
 * Bag’den zengin KPI Board runtime sonucunu okur.
 */
export function readKpiBoardFromPipelineContext(
  context: DashboardPipelineContext
): KpiBoardResult | undefined {
  const value = context.bag[PIPELINE_BAG_DASHBOARD_KPI_BOARD_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as KpiBoardResult;
}

/**
 * PipelineResult.context.bag üzerinden KPI Board sonucunu bağlar.
 */
export function attachKpiBoardToPipelineResult(
  pipelineResult: DashboardPipelineResult,
  result: KpiBoardResult
): void {
  const ctx = pipelineResult.context as DashboardPipelineContext;
  attachKpiBoardToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden KPI Board runtime sonucunu okur.
 */
export function readKpiBoardFromPipelineResult(
  pipelineResult: DashboardPipelineResult
): KpiBoardResult | undefined {
  return readKpiBoardFromPipelineContext(
    pipelineResult.context as DashboardPipelineContext
  );
}

/**
 * Validation + prior stage sonuçlarına KPI Board uygular.
 * PR-105A–C orchestrator dosyalarını değiştirmez.
 */
export function applyKpiBoardToPipelineResult(
  pipelineResult: DashboardPipelineResult,
  builder: KpiBoardRuntime = createKpiBoardRuntime()
): KpiBoardResult {
  const context = pipelineResult.context as DashboardPipelineContext;
  const validation = context.bag.sourceValidation;
  const dashboardModelResult = readDashboardModelFromPipelineContext(context);
  const widgetResult = readWidgetFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = builder.compute(
      createKpiBoardContext({
        dashboardContext: context.dashboardContext,
        request: context.request,
        locale: context.dashboardContext.locale
      })
    );
    const withWarning: KpiBoardResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'Dashboard source validation başarısız; KPI Board boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachKpiBoardToPipelineContext(context, withWarning);

    const mutableSkip = pipelineResult.dashboardModel as {
      kpis: typeof pipelineResult.dashboardModel.kpis;
    };
    mutableSkip.kpis = withWarning.kpis;
    return withWarning;
  }

  const result = builder.compute(
    createKpiBoardContext({
      dashboardContext: context.dashboardContext,
      request: context.request,
      dashboardModelResult,
      dashboardModel: dashboardModelResult?.model,
      widgetResult,
      locale: context.dashboardContext.locale,
      bag: context.bag
    })
  );

  attachKpiBoardToPipelineContext(context, result);

  const mutableResult = pipelineResult.dashboardModel as {
    kpis: typeof pipelineResult.dashboardModel.kpis;
    lastStage: typeof pipelineResult.dashboardModel.lastStage;
  };
  mutableResult.kpis = result.kpis;
  mutableResult.lastStage = 'dashboard-birlestirme';

  return result;
}
