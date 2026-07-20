/**
 * İSTEBUL Business Analysis Engine — AnalysisPipelineRunner (PR-102F).
 *
 * Validation → KPI → Rule → Finding → Summary uçtan uca birleştirir.
 * PR-102A–E dosyalarını değiştirmez; apply* köprülerini kullanır.
 */

import { getAnalysisPipelineStage } from '../../pipeline/AnalysisPipeline';
import type { AnalysisPipelineContext } from '../../pipeline/runtime/AnalysisPipelineContext';
import type { AnalysisPipelineResult } from '../../pipeline/runtime/AnalysisPipelineResult';
import {
  createAnalysisPipelineRuntime,
  type AnalysisPipelineRuntime
} from '../../pipeline/runtime/AnalysisPipelineRuntime';
import type { AnalysisStageExecution } from '../../pipeline/runtime/AnalysisStageExecution';
import {
  endAnalysisStageTimer,
  nowMs,
  startAnalysisStageTimer
} from '../../pipeline/runtime/AnalysisTiming';
import type { AnalysisResult } from '../../models/AnalysisResult';
import type { AnalysisStage } from '../../models/AnalysisStage';
import {
  applyKpiEngineToPipelineResult,
  createKpiEngineRuntime,
  type KpiEngineRuntime,
  type KpiResult
} from '../../kpis/runtime/index';
import {
  applyRuleEngineToPipelineResult,
  createRuleEngineRuntime,
  readRuleFromPipelineContext,
  type RuleEngineRuntime,
  type RuleResult
} from '../../rules/runtime/index';
import {
  applyFindingBuilderToPipelineResult,
  attachFindingToPipelineContext,
  createFindingBuilderRuntime,
  createFindingContext,
  type FindingBuilderRuntime,
  type FindingResult
} from '../../findings/runtime/index';
import {
  applySummaryBuilderToPipelineResult,
  createSummaryBuilderRuntime,
  type SummaryBuilderRuntime,
  type SummaryResult
} from '../../summaries/runtime/index';
import type { AnalysisExecutionContext } from './AnalysisExecutionContext';
import type { AnalysisExecutionResult } from './AnalysisExecutionResult';
import {
  buildAnalysisExecutionTelemetry,
  createSkippedStageExecution,
  createStageExecution,
  ensureRequestDatasetId,
  replaceStageExecution,
  resolveAnalysisContext
} from './helpers';

const DOWNSTREAM_AFTER_KPI: readonly AnalysisStage[] = [
  'kural-degerlendirme',
  'bulgu-uretimi',
  'ozet-uretimi'
];

export interface AnalysisPipelineRunnerDependencies {
  pipelineRuntime?: AnalysisPipelineRuntime;
  kpiEngine?: KpiEngineRuntime;
  ruleEngine?: RuleEngineRuntime;
  findingBuilder?: FindingBuilderRuntime;
  summaryBuilder?: SummaryBuilderRuntime;
}

function stageName(stageId: AnalysisStage): string {
  return getAnalysisPipelineStage(stageId)?.name ?? stageId;
}

function mutateAnalysisResultStatus(
  analysisResult: AnalysisResult,
  status: AnalysisResult['status'],
  lastStage: AnalysisStage
): void {
  const mutable = analysisResult as {
    status: AnalysisResult['status'];
    lastStage: AnalysisStage;
    completedAt?: string;
  };
  mutable.status = status;
  mutable.lastStage = lastStage;
  mutable.completedAt = new Date().toISOString();
}

function finalizeAssemblyStage(context: AnalysisPipelineContext): void {
  const hasFailure = context.stageExecutions.some(
    (item) => item.outcome === 'basarisiz'
  );
  const hasNotImplemented = context.stageExecutions.some(
    (item) =>
      item.stageId !== 'sonuc-derleme' && item.outcome === 'not-implemented'
  );

  replaceStageExecution(
    context,
    createStageExecution(
      'sonuc-derleme',
      stageName('sonuc-derleme'),
      hasFailure || hasNotImplemented ? 'basarisiz' : 'basarili',
      hasFailure
        ? 'AnalysisResult assembly completed with failures.'
        : hasNotImplemented
          ? 'AnalysisResult assembly incomplete — placeholder stages remain.'
          : 'AnalysisResult assembly completed.',
      [],
      []
    )
  );
}

