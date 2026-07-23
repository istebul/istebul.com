/**
 * Decision Pipeline köprüsü — PR-103A/B dosyalarını değiştirmeden bag’e yazar (PR-103C).
 */

import type { DecisionPipelineContext } from '../../pipeline/runtime/DecisionPipelineContext';
import type { DecisionPipelineResult } from '../../pipeline/runtime/DecisionPipelineResult';
import { readPolicyFromPipelineContext } from '../../policies/runtime/pipelineBridge';
import type { RecommendationResult } from './RecommendationResult';
import { PIPELINE_BAG_RECOMMENDATION_RUNTIME_RESULT_KEY } from './RecommendationResult';
import type { RecommendationBuilderRuntime } from './RecommendationBuilderRuntime';
import { createRecommendationBuilderRuntime } from './RecommendationBuilderRuntime';
import { createRecommendationContext } from './RecommendationContext';

/**
 * Recommendation runtime sonucunu DecisionPipelineContext.bag’e işler.
 * Foundation bag.recommendations alanını da doldurur.
 */
export function attachRecommendationToPipelineContext(
  context: DecisionPipelineContext,
  result: RecommendationResult
): void {
  context.bag[PIPELINE_BAG_RECOMMENDATION_RUNTIME_RESULT_KEY] = result;
  context.bag.recommendations = result.recommendations;
}

/**
 * Bag’den zengin Recommendation runtime sonucunu okur.
 */
export function readRecommendationFromPipelineContext(
  context: DecisionPipelineContext
): RecommendationResult | undefined {
  const value = context.bag[PIPELINE_BAG_RECOMMENDATION_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as RecommendationResult;
}

/**
 * PipelineResult.context.bag üzerinden Recommendation sonucunu bağlar.
 */
export function attachRecommendationToPipelineResult(
  pipelineResult: DecisionPipelineResult,
  result: RecommendationResult
): void {
  const ctx = pipelineResult.context as DecisionPipelineContext;
  attachRecommendationToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Recommendation runtime sonucunu okur.
 */
export function readRecommendationFromPipelineResult(
  pipelineResult: DecisionPipelineResult
): RecommendationResult | undefined {
  return readRecommendationFromPipelineContext(
    pipelineResult.context as DecisionPipelineContext
  );
}

/**
 * Validation + Policy geçmiş pipeline sonucuna Recommendation stage’ini uygular.
 * PR-103A/B orchestrator dosyalarını değiştirmez.
 */
export function applyRecommendationBuilderToPipelineResult(
  pipelineResult: DecisionPipelineResult,
  builder: RecommendationBuilderRuntime = createRecommendationBuilderRuntime()
): RecommendationResult {
  const context = pipelineResult.context as DecisionPipelineContext;
  const validation = context.bag.analysisValidation;
  const policyResult = readPolicyFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped: RecommendationResult = {
      records: Object.freeze([]),
      recommendations: Object.freeze([]),
      summary: {
        recommendationCount: 0,
        informationalCount: 0,
        warningCount: 1,
        categoryCounts: Object.freeze({}),
        severityCounts: Object.freeze({}),
        success: false
      },
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'AnalysisResult validation başarısız; Recommendation Builder çalıştırılmadı.'
        }
      ]),
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        recommendationCount: 0,
        categoryCount: 0,
        categoryDistribution: Object.freeze({}),
        severityDistribution: Object.freeze({}),
        warningCount: 1
      }
    };
    attachRecommendationToPipelineContext(context, skipped);
    return skipped;
  }

  if (!policyResult) {
    const skipped: RecommendationResult = {
      records: Object.freeze([]),
      recommendations: Object.freeze([]),
      summary: {
        recommendationCount: 0,
        informationalCount: 0,
        warningCount: 1,
        categoryCounts: Object.freeze({}),
        severityCounts: Object.freeze({}),
        success: false
      },
      warnings: Object.freeze([
        {
          code: 'POLICY_RESULT_MISSING',
          message: 'PolicyResult yok; Recommendation Builder atlandı.'
        }
      ]),
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        recommendationCount: 0,
        categoryCount: 0,
        categoryDistribution: Object.freeze({}),
        severityDistribution: Object.freeze({}),
        warningCount: 1
      }
    };
    attachRecommendationToPipelineContext(context, skipped);
    return skipped;
  }

  const result = builder.compute(
    createRecommendationContext({
      decisionContext: context.decisionContext,
      analysisResult: context.decisionContext.analysisResult,
      policyResult,
      locale: context.decisionContext.locale,
      includeSkippedInfo: true,
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
