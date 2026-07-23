/**
 * İSTEBUL Business Report Engine — ReportPipelineRunner (PR-104F).
 *
 * Validation → Model → Narrative → Section → Summary uçtan uca birleştirir.
 * PR-104A–E dosyalarını değiştirmez; apply* köprülerini kullanır.
 */

import { getReportPipelineStage } from '../../pipeline/ReportPipeline';
import type { ReportPipelineContext } from '../../pipeline/runtime/ReportPipelineContext';
import {
  createReportPipelineRuntime,
  type ReportPipelineRuntime
} from '../../pipeline/runtime/ReportPipelineRuntime';
import {
  endReportStageTimer,
  nowMs,
  startReportStageTimer
} from '../../pipeline/runtime/ReportTiming';
import type { ReportExecutionStatus, ReportStage } from '../../models/ReportStage';
import {
  applyReportModelBuilderToPipelineResult,
  createReportModelBuilderRuntime,
  REPORT_PART_ORDER,
  type ReportModelBuilderRuntime,
  type ReportModelResult
} from '../../modelBuilder/runtime/index';
import {
  applyNarrativeComposerToPipelineResult,
  createNarrativeComposerRuntime,
  type NarrativeComposerRuntime,
  type NarrativeResult
} from '../../narrative/runtime/index';
import {
  applyReportSectionBuilderToPipelineResult,
  createReportSectionBuilderRuntime,
  type ReportSectionBuilderRuntime,
  type ReportSectionResult
} from '../../sectionBuilder/runtime/index';
import {
  applyReportSummaryToPipelineResult,
  createReportSummaryRuntime,
  type ReportSummaryResult,
  type ReportSummaryRuntime
} from '../../summary/runtime/index';
import type { ReportExecutionContext } from './ReportExecutionContext';
import type { ReportExecutionResult } from './ReportExecutionResult';
import {
  buildReportExecutionTelemetry,
  createSkippedStageExecution,
  ensureRequestIds,
  mutateReportModel,
  replaceStageExecution,
  resolveReportContext,
  syncReportModelFromBag
} from './helpers';

const DOWNSTREAM_ON_VALIDATION_FAIL: readonly ReportStage[] = [
  'bolum-derleme',
  'kanit-toplama',
  'rapor-birlestirme',
  'rapor-inceleme'
];

export interface ReportPipelineRunnerDependencies {
  pipelineRuntime?: ReportPipelineRuntime;
  reportModelBuilder?: ReportModelBuilderRuntime;
  narrativeComposer?: NarrativeComposerRuntime;
  reportSectionBuilder?: ReportSectionBuilderRuntime;
  reportSummaryRuntime?: ReportSummaryRuntime;
}

function stageName(stageId: ReportStage): string {
  return getReportPipelineStage(stageId)?.name ?? stageId;
}