function applyFindingBuilderForExecution(
  pipelineResult: AnalysisPipelineResult,
  builder: FindingBuilderRuntime,
  includeSkippedInfo: boolean
): FindingResult {
  if (includeSkippedInfo) {
    return applyFindingBuilderToPipelineResult(pipelineResult, builder);
  }

  const context = pipelineResult.context as AnalysisPipelineContext;
  const ruleResult = readRuleFromPipelineContext(context);

  if (!ruleResult) {
    return applyFindingBuilderToPipelineResult(pipelineResult, builder);
  }

  const result = builder.compute(
    createFindingContext({
      analysisContext: context.analysisContext,
      kpiResults: context.bag.kpiResults,
      ruleResult,
      ruleFindings: ruleResult.findings,
      locale: context.analysisContext.locale,
      includeSkippedInfo: false
    })
  );

  attachFindingToPipelineContext(context, result);

  const mutableResult = pipelineResult.analysisResult as {
    findings: typeof pipelineResult.analysisResult.findings;
    statistics: typeof pipelineResult.analysisResult.statistics;
    warnings: typeof pipelineResult.analysisResult.warnings;
  };

  mutableResult.findings = result.findings;
  mutableResult.statistics = {
    ...pipelineResult.analysisResult.statistics,
    findingCount: result.summary.findingCount
  };
  mutableResult.warnings = Object.freeze([
    ...pipelineResult.analysisResult.warnings,
    ...result.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      stage: 'bulgu-uretimi' as const
    }))
  ]);

  return result;
}

