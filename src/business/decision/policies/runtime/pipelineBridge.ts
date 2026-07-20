/**
 * Decision Pipeline köprüsü — PR-103A dosyalarını değiştirmeden bag’e yazar (PR-103B).
 */

import type { DecisionPipelineContext } from '../../pipeline/runtime/DecisionPipelineContext';
import type { DecisionPipelineResult } from '../../pipeline/runtime/DecisionPipelineResult';
import type { PolicyResult } from './PolicyResult';
import { PIPELINE_BAG_POLICY_RUNTIME_RESULT_KEY } from './PolicyResult';
import type { PolicyEngineRuntime } from './PolicyEngineRuntime';
import { createPolicyEngineRuntime } from './PolicyEngineRuntime';
import { createPolicyContext } from './PolicyContext';

/**
 * Policy runtime sonucunu DecisionPipelineContext.bag’e işler.
 */
export function attachPolicyToPipelineContext(
  context: DecisionPipelineContext,
  result: PolicyResult
): void {
  context.bag[PIPELINE_BAG_POLICY_RUNTIME_RESULT_KEY] = result;
}

/**
 * Bag’den zengin Policy runtime sonucunu okur.
 */
export function readPolicyFromPipelineContext(
  context: DecisionPipelineContext
): PolicyResult | undefined {
  const value = context.bag[PIPELINE_BAG_POLICY_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as PolicyResult;
}

/**
 * PipelineResult.context.bag üzerinden Policy sonucunu bağlar.
 */
export function attachPolicyToPipelineResult(
  pipelineResult: DecisionPipelineResult,
  result: PolicyResult
): void {
  const ctx = pipelineResult.context as DecisionPipelineContext;
  attachPolicyToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Policy runtime sonucunu okur.
 */
export function readPolicyFromPipelineResult(
  pipelineResult: DecisionPipelineResult
): PolicyResult | undefined {
  return readPolicyFromPipelineContext(
    pipelineResult.context as DecisionPipelineContext
  );
}

/**
 * Validation geçmiş Decision pipeline sonucuna Policy stage’ini uygular.
 * PR-103A orchestrator dosyalarını değiştirmez; yalnızca bag’e yazar.
 */
export function applyPolicyEngineToPipelineResult(
  pipelineResult: DecisionPipelineResult,
  engine: PolicyEngineRuntime = createPolicyEngineRuntime()
): PolicyResult {
  const context = pipelineResult.context as DecisionPipelineContext;
  const validation = context.bag.analysisValidation;

  if (validation && validation.isValid === false) {
    const skipped: PolicyResult = {
      evaluations: Object.freeze([]),
      triggeredPolicies: Object.freeze([]),
      passedPolicies: Object.freeze([]),
      skippedPolicies: Object.freeze([]),
      summary: {
        evaluatedCount: 0,
        triggeredCount: 0,
        passedCount: 0,
        skippedCount: 0,
        success: false
      },
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'AnalysisResult validation başarısız; Policy Engine çalıştırılmadı.'
        }
      ]),
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        evaluatedPolicyCount: 0,
        triggeredPolicyCount: 0,
        passedPolicyCount: 0,
        skippedPolicyCount: 0,
        warningCount: 1
      }
    };
    attachPolicyToPipelineContext(context, skipped);
    return skipped;
  }

  const result = engine.compute(
    createPolicyContext({
      analysisResult: context.decisionContext.analysisResult,
      decisionContext: context.decisionContext,
      locale: context.decisionContext.locale,
      policyIds: undefined,
      bag: context.bag
    })
  );

  attachPolicyToPipelineContext(context, result);
  return result;
}
