/**
 * Analysis Pipeline köprüsü — PR-102A–D dosyalarını değiştirmeden bag’e yazar (PR-102E).
 */

import type { AnalysisPipelineContext } from '../../pipeline/runtime/AnalysisPipelineContext';
import type { AnalysisPipelineResult } from '../../pipeline/runtime/AnalysisPipelineResult';
import { readKpiFromPipelineContext } from '../../kpis/runtime/pipelineBridge';
import { readRuleFromPipelineContext } from '../../rules/runtime/pipelineBridge';
import { readFindingFromPipelineContext } from '../../findings/runtime/pipelineBridge';
import type { SummaryResult } from './SummaryResult';
import { PIPELINE_BAG_SUMMARY_RUNTIME_RESULT_KEY } from './SummaryResult';
import type { SummaryBuilderRuntime } from './SummaryBuilderRuntime';
import { createSummaryBuilderRuntime } from './SummaryBuilderRuntime';
import { createSummaryContext } from './SummaryContext';

/**
 * Summary runtime sonucunu AnalysisPipelineContext.bag’e işler.
 */
export function attachSummaryToPipelineContext(
  context: AnalysisPipelineContext,
  result: SummaryResult
): void {
  context.bag[PIPELINE_BAG_SUMMARY_RUNTIME_RESULT_KEY] = result;
  context.bag.summary = result.analysisSummary;
}

/**
 * Bag’den zengin Summary runtime sonucunu okur.
 */
export function readSummaryFromPipelineContext(
  context: AnalysisPipelineContext
): SummaryResult | undefined {
  const value = context.bag[PIPELINE_BAG_SUMMARY_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as SummaryResult;
}

/**
 * PipelineResult.context.bag üzerinden Summary sonucunu bağlar.
 */
export function attachSummaryToPipelineResult(
  pipelineResult: AnalysisPipelineResult,
  result: SummaryResult
): void {
  const ctx = pipelineResult.context as AnalysisPipelineContext;
  attachSummaryToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Summary runtime sonucunu okur.
 */
export function readSummaryFromPipelineResult(
  pipelineResult: AnalysisPipelineResult
): SummaryResult | undefined {
  return readSummaryFromPipelineContext(
    pipelineResult.context as AnalysisPipelineContext
  );
}

/**
 * Validation geçmiş pipeline sonucuna Summary stage’ini uygular.
 * PR-102A–D orchestrator dosyalarını değiştirmez.
 */
export function applySummaryBuilderToPipelineResult(
  pipelineResult: AnalysisPipelineResult,
  builder: SummaryBuilderRuntime = createSummaryBuilderRuntime()
): SummaryResult {
  const context = pipelineResult.context as AnalysisPipelineContext;
  const validation = context.bag.datasetValidation;
  const kpiResult = readKpiFromPipelineContext(context);
  const ruleResult = readRuleFromPipelineContext(context);
  const findingResult = readFindingFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = builder.compute(
      createSummaryContext({
        analysisContext: context.analysisContext,
        locale: context.analysisContext.locale
      })
    );
    const withWarning: SummaryResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'Dataset validation başarısız; Summary boş girdilerle üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachSummaryToPipelineContext(context, withWarning);

    const mutableSkip = pipelineResult.analysisResult as {
      summary: typeof pipelineResult.analysisResult.summary;
      warnings: typeof pipelineResult.analysisResult.warnings;
    };
    mutableSkip.summary = withWarning.analysisSummary;
    mutableSkip.warnings = Object.freeze([
      ...pipelineResult.analysisResult.warnings,
      ...withWarning.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
        stage: 'ozet-uretimi' as const
      }))
    ]);
    return withWarning;
  }

  const result = builder.compute(
    createSummaryContext({
      analysisContext: context.analysisContext,
      kpiResult,
      kpiResults: context.bag.kpiResults,
      ruleResult,
      findingResult,
      findings: context.bag.findings ?? findingResult?.findings,
      locale: context.analysisContext.locale
    })
  );

  attachSummaryToPipelineContext(context, result);

  const mutableResult = pipelineResult.analysisResult as {
    summary: typeof pipelineResult.analysisResult.summary;
    warnings: typeof pipelineResult.analysisResult.warnings;
  };

  mutableResult.summary = result.analysisSummary;
  mutableResult.warnings = Object.freeze([
    ...pipelineResult.analysisResult.warnings,
    ...result.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      stage: 'ozet-uretimi' as const
    }))
  ]);

  return result;
}
