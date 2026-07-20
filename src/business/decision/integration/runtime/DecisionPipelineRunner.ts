/**
 * İSTEBUL Business Decision Engine — DecisionPipelineRunner (PR-103F).
 *
 * Validation → Policy → Recommendation → Action Plan → Summary uçtan uca birleştirir.
 * PR-103A–E dosyalarını değiştirmez; apply* köprülerini kullanır.
 */

import { getDecisionPipelineStage } from '../../pipeline/DecisionPipeline';
import type { DecisionPipelineContext } from '../../pipeline/runtime/DecisionPipelineContext';
import type { DecisionPipelineResult } from '../../pipeline/runtime/DecisionPipelineResult';
import {
  createDecisionPipelineRuntime,
  type DecisionPipelineRuntime
} from '../../pipeline/runtime/DecisionPipelineRuntime';
import {
  endDecisionStageTimer,
  nowMs,
  startDecisionStageTimer
} from '../../pipeline/runtime/DecisionTiming';
import type { DecisionResult } from '../../models/DecisionResult';
import type { DecisionStage, DecisionStatus } from '../../models/DecisionStage';
import {
  applyPolicyEngineToPipelineResult,
  attachPolicyToPipelineContext,
  createPolicyContext,
  createPolicyEngineRuntime,
  readPolicyFromPipelineContext,
  type PolicyEngineRuntime,
  type PolicyResult
} from '../../policies/runtime/index';
import {
  applyRecommendationBuilderToPipelineResult,
  attachRecommendationToPipelineContext,
  createRecommendationBuilderRuntime,
  createRecommendationContext,
  readRecommendationFromPipelineContext,
  type RecommendationBuilderRuntime,
  type RecommendationResult
} from '../../recommendations/runtime/index';
import {
  applyActionPlanBuilderToPipelineResult,
  attachActionPlanToPipelineContext,
  createActionPlanBuilderRuntime,
  createActionPlanContext,
  type ActionPlanBuilderRuntime,
  type ActionPlanResult
} from '../../actionPlans/runtime/index';
import {
  applyDecisionSummaryToPipelineResult,
  createDecisionSummaryRuntime,
  type DecisionSummaryResult,
  type DecisionSummaryRuntime
} from '../../summaries/runtime/index';
import type { DecisionExecutionContext } from './DecisionExecutionContext';
import type { DecisionExecutionResult } from './DecisionExecutionResult';
import {
  buildDecisionExecutionTelemetry,
  createSkippedStageExecution,
  ensureRequestIds,
  replaceStageExecution,
  resolveDecisionContext
} from './helpers';

const DOWNSTREAM_ON_VALIDATION_FAIL: readonly DecisionStage[] = [
  'risk-degerlendirme',
  'firsat-degerlendirme',
  'oneri-olusturma',
  'oncelik-hesaplama'
];

export interface DecisionPipelineRunnerDependencies {
  pipelineRuntime?: DecisionPipelineRuntime;
  policyEngine?: PolicyEngineRuntime;
  recommendationBuilder?: RecommendationBuilderRuntime;
  actionPlanBuilder?: ActionPlanBuilderRuntime;
  decisionSummaryRuntime?: DecisionSummaryRuntime;
}

function stageName(stageId: DecisionStage): string {
  return getDecisionPipelineStage(stageId)?.name ?? stageId;
}

function mutateDecisionResult(
  decisionResult: DecisionResult,
  status: DecisionStatus,
  lastStage: DecisionStage
): void {
  const mutable = decisionResult as {
    status: DecisionStatus;
    lastStage: DecisionStage;
    completedAt?: string;
  };
  mutable.status = status;
  mutable.lastStage = lastStage;
  mutable.completedAt = new Date().toISOString();
}

function skipDownstreamStages(
  context: DecisionPipelineContext,
  stages: readonly DecisionStage[],
  detail: string
): void {
  for (const stageId of stages) {
    replaceStageExecution(
      context,
      createSkippedStageExecution(stageId, stageName(stageId), detail)
    );
  }
}

