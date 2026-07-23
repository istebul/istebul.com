/**
 * İSTEBUL Business Dashboard Engine — DashboardPipelineRunner (PR-105F).
 *
 * Validation → Model → Widget → KPI → Summary uçtan uca birleştirir.
 * PR-105A–E dosyalarını değiştirmez; apply* köprülerini kullanır.
 */

import { getDashboardPipelineStage } from '../../pipeline/DashboardPipeline';
import type { DashboardPipelineContext } from '../../pipeline/runtime/DashboardPipelineContext';
import {
  createDashboardPipelineRuntime,
  type DashboardPipelineRuntime
} from '../../pipeline/runtime/DashboardPipelineRuntime';
import {
  endDashboardStageTimer,
  nowMs,
  startDashboardStageTimer
} from '../../pipeline/runtime/DashboardTiming';
import type {
  DashboardExecutionStatus,
  DashboardStage
} from '../../models/DashboardStage';
import {
  applyDashboardModelBuilderToPipelineResult,
  createDashboardModelBuilderRuntime,
  DASHBOARD_PART_ORDER,
  type DashboardModelBuilderRuntime,
  type DashboardModelResult
} from '../../modelBuilder/runtime/index';
import {
  applyWidgetBuilderToPipelineResult,
  createWidgetBuilderRuntime,
  WIDGET_ORDER,
  type WidgetBuilderRuntime,
  type WidgetResult
} from '../../widgetBuilder/runtime/index';
import {
  applyKpiBoardToPipelineResult,
  createKpiBoardRuntime,
  KPI_ORDER,
  type KpiBoardRuntime,
  type KpiBoardResult
} from '../../kpiBoard/runtime/index';
import {
  applyDashboardSummaryToPipelineResult,
  createDashboardSummaryRuntime,
  DASHBOARD_SUMMARY_SECTION_ORDER,
  type DashboardSummaryResult,
  type DashboardSummaryRuntime
} from '../../summary/runtime/index';
import type { DashboardExecutionContext } from './DashboardExecutionContext';
import type { DashboardExecutionResult } from './DashboardExecutionResult';
import {
  buildDashboardExecutionTelemetry,
  createSkippedStageExecution,
  ensureRequestIds,
  mutateDashboardModel,
  replaceStageExecution,
  resolveDashboardContext,
  syncDashboardModelFromBag
} from './helpers';

const DOWNSTREAM_ON_VALIDATION_FAIL: readonly DashboardStage[] = [
  'widget-derleme',
  'yerlesim-cozumu',
  'filtre-cozumu',
  'dashboard-birlestirme'
];

export interface DashboardPipelineRunnerDependencies {
  pipelineRuntime?: DashboardPipelineRuntime;
  dashboardModelBuilder?: DashboardModelBuilderRuntime;
  widgetBuilder?: WidgetBuilderRuntime;
  kpiBoardRuntime?: KpiBoardRuntime;
  dashboardSummaryRuntime?: DashboardSummaryRuntime;
}

function stageName(stageId: DashboardStage): string {
  return getDashboardPipelineStage(stageId)?.name ?? stageId;
}

function skipDownstreamStages(
  context: DashboardPipelineContext,
  stages: readonly DashboardStage[],
  detail: string
): void {
  for (const stageId of stages) {
    replaceStageExecution(
      context,
      createSkippedStageExecution(stageId, stageName(stageId), detail)
    );
  }
}

/**
 * Uçtan uca Dashboard Pipeline yürütücüsü.
 */
export class DashboardPipelineRunner {
  private readonly dashboardModelBuilder: DashboardModelBuilderRuntime;
  private readonly widgetBuilder: WidgetBuilderRuntime;
  private readonly kpiBoardRuntime: KpiBoardRuntime;
  private readonly dashboardSummaryRuntime: DashboardSummaryRuntime;
  private readonly pipelineRuntime?: DashboardPipelineRuntime;