function skipDownstreamStages(
  context: ReportPipelineContext,
  stages: readonly ReportStage[],
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
 * Uçtan uca Report Pipeline yürütücüsü.
 */
export class ReportPipelineRunner {
  private readonly reportModelBuilder: ReportModelBuilderRuntime;
  private readonly narrativeComposer: NarrativeComposerRuntime;
  private readonly reportSectionBuilder: ReportSectionBuilderRuntime;
  private readonly reportSummaryRuntime: ReportSummaryRuntime;
  private readonly pipelineRuntime?: ReportPipelineRuntime;

  constructor(deps: ReportPipelineRunnerDependencies = {}) {
    this.reportModelBuilder =
      deps.reportModelBuilder ?? createReportModelBuilderRuntime();
    this.narrativeComposer =
      deps.narrativeComposer ?? createNarrativeComposerRuntime();
    this.reportSectionBuilder =
      deps.reportSectionBuilder ?? createReportSectionBuilderRuntime();
    this.reportSummaryRuntime =
      deps.reportSummaryRuntime ?? createReportSummaryRuntime();
    this.pipelineRuntime = deps.pipelineRuntime;
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  async execute(
    execution: ReportExecutionContext
  ): Promise<ReportExecutionResult> {
    const startedMark = nowMs();
    const startedAt = new Date().toISOString();

    const reportContext = resolveReportContext(execution);
    const request = ensureRequestIds(
      {
        ...execution.request,
        locale: execution.locale ?? execution.request.locale
      },
      reportContext.decisionResult
    );

    const pipeline =
      this.pipelineRuntime ??
      createReportPipelineRuntime({ initialContext: reportContext });

    const detailed = await pipeline.runWithDetails(request, reportContext);
    const context = detailed.context as ReportPipelineContext;

    if (execution.initialBag) {
      Object.assign(context.bag, execution.initialBag);
    }

    const validationStage = context.stageExecutions.find(
      (item) => item.stageId === 'karar-dogrulama'
    );
    const validationFailed = validationStage?.outcome === 'basarisiz';

    let reportModelResult: ReportModelResult | undefined;
    let narrativeResult: NarrativeResult | undefined;
    let reportSectionResult: ReportSectionResult | undefined;
    let reportSummaryResult: ReportSummaryResult | undefined;

    if (validationFailed) {
      skipDownstreamStages(
        context,
        DOWNSTREAM_ON_VALIDATION_FAIL,
        'DecisionResult validation başarısız; Report Model/Narrative/Section atlandı.'
      );

      const summaryTimer = startReportStageTimer();
      reportSummaryResult = applyReportSummaryToPipelineResult(
        detailed,
        this.reportSummaryRuntime
      );
      const summaryTiming = endReportStageTimer(summaryTimer);

      replaceStageExecution(context, {
        stageId: 'rapor-derleme',
        stageName: stageName('rapor-derleme'),
        outcome: 'basarili',
        errors: [],
        warnings: reportSummaryResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'rapor-derleme' as const,
          recoverable: true
        })),
        detail: `Report Summary produced from current state (${reportSummaryResult.sections.length} sections).`,
        ...summaryTiming
      });

      syncReportModelFromBag(detailed.reportModel, context);
      mutateReportModel(
        detailed.reportModel,
        'basarisiz',
        validationStage?.stageId ?? 'karar-dogrulama'
      );
      context.reportContext.status = 'basarisiz';
      context.reportContext.currentStage =
        validationStage?.stageId ?? 'karar-dogrulama';
    } else {
      const compositionTimer = startReportStageTimer();
      reportModelResult = applyReportModelBuilderToPipelineResult(
        detailed,
        this.reportModelBuilder
      );
      narrativeResult = applyNarrativeComposerToPipelineResult(
        detailed,
        this.narrativeComposer
      );
      const compositionTiming = endReportStageTimer(compositionTimer);

      replaceStageExecution(context, {
        stageId: 'rapor-birlestirme',
        stageName: stageName('rapor-birlestirme'),
        outcome: 'basarili',
        errors: [],
        warnings: [
          ...reportModelResult.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
            stage: 'rapor-birlestirme' as const,
            recoverable: true
          })),
          ...narrativeResult.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
            stage: 'rapor-birlestirme' as const,
            recoverable: true
          }))
        ],
        detail: `Report Model (${REPORT_PART_ORDER.length} parts) + Narrative (${narrativeResult.narratives.length} records) composed.`,
        ...compositionTiming
      });

      const sectionTimer = startReportStageTimer();
      reportSectionResult = applyReportSectionBuilderToPipelineResult(
        detailed,
        this.reportSectionBuilder
      );
      const sectionTiming = endReportStageTimer(sectionTimer);

      replaceStageExecution(context, {
        stageId: 'bolum-derleme',
        stageName: stageName('bolum-derleme'),
        outcome: 'basarili',
        errors: [],
        warnings: reportSectionResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'bolum-derleme' as const,
          recoverable: true
        })),
        detail: `${reportSectionResult.sections.length} Report Section üretildi.`,
        ...sectionTiming
      });

      replaceStageExecution(
        context,
        createSkippedStageExecution(
          'kanit-toplama',
          stageName('kanit-toplama'),
          'Evidence collection is not composed in end-to-end Report Runtime (PR-104F).'
        )
      );

      replaceStageExecution(
        context,
        createSkippedStageExecution(
          'rapor-inceleme',
          stageName('rapor-inceleme'),
          'Report review is not composed in end-to-end Report Runtime (PR-104F).'
        )
      );

      const summaryTimer = startReportStageTimer();
      reportSummaryResult = applyReportSummaryToPipelineResult(
        detailed,
        this.reportSummaryRuntime
      );
      const summaryTiming = endReportStageTimer(summaryTimer);

      const hasHardFailure = context.stageExecutions.some(
        (item) =>
          item.stageId !== 'rapor-derleme' && item.outcome === 'basarisiz'
      );
      const hasNotImplemented = context.stageExecutions.some(
        (item) =>
          item.stageId !== 'rapor-derleme' &&
          item.outcome === 'not-implemented'
      );
      const assemblyFailed = hasHardFailure || hasNotImplemented;

      replaceStageExecution(context, {
        stageId: 'rapor-derleme',
        stageName: stageName('rapor-derleme'),
        outcome: assemblyFailed ? 'basarisiz' : 'basarili',
        errors: [],
        warnings: reportSummaryResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'rapor-derleme' as const,
          recoverable: true
        })),
        detail: assemblyFailed
          ? 'ReportModel assembly completed with failures.'
          : `${reportSummaryResult.sections.length} Report Summary bölümü üretildi.`,
        ...summaryTiming
      });

      syncReportModelFromBag(detailed.reportModel, context);
      const status: ReportExecutionStatus = hasHardFailure
        ? 'basarisiz'
        : 'basarili';
      mutateReportModel(detailed.reportModel, status, 'rapor-derleme');
      context.reportContext.status = status;
      context.reportContext.currentStage = 'rapor-derleme';
    }

    const endedAt = new Date().toISOString();
    const totalDurationMs = Math.max(0, Math.round(nowMs() - startedMark));

    const telemetry = buildReportExecutionTelemetry(
      context,
      startedAt,
      endedAt,
      totalDurationMs,
      {
        reportModelPartCount: reportModelResult
          ? REPORT_PART_ORDER.length
          : 0,
        narrativeCount: narrativeResult?.narratives.length ?? 0,
        sectionCount: reportSectionResult?.sections.length ?? 0,
        summarySectionCount: reportSummaryResult?.sections.length ?? 0
      }
    );

    return {
      reportModel: detailed.reportModel,
      pipelineContext: context,
      stageExecutions: [...context.stageExecutions],
      telemetry,
      reportModelResult,
      narrativeResult,
      reportSectionResult,
      reportSummaryResult
    };
  }
}

/**
 * Fabrika.
 */
export function createReportPipelineRunner(
  deps?: ReportPipelineRunnerDependencies
): ReportPipelineRunner {
  return new ReportPipelineRunner(deps);
}

export default ReportPipelineRunner;