function applyPolicyForExecution(
  pipelineResult: DecisionPipelineResult,
  engine: PolicyEngineRuntime,
  policyIds: readonly string[] | undefined
): PolicyResult {
  if (!policyIds || policyIds.length === 0) {
    return applyPolicyEngineToPipelineResult(pipelineResult, engine);
  }

  const context = pipelineResult.context as DecisionPipelineContext;
  const validation = context.bag.analysisValidation;
  if (validation && validation.isValid === false) {
    return applyPolicyEngineToPipelineResult(pipelineResult, engine);
  }

  const result = engine.compute(
    createPolicyContext({
      analysisResult: context.decisionContext.analysisResult,
      decisionContext: context.decisionContext,
      locale: context.decisionContext.locale,
      policyIds,
      bag: context.bag
    })
  );
  attachPolicyToPipelineContext(context, result);
  return result;
}

function applyRecommendationForExecution(
  pipelineResult: DecisionPipelineResult,
  builder: RecommendationBuilderRuntime,
  includeSkippedInfo: boolean
): RecommendationResult {
  if (includeSkippedInfo) {
    return applyRecommendationBuilderToPipelineResult(pipelineResult, builder);
  }

  const context = pipelineResult.context as DecisionPipelineContext;
  const validation = context.bag.analysisValidation;
  const policyResult = readPolicyFromPipelineContext(context);

  if ((validation && validation.isValid === false) || !policyResult) {
    return applyRecommendationBuilderToPipelineResult(pipelineResult, builder);
  }

  const result = builder.compute(
    createRecommendationContext({
      decisionContext: context.decisionContext,
      analysisResult: context.decisionContext.analysisResult,
      policyResult,
      locale: context.decisionContext.locale,
      includeSkippedInfo: false,
      bag: context.bag
    })
  );

  attachRecommendationToPipelineContext(context, result);

  const mutableResult = pipelineResult.decisionResult as {
    recommendations: typeof pipelineResult.decisionResult.recommendations;
  };
  mutableResult.recommendations = result.recommendations;

  return result;
}

function applyActionPlanForExecution(
  pipelineResult: DecisionPipelineResult,
  builder: ActionPlanBuilderRuntime,
  includeSkippedInfo: boolean
): ActionPlanResult {
  if (includeSkippedInfo) {
    return applyActionPlanBuilderToPipelineResult(pipelineResult, builder);
  }

  const context = pipelineResult.context as DecisionPipelineContext;
  const validation = context.bag.analysisValidation;
  const recommendationResult = readRecommendationFromPipelineContext(context);

  if ((validation && validation.isValid === false) || !recommendationResult) {
    return applyActionPlanBuilderToPipelineResult(pipelineResult, builder);
  }

  const result = builder.compute(
    createActionPlanContext({
      decisionContext: context.decisionContext,
      recommendationResult,
      locale: context.decisionContext.locale,
      includeSkippedInfo: false,
      bag: context.bag
    })
  );

  attachActionPlanToPipelineContext(context, result);

  const mutableResult = pipelineResult.decisionResult as {
    actions: typeof pipelineResult.decisionResult.actions;
  };
  mutableResult.actions = result.actions;

  return result;
}

/**
 * Uçtan uca Decision Pipeline yürütücüsü.
 */
export class DecisionPipelineRunner {
  private readonly policyEngine: PolicyEngineRuntime;
  private readonly recommendationBuilder: RecommendationBuilderRuntime;
  private readonly actionPlanBuilder: ActionPlanBuilderRuntime;
  private readonly decisionSummaryRuntime: DecisionSummaryRuntime;
  private readonly pipelineRuntime?: DecisionPipelineRuntime;

