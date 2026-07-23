/**
 * Dashboard Pipeline köprüsü — PR-105A dosyalarını değiştirmeden bag’e yazar (PR-105B).
 */

import type { DashboardPipelineContext } from '../../pipeline/runtime/DashboardPipelineContext';
import type { DashboardPipelineResult } from '../../pipeline/runtime/DashboardPipelineResult';
import type { DashboardModelResult } from './DashboardModelResult';
import { PIPELINE_BAG_DASHBOARD_MODEL_RUNTIME_RESULT_KEY } from './DashboardModelResult';
import type { DashboardModelBuilderRuntime } from './DashboardModelBuilderRuntime';
import { createDashboardModelBuilderRuntime } from './DashboardModelBuilderRuntime';
import { createDashboardModelContext } from './DashboardModelContext';

/**
 * Dashboard Model runtime sonucunu DashboardPipelineContext.bag’e işler.
 * Foundation bag.dashboardModel alanını da doldurur.
 */
export function attachDashboardModelToPipelineContext(
  context: DashboardPipelineContext,
  result: DashboardModelResult
): void {
  context.bag[PIPELINE_BAG_DASHBOARD_MODEL_RUNTIME_RESULT_KEY] = result;
  context.bag.dashboardModel = result.foundationModel;
  context.bag.sections = result.foundationModel.sections;
  context.bag.navigation = result.foundationModel.navigation;
}

/**
 * Bag’den zengin Dashboard Model runtime sonucunu okur.
 */
export function readDashboardModelFromPipelineContext(
  context: DashboardPipelineContext
): DashboardModelResult | undefined {
  const value = context.bag[PIPELINE_BAG_DASHBOARD_MODEL_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as DashboardModelResult;
}

/**
 * PipelineResult.context.bag üzerinden Dashboard Model sonucunu bağlar.
 */
export function attachDashboardModelToPipelineResult(
  pipelineResult: DashboardPipelineResult,
  result: DashboardModelResult
): void {
  const ctx = pipelineResult.context as DashboardPipelineContext;
  attachDashboardModelToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Dashboard Model runtime sonucunu okur.
 */
export function readDashboardModelFromPipelineResult(
  pipelineResult: DashboardPipelineResult
): DashboardModelResult | undefined {
  return readDashboardModelFromPipelineContext(
    pipelineResult.context as DashboardPipelineContext
  );
}

/**
 * Validation geçmiş pipeline sonucuna Dashboard Model Builder uygular.
 * PR-105A orchestrator dosyalarını değiştirmez.
 */
export function applyDashboardModelBuilderToPipelineResult(
  pipelineResult: DashboardPipelineResult,
  builder: DashboardModelBuilderRuntime = createDashboardModelBuilderRuntime()
): DashboardModelResult {
  const context = pipelineResult.context as DashboardPipelineContext;
  const validation = context.bag.sourceValidation;

  if (validation && validation.isValid === false) {
    const skipped = builder.compute(
      createDashboardModelContext({
        request: context.request,
        locale: context.dashboardContext.locale
      })
    );
    const withWarning: DashboardModelResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'Dashboard source validation başarısız; Dashboard Model boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachDashboardModelToPipelineContext(context, withWarning);

    const mutableSkip = pipelineResult.dashboardModel as {
      metadata: typeof pipelineResult.dashboardModel.metadata;
      sections: typeof pipelineResult.dashboardModel.sections;
      navigation: typeof pipelineResult.dashboardModel.navigation;
    };
    mutableSkip.metadata = withWarning.foundationMetadata;
    mutableSkip.sections = withWarning.foundationModel.sections;
    mutableSkip.navigation = withWarning.foundationModel.navigation;
    return withWarning;
  }

  const result = builder.compute(
    createDashboardModelContext({
      dashboardContext: context.dashboardContext,
      request: context.request,
      reportModel: context.dashboardContext.reportModel,
      decisionResult: context.dashboardContext.decisionResult,
      locale: context.dashboardContext.locale,
      bag: context.bag
    })
  );

  attachDashboardModelToPipelineContext(context, result);

  const mutableResult = pipelineResult.dashboardModel as {
    metadata: typeof pipelineResult.dashboardModel.metadata;
    sections: typeof pipelineResult.dashboardModel.sections;
    navigation: typeof pipelineResult.dashboardModel.navigation;
    lastStage: typeof pipelineResult.dashboardModel.lastStage;
  };
  mutableResult.metadata = result.foundationMetadata;
  mutableResult.sections = result.foundationModel.sections;
  mutableResult.navigation = result.foundationModel.navigation;
  mutableResult.lastStage = 'dashboard-birlestirme';

  return result;
}