  constructor(deps: DashboardPipelineRunnerDependencies = {}) {
    this.dashboardModelBuilder =
      deps.dashboardModelBuilder ?? createDashboardModelBuilderRuntime();
    this.widgetBuilder =
      deps.widgetBuilder ?? createWidgetBuilderRuntime();
    this.kpiBoardRuntime =
      deps.kpiBoardRuntime ?? createKpiBoardRuntime();
    this.dashboardSummaryRuntime =
      deps.dashboardSummaryRuntime ?? createDashboardSummaryRuntime();
    this.pipelineRuntime = deps.pipelineRuntime;
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  async execute(
    execution: DashboardExecutionContext
  ): Promise<DashboardExecutionResult> {
    const startedMark = nowMs();
    const startedAt = new Date().toISOString();

    const dashboardContext = resolveDashboardContext(execution);
    const request = ensureRequestIds(
      {
        ...execution.request,
        locale: execution.locale ?? execution.request.locale
      },
      {
        reportModel: dashboardContext.reportModel,
        decisionResult: dashboardContext.decisionResult,
        analysisResult: dashboardContext.analysisResult
      }
    );

    const pipeline =
      this.pipelineRuntime ??
      createDashboardPipelineRuntime({ initialContext: dashboardContext });

    const detailed = await pipeline.runWithDetails(request, dashboardContext);
    const context = detailed.context as DashboardPipelineContext;

    if (execution.initialBag) {
      Object.assign(context.bag, execution.initialBag);
    }

    const validationStage = context.stageExecutions.find(
      (item) => item.stageId === 'dashboard-dogrulama'
    );
    const validationFailed = validationStage?.outcome === 'basarisiz';

    let dashboardModelResult: DashboardModelResult | undefined;
    let widgetResult: WidgetResult | undefined;
    let kpiBoardResult: KpiBoardResult | undefined;
    let dashboardSummaryResult: DashboardSummaryResult | undefined;

    if (validationFailed) {
      skipDownstreamStages(
        context,
        DOWNSTREAM_ON_VALIDATION_FAIL,
        'Dashboard source validation başarısız; Model Builder / Widget Builder / KPI Board atlandı.'
      );

      const summaryTimer = startDashboardStageTimer();
      dashboardSummaryResult = applyDashboardSummaryToPipelineResult(
        detailed,
        this.dashboardSummaryRuntime
      );
      const summaryTiming = endDashboardStageTimer(summaryTimer);

      replaceStageExecution(context, {
        stageId: 'dashboard-derleme',
        stageName: stageName('dashboard-derleme'),
        outcome: 'basarili',
        errors: [],
        warnings: dashboardSummaryResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'dashboard-derleme' as const,
          recoverable: true
        })),
        detail: `Dashboard Summary produced from current state (${dashboardSummaryResult.sections.length} sections).`,
        ...summaryTiming
      });