  constructor(deps: DecisionPipelineRunnerDependencies = {}) {
    this.policyEngine = deps.policyEngine ?? createPolicyEngineRuntime();
    this.recommendationBuilder =
      deps.recommendationBuilder ?? createRecommendationBuilderRuntime();
    this.actionPlanBuilder =
      deps.actionPlanBuilder ?? createActionPlanBuilderRuntime();
    this.decisionSummaryRuntime =
      deps.decisionSummaryRuntime ?? createDecisionSummaryRuntime();
    this.pipelineRuntime = deps.pipelineRuntime;
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  async execute(
    execution: DecisionExecutionContext
  ): Promise<DecisionExecutionResult> {
    const startedMark = nowMs();
    const startedAt = new Date().toISOString();

    const decisionContext = resolveDecisionContext(execution);
    const request = ensureRequestIds(
      {
        ...execution.request,
        locale: execution.locale ?? execution.request.locale
      },
      decisionContext.analysisResult
    );

    const pipeline =
      this.pipelineRuntime ??
      createDecisionPipelineRuntime({ initialContext: decisionContext });

    const detailed = await pipeline.runWithDetails(request, decisionContext);
    const context = detailed.context as DecisionPipelineContext;

    if (execution.initialBag) {
      Object.assign(context.bag, execution.initialBag);
    }

    const validationStage = context.stageExecutions.find(
      (item) => item.stageId === 'analiz-sonuc-dogrulama'
    );
    const validationFailed = validationStage?.outcome === 'basarisiz';

    let policyResult: PolicyResult | undefined;
    let recommendationResult: RecommendationResult | undefined;
    let actionPlanResult: ActionPlanResult | undefined;
    let decisionSummaryResult: DecisionSummaryResult | undefined;

    if (validationFailed) {
      skipDownstreamStages(
        context,
        DOWNSTREAM_ON_VALIDATION_FAIL,
        'AnalysisResult validation başarısız; Policy/Recommendation/Action Plan atlandı.'
      );

      const summaryTimer = startDecisionStageTimer();
      decisionSummaryResult = applyDecisionSummaryToPipelineResult(
        detailed,
        this.decisionSummaryRuntime
      );
      const summaryTiming = endDecisionStageTimer(summaryTimer);

      replaceStageExecution(context, {
        stageId: 'karar-derleme',
        stageName: stageName('karar-derleme'),
        outcome: 'basarili',
        errors: [],
        warnings: decisionSummaryResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'karar-derleme' as const,
          recoverable: true
        })),
        detail: `Decision Summary produced from current state (${decisionSummaryResult.sections.length} sections).`,
        ...summaryTiming
      });

