/**
 * Decision Pipeline köprüsü — PR-103A–D dosyalarını değiştirmeden bag’e yazar (PR-103E).
 */

import type { DecisionPipelineContext } from '../../pipeline/runtime/DecisionPipelineContext';
import type { DecisionPipelineResult } from '../../pipeline/runtime/DecisionPipelineResult';
import { readPolicyFromPipelineContext } from '../../policies/runtime/pipelineBridge';
import { readRecommendationFromPipelineContext } from '../../recommendations/runtime/pipelineBridge';
import { readActionPlanFromPipelineContext } from '../../actionPlans/runtime/pipelineBridge';
import type { DecisionSummaryResult } from './DecisionSummaryResult';
import { PIPELINE_BAG_DECISION_SUMMARY_RUNTIME_RESULT_KEY } from './DecisionSummaryResult';
import type { DecisionSummaryRuntime } from './DecisionSummaryRuntime';
import { createDecisionSummaryRuntime } from './DecisionSummaryRuntime';
import { createDecisionSummaryContext } from './DecisionSummaryContext';

/**
 * Decision Summary runtime sonucunu DecisionPipelineContext.bag’e işler.
 * Foundation bag.summary alanını da doldurur.
 */
export function attachDecisionSummaryToPipelineContext(
  context: DecisionPipelineContext,
  result: DecisionSummaryResult
): void {
  context.bag[PIPELINE_BAG_DECISION_SUMMARY_RUNTIME_RESULT_KEY] = result;
  context.bag.summary = result.decisionSummary;
}

/**
 * Bag’den zengin Decision Summary runtime sonucunu okur.
 */
export function readDecisionSummaryFromPipelineContext(
  context: DecisionPipelineContext
): DecisionSummaryResult | undefined {
  const value = context.bag[PIPELINE_BAG_DECISION_SUMMARY_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as DecisionSummaryResult;
}

/**
 * PipelineResult.context.bag üzerinden Decision Summary sonucunu bağlar.
 */
export function attachDecisionSummaryToPipelineResult(
  pipelineResult: DecisionPipelineResult,
  result: DecisionSummaryResult
): void {
  const ctx = pipelineResult.context as DecisionPipelineContext;
  attachDecisionSummaryToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Decision Summary runtime sonucunu okur.
 */
export function readDecisionSummaryFromPipelineResult(
  pipelineResult: DecisionPipelineResult
): DecisionSummaryResult | undefined {
  return readDecisionSummaryFromPipelineContext(
    pipelineResult.context as DecisionPipelineContext
  );
}

/**
 * Validation + prior stage sonuçları üzerinden Decision Summary uygular.
 * PR-103A–D orchestrator dosyalarını değiştirmez.
 */
export function applyDecisionSummaryToPipelineResult(
  pipelineResult: DecisionPipelineResult,
  runtime: DecisionSummaryRuntime = createDecisionSummaryRuntime()
): DecisionSummaryResult {
  const context = pipelineResult.context as DecisionPipelineContext;
  const validation = context.bag.analysisValidation;
  const policyResult = readPolicyFromPipelineContext(context);
  const recommendationResult = readRecommendationFromPipelineContext(context);
  const actionPlanResult = readActionPlanFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = runtime.compute(
      createDecisionSummaryContext({
        decisionContext: context.decisionContext,
        request: context.request,
        locale: context.decisionContext.locale
      })
    );
    const withWarning: DecisionSummaryResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'AnalysisResult validation başarısız; Decision Summary boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachDecisionSummaryToPipelineContext(context, withWarning);

    const mutableSkip = pipelineResult.decisionResult as {
      summary: typeof pipelineResult.decisionResult.summary;
    };
    mutableSkip.summary = withWarning.decisionSummary;
    return withWarning;
  }

  const result = runtime.compute(
    createDecisionSummaryContext({
      decisionContext: context.decisionContext,
      request: context.request,
      policyResult,
      recommendationResult,
      actionPlanResult,
      locale: context.decisionContext.locale,
      bag: context.bag
    })
  );

  attachDecisionSummaryToPipelineContext(context, result);

  const mutableResult = pipelineResult.decisionResult as {
    summary: typeof pipelineResult.decisionResult.summary;
  };
  mutableResult.summary = result.decisionSummary;

  return result;
}