      syncDashboardModelFromBag(detailed.dashboardModel, context);
      mutateDashboardModel(
        detailed.dashboardModel,
        'basarisiz',
        validationStage?.stageId ?? 'dashboard-dogrulama'
      );
      context.dashboardContext.status = 'basarisiz';
      context.dashboardContext.currentStage =
        validationStage?.stageId ?? 'dashboard-dogrulama';
    } else {
      const widgetTimer = startDashboardStageTimer();
      dashboardModelResult = applyDashboardModelBuilderToPipelineResult(
        detailed,
        this.dashboardModelBuilder
      );
      widgetResult = applyWidgetBuilderToPipelineResult(
        detailed,
        this.widgetBuilder
      );
      const widgetTiming = endDashboardStageTimer(widgetTimer);

      replaceStageExecution(context, {
        stageId: 'widget-derleme',
        stageName: stageName('widget-derleme'),
        outcome: 'basarili',
        errors: [],
        warnings: [
          ...dashboardModelResult.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
            stage: 'widget-derleme' as const,
            recoverable: true
          })),
          ...widgetResult.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
            stage: 'widget-derleme' as const,
            recoverable: true
          }))
        ],
        detail: `Dashboard Model (${DASHBOARD_PART_ORDER.length} parts) + Widget (${widgetResult.widgets.length} / ${WIDGET_ORDER.length}) composed.`,
        ...widgetTiming
      });

      const compositionTimer = startDashboardStageTimer();
      kpiBoardResult = applyKpiBoardToPipelineResult(
        detailed,
        this.kpiBoardRuntime
      );
      const compositionTiming = endDashboardStageTimer(compositionTimer);

      replaceStageExecution(context, {
        stageId: 'dashboard-birlestirme',
        stageName: stageName('dashboard-birlestirme'),
        outcome: 'basarili',
        errors: [],
        warnings: kpiBoardResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'dashboard-birlestirme' as const,
          recoverable: true
        })),
        detail: `KPI Board (${kpiBoardResult.kpis.length} / ${KPI_ORDER.length}) composed into DashboardModel.`,
        ...compositionTiming
      });

      replaceStageExecution(
        context,
        createSkippedStageExecution(
          'yerlesim-cozumu',
          stageName('yerlesim-cozumu'),
          'Layout resolution is not composed in end-to-end Dashboard Runtime (PR-105F).'
        )
      );

      replaceStageExecution(
        context,
        createSkippedStageExecution(
          'filtre-cozumu',
          stageName('filtre-cozumu'),
          'Filter resolution is not composed in end-to-end Dashboard Runtime (PR-105F).'
        )
      );

      const summaryTimer = startDashboardStageTimer();
      dashboardSummaryResult = applyDashboardSummaryToPipelineResult(
        detailed,
        this.dashboardSummaryRuntime
      );
      const summaryTiming = endDashboardStageTimer(summaryTimer);

      const hasHardFailure = context.stageExecutions.some(
        (item) =>
          item.stageId !== 'dashboard-derleme' && item.outcome === 'basarisiz'
      );
      const hasNotImplemented = context.stageExecutions.some(
        (item) =>
          item.stageId !== 'dashboard-derleme' &&
          item.outcome === 'not-implemented'
      );
      const assemblyFailed = hasHardFailure || hasNotImplemented;

      replaceStageExecution(context, {
        stageId: 'dashboard-derleme',
        stageName: stageName('dashboard-derleme'),
        outcome: assemblyFailed ? 'basarisiz' : 'basarili',
        errors: [],
        warnings: dashboardSummaryResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'dashboard-derleme' as const,
          recoverable: true
        })),
        detail: assemblyFailed
          ? 'DashboardModel assembly completed with failures.'
          : `${dashboardSummaryResult.sections.length} Dashboard Summary bölümü üretildi (${DASHBOARD_SUMMARY_SECTION_ORDER.length} beklenen).`,
        ...summaryTiming
      });

      syncDashboardModelFromBag(detailed.dashboardModel, context);
      const status: DashboardExecutionStatus = hasHardFailure
        ? 'basarisiz'
        : 'basarili';
      mutateDashboardModel(detailed.dashboardModel, status, 'dashboard-derleme');
      context.dashboardContext.status = status;
      context.dashboardContext.currentStage = 'dashboard-derleme';
    }

    const endedAt = new Date().toISOString();
    const totalDurationMs = Math.max(0, Math.round(nowMs() - startedMark));

    const telemetry = buildDashboardExecutionTelemetry(
      context,
      startedAt,
      endedAt,
      totalDurationMs,
      {
        dashboardModelPartCount: dashboardModelResult
          ? DASHBOARD_PART_ORDER.length
          : 0,
        widgetCount: widgetResult?.widgets.length ?? 0,
        kpiCount: kpiBoardResult?.kpis.length ?? 0,
        summarySectionCount: dashboardSummaryResult?.sections.length ?? 0
      }
    );

    return {
      dashboardModel: detailed.dashboardModel,
      pipelineContext: context,
      stageExecutions: [...context.stageExecutions],
      telemetry,
      dashboardModelResult,
      widgetResult,
      kpiBoardResult,
      dashboardSummaryResult
    };
  }
}

/**
 * Fabrika.
 */
export function createDashboardPipelineRunner(
  deps?: DashboardPipelineRunnerDependencies
): DashboardPipelineRunner {
  return new DashboardPipelineRunner(deps);
}

export default DashboardPipelineRunner;