      mutateDecisionResult(
        detailed.decisionResult,
        'basarisiz',
        validationStage?.stageId ?? 'analiz-sonuc-dogrulama'
      );
      context.decisionContext.status = 'basarisiz';
      context.decisionContext.currentStage =
        validationStage?.stageId ?? 'analiz-sonuc-dogrulama';
    } else {
      const policyTimer = startDecisionStageTimer();
      policyResult = applyPolicyForExecution(
        detailed,
        this.policyEngine,
        execution.policyIds
      );
      const policyTiming = endDecisionStageTimer(policyTimer);

      replaceStageExecution(context, {
        stageId: 'risk-degerlendirme',
        stageName: stageName('risk-degerlendirme'),
        outcome: policyResult.summary.success ? 'basarili' : 'basarisiz',
        errors: policyResult.summary.success
          ? []
          : policyResult.warnings.map((warning) => ({
              code: warning.code,
              message: warning.message,
              stage: 'risk-degerlendirme' as const,
              recoverable: false
            })),
        warnings: policyResult.summary.success
          ? policyResult.warnings.map((warning) => ({
              code: warning.code,
              message: warning.message,
              stage: 'risk-degerlendirme' as const,
              recoverable: true
            }))
          : [],
        detail: `${policyResult.summary.evaluatedCount} politika değerlendirildi; ${policyResult.summary.triggeredCount} tetiklendi.`,
        ...policyTiming
      });

      // Opportunity evaluation is not composed in PR-103F end-to-end flow.
      replaceStageExecution(
        context,
        createSkippedStageExecution(
          'firsat-degerlendirme',
          stageName('firsat-degerlendirme'),
          'Opportunity evaluation is not composed in end-to-end Decision Runtime (PR-103F).'
        )
      );

      const includeSkipped = execution.includeSkippedInfo !== false;

      const recommendationTimer = startDecisionStageTimer();
      recommendationResult = applyRecommendationForExecution(
        detailed,
        this.recommendationBuilder,
        includeSkipped
      );
      const recommendationTiming = endDecisionStageTimer(recommendationTimer);

      replaceStageExecution(context, {
        stageId: 'oneri-olusturma',
        stageName: stageName('oneri-olusturma'),
        outcome: recommendationResult.summary.success ? 'basarili' : 'basarisiz',
        errors: recommendationResult.summary.success
          ? []
          : recommendationResult.warnings.map((warning) => ({
              code: warning.code,
              message: warning.message,
              stage: 'oneri-olusturma' as const,
              recoverable: false
            })),
        warnings: recommendationResult.summary.success
          ? recommendationResult.warnings.map((warning) => ({
              code: warning.code,
              message: warning.message,
              stage: 'oneri-olusturma' as const,
              recoverable: true
            }))
          : [],
        detail: `${recommendationResult.summary.recommendationCount} öneri üretildi.`,
        ...recommendationTiming
      });

      const actionPlanTimer = startDecisionStageTimer();
      actionPlanResult = applyActionPlanForExecution(
        detailed,
        this.actionPlanBuilder,
        includeSkipped
      );
      const actionPlanTiming = endDecisionStageTimer(actionPlanTimer);

      replaceStageExecution(context, {
        stageId: 'oncelik-hesaplama',
        stageName: stageName('oncelik-hesaplama'),
        outcome: actionPlanResult.summary.success ? 'basarili' : 'basarisiz',
        errors: actionPlanResult.summary.success
          ? []
          : actionPlanResult.warnings.map((warning) => ({
              code: warning.code,
              message: warning.message,
              stage: 'oncelik-hesaplama' as const,
              recoverable: false
            })),
        warnings: actionPlanResult.summary.success
          ? actionPlanResult.warnings.map((warning) => ({
              code: warning.code,
              message: warning.message,
              stage: 'oncelik-hesaplama' as const,
              recoverable: true
            }))
          : [],
        detail: `${actionPlanResult.summary.actionPlanCount} aksiyon planı, ${actionPlanResult.summary.stepCount} adım.`,
        ...actionPlanTiming
      });

      const summaryTimer = startDecisionStageTimer();
      decisionSummaryResult = applyDecisionSummaryToPipelineResult(
        detailed,
        this.decisionSummaryRuntime
      );
      const summaryTiming = endDecisionStageTimer(summaryTimer);

      const hasHardFailure = context.stageExecutions.some(
        (item) =>
          item.stageId !== 'karar-derleme' && item.outcome === 'basarisiz'
      );
      const hasNotImplemented = context.stageExecutions.some(
        (item) =>
          item.stageId !== 'karar-derleme' &&
          item.outcome === 'not-implemented'
      );
      const assemblyFailed = hasHardFailure || hasNotImplemented;

      replaceStageExecution(context, {
        stageId: 'karar-derleme',
        stageName: stageName('karar-derleme'),
        outcome: assemblyFailed ? 'basarisiz' : 'basarili',
        errors: [],
        warnings: decisionSummaryResult.warnings.map((warning) => ({
          code: warning.code,
          message: warning.message,
          stage: 'karar-derleme' as const,
          recoverable: true
        })),
        detail: assemblyFailed
          ? 'DecisionResult assembly completed with failures.'
          : `${decisionSummaryResult.sections.length} Decision Summary bölümü üretildi.`,
        ...summaryTiming
      });

      const status: DecisionStatus = hasHardFailure ? 'basarisiz' : 'basarili';
      mutateDecisionResult(detailed.decisionResult, status, 'karar-derleme');
      context.decisionContext.status = status;
      context.decisionContext.currentStage = 'karar-derleme';
    }

    const endedAt = new Date().toISOString();
    const totalDurationMs = Math.max(0, Math.round(nowMs() - startedMark));

    const telemetry = buildDecisionExecutionTelemetry(
      context,
      startedAt,
      endedAt,
      totalDurationMs,
      {
        policyCount: policyResult?.summary.evaluatedCount ?? 0,
        recommendationCount:
          recommendationResult?.summary.recommendationCount ?? 0,
        actionPlanCount: actionPlanResult?.summary.actionPlanCount ?? 0,
        actionCount: actionPlanResult?.summary.stepCount ?? 0,
        summarySectionCount: decisionSummaryResult?.sections.length ?? 0
      }
    );

    return {
      decisionResult: detailed.decisionResult,
      pipelineContext: context,
      stageExecutions: [...context.stageExecutions],
      telemetry,
      policyResult,
      recommendationResult,
      actionPlanResult,
      decisionSummaryResult
    };
  }
}

/**
 * Fabrika.
 */
export function createDecisionPipelineRunner(
  deps?: DecisionPipelineRunnerDependencies
): DecisionPipelineRunner {
  return new DecisionPipelineRunner(deps);
}

export default DecisionPipelineRunner;
