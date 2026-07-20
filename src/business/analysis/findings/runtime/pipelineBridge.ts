/**
 * Analysis Pipeline köprüsü — PR-102A–C dosyalarını değiştirmeden bag’e yazar (PR-102D).
 */

import type { AnalysisPipelineContext } from '../../pipeline/runtime/AnalysisPipelineContext';
import type { AnalysisPipelineResult } from '../../pipeline/runtime/AnalysisPipelineResult';
import { readRuleFromPipelineContext } from '../../rules/runtime/pipelineBridge';
import type { FindingResult } from './FindingResult';
import { PIPELINE_BAG_FINDING_RUNTIME_RESULT_KEY } from './FindingResult';
import type { FindingBuilderRuntime } from './FindingBuilderRuntime';
import { createFindingBuilderRuntime } from './FindingBuilderRuntime';
import { createFindingContext } from './FindingContext';

/**
 * Finding runtime sonucunu AnalysisPipelineContext.bag’e işler.
 */
export function attachFindingToPipelineContext(
  context: AnalysisPipelineContext,
  result: FindingResult
): void {
  context.bag[PIPELINE_BAG_FINDING_RUNTIME_RESULT_KEY] = result;
  context.bag.findings = result.findings;
}

/**
 * Bag’den zengin Finding runtime sonucunu okur.
 */
export function readFindingFromPipelineContext(
  context: AnalysisPipelineContext
): FindingResult | undefined {
  const value = context.bag[PIPELINE_BAG_FINDING_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as FindingResult;
}

/**
 * PipelineResult.context.bag üzerinden Finding sonucunu bağlar.
 */
export function attachFindingToPipelineResult(
  pipelineResult: AnalysisPipelineResult,
  result: FindingResult
): void {
  const ctx = pipelineResult.context as AnalysisPipelineContext;
  attachFindingToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Finding runtime sonucunu okur.
 */
export function readFindingFromPipelineResult(
  pipelineResult: AnalysisPipelineResult
): FindingResult | undefined {
  return readFindingFromPipelineContext(
    pipelineResult.context as AnalysisPipelineContext
  );
}

/**
 * Validation + Rule geçmiş pipeline sonucuna Finding stage’ini uygular.
 * PR-102A–C orchestrator dosyalarını değiştirmez.
 */
export function applyFindingBuilderToPipelineResult(
  pipelineResult: AnalysisPipelineResult,
  builder: FindingBuilderRuntime = createFindingBuilderRuntime()
): FindingResult {
  const context = pipelineResult.context as AnalysisPipelineContext;
  const validation = context.bag.datasetValidation;
  const ruleResult = readRuleFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped: FindingResult = {
      records: Object.freeze([]),
      findings: Object.freeze([]),
      summary: {
        findingCount: 0,
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
            'Dataset validation başarısız; Finding Builder çalıştırılmadı.'
        }
      ]),
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        findingCount: 0,
        categoryCount: 0,
        severityDistribution: Object.freeze({}),
        warningCount: 1
      }
    };
    attachFindingToPipelineContext(context, skipped);
    return skipped;
  }

  if (!ruleResult) {
    const skipped: FindingResult = {
      records: Object.freeze([]),
      findings: Object.freeze([]),
      summary: {
        findingCount: 0,
        informationalCount: 0,
        warningCount: 1,
        categoryCounts: Object.freeze({}),
        severityCounts: Object.freeze({}),
        success: false
      },
      warnings: Object.freeze([
        {
          code: 'RULE_RESULT_MISSING',
          message: 'RuleResult yok; Finding Builder atlandı.'
        }
      ]),
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        findingCount: 0,
        categoryCount: 0,
        severityDistribution: Object.freeze({}),
        warningCount: 1
      }
    };
    attachFindingToPipelineContext(context, skipped);
    return skipped;
  }

  const result = builder.compute(
    createFindingContext({
      analysisContext: context.analysisContext,
      kpiResults: context.bag.kpiResults,
      ruleResult,
      ruleFindings: ruleResult.findings,
      locale: context.analysisContext.locale,
      includeSkippedInfo: true
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
