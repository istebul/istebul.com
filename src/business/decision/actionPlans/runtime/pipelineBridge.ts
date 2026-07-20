/**
 * Decision Pipeline köprüsü — PR-103A–C dosyalarını değiştirmeden bag’e yazar (PR-103D).
 */

import type { DecisionPipelineContext } from '../../pipeline/runtime/DecisionPipelineContext';
import type { DecisionPipelineResult } from '../../pipeline/runtime/DecisionPipelineResult';
import { readRecommendationFromPipelineContext } from '../../recommendations/runtime/pipelineBridge';
import type { ActionPlanResult } from './ActionPlanResult';
import { PIPELINE_BAG_ACTION_PLAN_RUNTIME_RESULT_KEY } from './ActionPlanResult';
import type { ActionPlanBuilderRuntime } from './ActionPlanBuilderRuntime';
import { createActionPlanBuilderRuntime } from './ActionPlanBuilderRuntime';
import { createActionPlanContext } from './ActionPlanContext';

/**
 * Action Plan runtime sonucunu DecisionPipelineContext.bag’e işler.
 * Foundation bag.actions alanını da doldurur.
 */
export function attachActionPlanToPipelineContext(
  context: DecisionPipelineContext,
  result: ActionPlanResult
): void {
  context.bag[PIPELINE_BAG_ACTION_PLAN_RUNTIME_RESULT_KEY] = result;
  context.bag.actions = result.actions;
}

/**
 * Bag’den zengin Action Plan runtime sonucunu okur.
 */
export function readActionPlanFromPipelineContext(
  context: DecisionPipelineContext
): ActionPlanResult | undefined {
  const value = context.bag[PIPELINE_BAG_ACTION_PLAN_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as ActionPlanResult;
}

/**
 * PipelineResult.context.bag üzerinden Action Plan sonucunu bağlar.
 */
export function attachActionPlanToPipelineResult(
  pipelineResult: DecisionPipelineResult,
  result: ActionPlanResult
): void {
  const ctx = pipelineResult.context as DecisionPipelineContext;
  attachActionPlanToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Action Plan runtime sonucunu okur.
 */
export function readActionPlanFromPipelineResult(
  pipelineResult: DecisionPipelineResult
): ActionPlanResult | undefined {
  return readActionPlanFromPipelineContext(
    pipelineResult.context as DecisionPipelineContext
  );
}

/**
 * Validation + Recommendation geçmiş pipeline sonucuna Action Plan stage’ini uygular.
 * PR-103A–C orchestrator dosyalarını değiştirmez.
 */
export function applyActionPlanBuilderToPipelineResult(
  pipelineResult: DecisionPipelineResult,
  builder: ActionPlanBuilderRuntime = createActionPlanBuilderRuntime()
): ActionPlanResult {
  const context = pipelineResult.context as DecisionPipelineContext;
  const validation = context.bag.analysisValidation;
  const recommendationResult = readRecommendationFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped: ActionPlanResult = {
      records: Object.freeze([]),
      actionPlans: Object.freeze([]),
      actions: Object.freeze([]),
      summary: {
        actionPlanCount: 0,
        stepCount: 0,
        informationalCount: 0,
        warningCount: 1,
        priorityCounts: Object.freeze({}),
        success: false
      },
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'AnalysisResult validation başarısız; Action Plan Builder çalıştırılmadı.'
        }
      ]),
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        actionPlanCount: 0,
        stepCount: 0,
        priorityDistribution: Object.freeze({}),
        warningCount: 1
      }
    };
    attachActionPlanToPipelineContext(context, skipped);
    return skipped;
  }

  if (!recommendationResult) {
    const skipped: ActionPlanResult = {
      records: Object.freeze([]),
      actionPlans: Object.freeze([]),
      actions: Object.freeze([]),
      summary: {
        actionPlanCount: 0,
        stepCount: 0,
        informationalCount: 0,
        warningCount: 1,
        priorityCounts: Object.freeze({}),
        success: false
      },
      warnings: Object.freeze([
        {
          code: 'RECOMMENDATION_RESULT_MISSING',
          message: 'RecommendationResult yok; Action Plan Builder atlandı.'
        }
      ]),
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        actionPlanCount: 0,
        stepCount: 0,
        priorityDistribution: Object.freeze({}),
        warningCount: 1
      }
    };
    attachActionPlanToPipelineContext(context, skipped);
    return skipped;
  }

  const result = builder.compute(
    createActionPlanContext({
      decisionContext: context.decisionContext,
      recommendationResult,
      locale: context.decisionContext.locale,
      includeSkippedInfo: true,
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
