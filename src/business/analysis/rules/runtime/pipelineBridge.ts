/**
 * Analysis Pipeline köprüsü — PR-102A/B dosyalarını değiştirmeden bag’e yazar (PR-102C).
 */

import type { AnalysisPipelineContext } from '../../pipeline/runtime/AnalysisPipelineContext';
import type { AnalysisPipelineResult } from '../../pipeline/runtime/AnalysisPipelineResult';
import { readKpiFromPipelineContext } from '../../kpis/runtime/pipelineBridge';
import type { RuleResult } from './RuleResult';
import { PIPELINE_BAG_RULE_RUNTIME_RESULT_KEY } from './RuleResult';
import type { RuleEngineRuntime } from './RuleEngineRuntime';
import { createRuleEngineRuntime } from './RuleEngineRuntime';
import { createRuleContext } from './RuleContext';

/**
 * Rule runtime sonucunu AnalysisPipelineContext.bag’e işler.
 * Foundation bag.findings alanını da doldurur.
 */
export function attachRuleToPipelineContext(
  context: AnalysisPipelineContext,
  result: RuleResult
): void {
  context.bag[PIPELINE_BAG_RULE_RUNTIME_RESULT_KEY] = result;
  context.bag.findings = result.findings;
}

/**
 * Bag’den zengin Rule runtime sonucunu okur.
 */
export function readRuleFromPipelineContext(
  context: AnalysisPipelineContext
): RuleResult | undefined {
  const value = context.bag[PIPELINE_BAG_RULE_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as RuleResult;
}

/**
 * PipelineResult.context.bag üzerinden Rule sonucunu bağlar.
 */
export function attachRuleToPipelineResult(
  pipelineResult: AnalysisPipelineResult,
  result: RuleResult
): void {
  const ctx = pipelineResult.context as AnalysisPipelineContext;
  attachRuleToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Rule runtime sonucunu okur.
 */
export function readRuleFromPipelineResult(
  pipelineResult: AnalysisPipelineResult
): RuleResult | undefined {
  return readRuleFromPipelineContext(
    pipelineResult.context as AnalysisPipelineContext
  );
}

/**
 * Validation + KPI geçmiş pipeline sonucuna Rule stage’ini uygular.
 * PR-102A/B orchestrator dosyalarını değiştirmez.
 */
export function applyRuleEngineToPipelineResult(
  pipelineResult: AnalysisPipelineResult,
  engine: RuleEngineRuntime = createRuleEngineRuntime()
): RuleResult {
  const context = pipelineResult.context as AnalysisPipelineContext;
  const validation = context.bag.datasetValidation;
  const kpiRuntime = readKpiFromPipelineContext(context);
  const kpiResults = context.bag.kpiResults ?? [];

  if (validation && validation.isValid === false) {
    const skipped: RuleResult = {
      evaluations: Object.freeze([]),
      triggeredRules: Object.freeze([]),
      passedRules: Object.freeze([]),
      skippedRules: Object.freeze([]),
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
            'Dataset validation başarısız; Rule Engine çalıştırılmadı.'
        }
      ]),
      findings: Object.freeze([]),
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        evaluatedRuleCount: 0,
        triggeredRuleCount: 0,
        passedRuleCount: 0,
        skippedRuleCount: 0,
        warningCount: 1
      }
    };
    attachRuleToPipelineContext(context, skipped);
    return skipped;
  }

  const ruleIds =
    context.request.ruleIds ?? context.analysisContext.ruleIds ?? undefined;

  const result = engine.compute(
    createRuleContext({
      dataset: context.analysisContext.dataset,
      kpiResults,
      kpiRuntimeResult: kpiRuntime,
      analysisContext: context.analysisContext,
      locale: context.analysisContext.locale,
      ruleIds
    })
  );

  attachRuleToPipelineContext(context, result);

  const mutableResult = pipelineResult.analysisResult as {
    findings: typeof pipelineResult.analysisResult.findings;
    statistics: typeof pipelineResult.analysisResult.statistics;
    warnings: typeof pipelineResult.analysisResult.warnings;
  };

  mutableResult.findings = result.findings;
  mutableResult.statistics = {
    ...pipelineResult.analysisResult.statistics,
    findingCount: result.findings.length
  };
  mutableResult.warnings = Object.freeze([
    ...pipelineResult.analysisResult.warnings,
    ...result.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      stage: 'kural-degerlendirme' as const
    }))
  ]);

  return result;
}