function skipDownstreamStages(
  context: AnalysisPipelineContext,
  stages: readonly AnalysisStage[],
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
 * Uçtan uca Analysis Pipeline yürütücüsü.
 */
export class AnalysisPipelineRunner {
  private readonly kpiEngine: KpiEngineRuntime;
  private readonly ruleEngine: RuleEngineRuntime;
  private readonly findingBuilder: FindingBuilderRuntime;
  private readonly summaryBuilder: SummaryBuilderRuntime;
  private readonly pipelineRuntime?: AnalysisPipelineRuntime;

  constructor(deps: AnalysisPipelineRunnerDependencies = {}) {
    this.kpiEngine = deps.kpiEngine ?? createKpiEngineRuntime();
    this.ruleEngine = deps.ruleEngine ?? createRuleEngineRuntime();
    this.findingBuilder =
      deps.findingBuilder ?? createFindingBuilderRuntime();
    this.summaryBuilder =
      deps.summaryBuilder ?? createSummaryBuilderRuntime();
    this.pipelineRuntime = deps.pipelineRuntime;
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  async execute(
    execution: AnalysisExecutionContext
  ): Promise<AnalysisExecutionResult> {
    const startedMark = nowMs();
    const startedAt = new Date().toISOString();

    const analysisContext = resolveAnalysisContext(execution);
    const request = ensureRequestDatasetId(
      {
        ...execution.request,
        locale: execution.locale ?? execution.request.locale,
        kpiIds: execution.kpiIds ?? execution.request.kpiIds,
        ruleIds: execution.ruleIds ?? execution.request.ruleIds
      },
      analysisContext.dataset
    );

    const pipeline =
      this.pipelineRuntime ??
      createAnalysisPipelineRuntime({ initialContext: analysisContext });

    const detailed = await pipeline.runWithDetails(request, analysisContext);
    const context = detailed.context as AnalysisPipelineContext;

    if (execution.initialBag) {
      Object.assign(context.bag, execution.initialBag);
    }

    const validationStage = context.stageExecutions.find(
      (item) => item.stageId === 'dataset-dogrulama'
    );
    const validationFailed = validationStage?.outcome === 'basarisiz';

    let kpiResult: KpiResult | undefined;
    let ruleResult: RuleResult | undefined;
    let findingResult: FindingResult | undefined;
    let summaryResult: SummaryResult | undefined;

    if (validationFailed) {
      mutateAnalysisResultStatus(
        detailed.analysisResult,
        'basarisiz',
        validationStage?.stageId ?? 'dataset-dogrulama'
      );
      context.analysisContext.status = 'basarisiz';
    } else {
      const kpiTimer = startAnalysisStageTimer();
      kpiResult = applyKpiEngineToPipelineResult(detailed, this.kpiEngine);
      const kpiTiming = endAnalysisStageTimer(kpiTimer);

      if (!kpiResult.summary.success) {
        const kpiErrors: AnalysisStageExecution['errors'] =
          kpiResult.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
            stage: 'kpi-hesaplama' as const,
            recoverable: false
          }));
        replaceStageExecution(context, {
          stageId: 'kpi-hesaplama',
          stageName: stageName('kpi-hesaplama'),
          outcome: 'basarisiz',
          errors: kpiErrors,
          warnings: [],
          detail: 'KPI Engine failed; downstream stages skipped.',
          ...kpiTiming
        });
        skipDownstreamStages(
          context,
          DOWNSTREAM_AFTER_KPI,
          'KPI motoru başarısız; Rule/Finding/Summary atlandı.'
        );
        finalizeAssemblyStage(context);
        mutateAnalysisResultStatus(
          detailed.analysisResult,
          'basarisiz',
          'kpi-hesaplama'
        );
        context.analysisContext.status = 'basarisiz';
      } else {
        replaceStageExecution(context, {
          stageId: 'kpi-hesaplama',
          stageName: stageName('kpi-hesaplama'),
          outcome: 'basarili',
          errors: [],
          warnings: kpiResult.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
            stage: 'kpi-hesaplama' as const,
            recoverable: true
          })),
          detail: `${kpiResult.summary.calculatedCount} KPI hesaplandı.`,
          ...kpiTiming
        });

        const ruleTimer = startAnalysisStageTimer();
        ruleResult = applyRuleEngineToPipelineResult(detailed, this.ruleEngine);
        const ruleTiming = endAnalysisStageTimer(ruleTimer);
        replaceStageExecution(context, {
          stageId: 'kural-degerlendirme',
          stageName: stageName('kural-degerlendirme'),
          outcome: 'basarili',
          errors: [],
          warnings: ruleResult.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
            stage: 'kural-degerlendirme' as const,
            recoverable: true
          })),
          detail: `${ruleResult.summary.evaluatedCount} kural değerlendirildi.`,
          ...ruleTiming
        });

        const findingTimer = startAnalysisStageTimer();
        const includeSkipped = execution.includeSkippedFindings !== false;
        findingResult = applyFindingBuilderForExecution(
          detailed,
          this.findingBuilder,
          includeSkipped
        );
        const findingTiming = endAnalysisStageTimer(findingTimer);
        replaceStageExecution(context, {
          stageId: 'bulgu-uretimi',
          stageName: stageName('bulgu-uretimi'),
          outcome: findingResult.summary.success ? 'basarili' : 'basarisiz',
          errors: findingResult.summary.success
            ? []
            : findingResult.warnings.map((warning) => ({
                code: warning.code,
                message: warning.message,
                stage: 'bulgu-uretimi' as const,
                recoverable: false
              })),
          warnings: findingResult.summary.success
            ? findingResult.warnings.map((warning) => ({
                code: warning.code,
                message: warning.message,
                stage: 'bulgu-uretimi' as const,
                recoverable: true
              }))
            : [],
          detail: `${findingResult.summary.findingCount} bulgu üretildi.`,
          ...findingTiming
        });

        const summaryTimer = startAnalysisStageTimer();
        summaryResult = applySummaryBuilderToPipelineResult(
          detailed,
          this.summaryBuilder
        );
        const summaryTiming = endAnalysisStageTimer(summaryTimer);
        replaceStageExecution(context, {
          stageId: 'ozet-uretimi',
          stageName: stageName('ozet-uretimi'),
          outcome: 'basarili',
          errors: [],
          warnings: summaryResult.warnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
            stage: 'ozet-uretimi' as const,
            recoverable: true
          })),
          detail: `${summaryResult.sections.length} özet bölümü üretildi.`,
          ...summaryTiming
        });

        finalizeAssemblyStage(context);

        const hasHardFailure = context.stageExecutions.some(
          (item) => item.outcome === 'basarisiz'
        );
        const status = hasHardFailure ? 'basarisiz' : 'basarili';
        mutateAnalysisResultStatus(
          detailed.analysisResult,
          status,
          'sonuc-derleme'
        );
        context.analysisContext.status = status;
        context.analysisContext.currentStage = 'sonuc-derleme';
      }
    }

    const endedAt = new Date().toISOString();
    const totalDurationMs = Math.max(0, Math.round(nowMs() - startedMark));

    const telemetry = buildAnalysisExecutionTelemetry(
      context,
      startedAt,
      endedAt,
      totalDurationMs,
      {
        kpiCount: kpiResult?.summary.calculatedCount ?? 0,
        ruleCount: ruleResult?.summary.evaluatedCount ?? 0,
        findingCount: findingResult?.summary.findingCount ?? 0,
        summarySectionCount: summaryResult?.sections.length ?? 0
      }
    );

    return {
      analysisResult: detailed.analysisResult,
      pipelineContext: context,
      stageExecutions: [...context.stageExecutions],
      telemetry,
      kpiResult,
      ruleResult,
      findingResult,
      summaryResult
    };
  }
}

/**
 * Fabrika.
 */
export function createAnalysisPipelineRunner(
  deps?: AnalysisPipelineRunnerDependencies
): AnalysisPipelineRunner {
  return new AnalysisPipelineRunner(deps);
}

export default AnalysisPipelineRunner;
