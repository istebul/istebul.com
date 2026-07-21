/**
 * İSTEBUL Business Export Engine — ExportPipelineRunner (PR-106F).
 *
 * Validation → Export Model → Renderer → Format → Summary uçtan uca birleştirir.
 * PR-106A–E dosyalarını değiştirmez; apply* köprülerini kullanır.
 */

import {
  applyExportFormatToPipelineResult,
  createFormatRuntime,
  FORMAT_REPRESENTATION_ORDER,
  type FormatRuntime,
  type FormatResult
} from '../../format/runtime/index';
import {
  applyExportModelBuilderToPipelineResult,
  createExportModelBuilderRuntime,
  EXPORT_PART_ORDER,
  type ExportModelBuilderRuntime,
  type ExportModelResult
} from '../../modelBuilder/runtime/index';
import { getExportPipelineStage } from '../../pipeline/ExportPipeline';
import type { ExportPipelineContext } from '../../pipeline/runtime/ExportPipelineContext';
import {
  createExportPipelineRuntime,
  type ExportPipelineRuntime
} from '../../pipeline/runtime/ExportPipelineRuntime';
import {
  endExportStageTimer,
  nowMs,
  startExportStageTimer
} from '../../pipeline/runtime/ExportTiming';
import type { ExportStage } from '../../models/ExportStatus';
import {
  applyExportRendererToPipelineResult,
  createRendererRuntime,
  RENDER_PART_ORDER,
  type RendererRuntime,
  type RendererResult
} from '../../renderer/runtime/index';
import {
  applyExportSummaryToPipelineResult,
  createExportSummaryRuntime,
  EXPORT_SUMMARY_SECTION_ORDER,
  type ExportSummaryResult,
  type ExportSummaryRuntime
} from '../../summary/runtime/index';
import type { ExportExecutionContext } from './ExportExecutionContext';
import type { ExportExecutionResult } from './ExportExecutionResult';
import {
  buildExportExecutionTelemetry,
  buildFinalExportResult,
  createSkippedStageExecution,
  ensureRequestIds,
  replaceStageExecution,
  resolveExportContext,
  syncExportResultFromBag
} from './helpers';

const DOWNSTREAM_ON_VALIDATION_FAIL: readonly ExportStage[] = [
  'export-birlestirme',
  'format-cozumu',
  'sablon-cozumu'
];

export interface ExportPipelineRunnerDependencies {
  pipelineRuntime?: ExportPipelineRuntime;
  exportModelBuilder?: ExportModelBuilderRuntime;
  rendererRuntime?: RendererRuntime;
  formatRuntime?: FormatRuntime;
  exportSummaryRuntime?: ExportSummaryRuntime;
}

function stageName(stageId: ExportStage): string {
  return getExportPipelineStage(stageId)?.name ?? stageId;
}

function skipDownstreamStages(
  context: ExportPipelineContext,
  stages: readonly ExportStage[],
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
 * Uçtan uca Export Pipeline yürütücüsü.
 */
export class ExportPipelineRunner {
  private readonly exportModelBuilder: ExportModelBuilderRuntime;
  private readonly rendererRuntime: RendererRuntime;
  private readonly formatRuntime: FormatRuntime;
  private readonly exportSummaryRuntime: ExportSummaryRuntime;
  private readonly pipelineRuntime?: ExportPipelineRuntime;

  constructor(deps: ExportPipelineRunnerDependencies = {}) {
    this.exportModelBuilder =
      deps.exportModelBuilder ?? createExportModelBuilderRuntime();
    this.rendererRuntime = deps.rendererRuntime ?? createRendererRuntime();
    this.formatRuntime = deps.formatRuntime ?? createFormatRuntime();
    this.exportSummaryRuntime =
      deps.exportSummaryRuntime ?? createExportSummaryRuntime();
    this.pipelineRuntime = deps.pipelineRuntime;
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  async execute(
    execution: ExportExecutionContext
  ): Promise<ExportExecutionResult> {
    const startedMark = nowMs();
    const startedAt = new Date().toISOString();

    const exportContext = resolveExportContext(execution);
    const request = ensureRequestIds(
      {
        ...execution.request,
        locale: execution.locale ?? execution.request.locale
      },
      {
        documentModel: exportContext.documentModel,
        dashboardModel: exportContext.dashboardModel
      }
    );

    const pipeline =
      this.pipelineRuntime ??
      createExportPipelineRuntime({ initialContext: exportContext });

    const detailed = await pipeline.runWithDetails(request, exportContext);
    const context = detailed.context as ExportPipelineContext;

    if (execution.initialBag) {
      Object.assign(context.bag, execution.initialBag);
    }

    const validationStage = context.stageExecutions.find(
      (item) => item.stageId === 'export-dogrulama'
    );
    const validationFailed = validationStage?.outcome === 'basarisiz';

    let exportModelResult: ExportModelResult | undefined;
    let rendererResult: RendererResult | undefined;
    let formatResult: FormatResult | undefined;
    let exportSummaryResult: ExportSummaryResult | undefined;

    if (validationFailed) {
      skipDownstreamStages(
        context,
        DOWNSTREAM_ON_VALIDATION_FAIL,
        'Export source validation başarısız; Export Model / Renderer / Format atlandı.'
      );

      const summaryTimer = startExportStageTimer();
      exportSummaryResult = applyExportSummaryToPipelineResult(
        detailed,
        this.exportSummaryRuntime
      );
      const summaryTiming = endExportStageTimer(summaryTimer);

      replaceStageExecution(context, {
        stageId: 'artifact-derleme',
        stageName: stageName('artifact-derleme'),
        outcome: 'basarili',
        errors: [],
        warnings: exportSummaryResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'artifact-derleme' as const,
          recoverable: true
        })),
        detail: `Export Summary produced from current state (${exportSummaryResult.sections.length} sections).`,
        ...summaryTiming
      });

      const exportResult = buildFinalExportResult(context, 'export-sonuc');
      context.bag.exportResult = exportResult;
      context.exportContext.status = 'basarisiz';
      context.exportContext.currentStage =
        validationStage?.stageId ?? 'export-dogrulama';

      replaceStageExecution(context, {
        stageId: 'export-sonuc',
        stageName: stageName('export-sonuc'),
        outcome: 'basarili',
        errors: [],
        warnings: [],
        detail: 'ExportResult assembled after validation failure.',
        ...endExportStageTimer(startExportStageTimer())
      });
    } else {
      const compositionTimer = startExportStageTimer();
      exportModelResult = applyExportModelBuilderToPipelineResult(
        detailed,
        this.exportModelBuilder
      );
      rendererResult = applyExportRendererToPipelineResult(
        detailed,
        this.rendererRuntime
      );
      const compositionTiming = endExportStageTimer(compositionTimer);

      replaceStageExecution(context, {
        stageId: 'export-birlestirme',
        stageName: stageName('export-birlestirme'),
        outcome: 'basarili',
        errors: [],
        warnings: [
          ...exportModelResult.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
            stage: 'export-birlestirme' as const,
            recoverable: true
          })),
          ...rendererResult.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
            stage: 'export-birlestirme' as const,
            recoverable: true
          }))
        ],
        detail: `Export Model (${EXPORT_PART_ORDER.length} parts) + Renderer (${rendererResult.document.sections.length} sections) composed.`,
        ...compositionTiming
      });

      const formatTimer = startExportStageTimer();
      formatResult = applyExportFormatToPipelineResult(
        detailed,
        this.formatRuntime
      );
      const formatTiming = endExportStageTimer(formatTimer);

      replaceStageExecution(context, {
        stageId: 'format-cozumu',
        stageName: stageName('format-cozumu'),
        outcome: 'basarili',
        errors: [],
        warnings: formatResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'format-cozumu' as const,
          recoverable: true
        })),
        detail: `Format Runtime (${formatResult.documents.length} / ${FORMAT_REPRESENTATION_ORDER.length}) composed.`,
        ...formatTiming
      });

      replaceStageExecution(
        context,
        createSkippedStageExecution(
          'sablon-cozumu',
          stageName('sablon-cozumu'),
          'Template resolution is not composed in end-to-end Export Runtime (PR-106F).'
        )
      );

      const summaryTimer = startExportStageTimer();
      exportSummaryResult = applyExportSummaryToPipelineResult(
        detailed,
        this.exportSummaryRuntime
      );
      const summaryTiming = endExportStageTimer(summaryTimer);

      replaceStageExecution(context, {
        stageId: 'artifact-derleme',
        stageName: stageName('artifact-derleme'),
        outcome: 'basarili',
        errors: [],
        warnings: exportSummaryResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'artifact-derleme' as const,
          recoverable: true
        })),
        detail: `${exportSummaryResult.sections.length} Export Summary bölümü üretildi (${EXPORT_SUMMARY_SECTION_ORDER.length} beklenen).`,
        ...summaryTiming
      });

      replaceStageExecution(context, {
        stageId: 'export-sonuc',
        stageName: stageName('export-sonuc'),
        outcome: 'basarili',
        errors: [],
        warnings: [],
        detail: 'ExportResult assembly completed.',
        ...endExportStageTimer(startExportStageTimer())
      });

      const exportResult = buildFinalExportResult(context, 'export-sonuc');
      context.bag.exportResult = exportResult;
      syncExportResultFromBag(exportResult, context);
      context.exportContext.status = exportResult.status;
      context.exportContext.currentStage = 'export-sonuc';
    }

    const endedAt = new Date().toISOString();
    const totalDurationMs = Math.max(0, Math.round(nowMs() - startedMark));

    const finalExportResult =
      context.bag.exportResult ??
      buildFinalExportResult(context, 'export-sonuc');

    const telemetry = buildExportExecutionTelemetry(
      context,
      startedAt,
      endedAt,
      totalDurationMs,
      {
        exportModelPartCount: exportModelResult
          ? EXPORT_PART_ORDER.length
          : 0,
        renderPartCount: rendererResult
          ? RENDER_PART_ORDER.length
          : 0,
        formatRepresentationCount: formatResult?.documents.length ?? 0,
        summarySectionCount: exportSummaryResult?.sections.length ?? 0
      }
    );

    return {
      exportResult: finalExportResult,
      pipelineContext: context,
      stageExecutions: [...context.stageExecutions],
      telemetry,
      exportModelResult,
      rendererResult,
      formatResult,
      exportSummaryResult
    };
  }
}

/**
 * Fabrika.
 */
export function createExportPipelineRunner(
  deps?: ExportPipelineRunnerDependencies
): ExportPipelineRunner {
  return new ExportPipelineRunner(deps);
}

export default ExportPipelineRunner;
