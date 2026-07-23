/**
 * Report Pipeline köprüsü — PR-104A/B dosyalarını değiştirmeden bag’e yazar (PR-104C).
 */

import type { ExecutiveSummary } from '../../models/ExecutiveSummary';
import type { ReportPipelineContext } from '../../pipeline/runtime/ReportPipelineContext';
import type { ReportPipelineResult } from '../../pipeline/runtime/ReportPipelineResult';
import { readReportModelFromPipelineContext } from '../../modelBuilder/runtime/pipelineBridge';
import type { NarrativeResult } from './NarrativeResult';
import { PIPELINE_BAG_NARRATIVE_RUNTIME_RESULT_KEY } from './NarrativeResult';
import type { NarrativeComposerRuntime } from './NarrativeComposerRuntime';
import { createNarrativeComposerRuntime } from './NarrativeComposerRuntime';
import { createNarrativeContext } from './NarrativeContext';

function toExecutiveSummary(result: NarrativeResult): ExecutiveSummary {
  const executive = result.narratives.find(
    (item) => item.kind === 'executive-summary'
  );
  if (!executive) {
    return {
      headline: '',
      body: '',
      highlights: Object.freeze([])
    };
  }
  return {
    headline: executive.title,
    body: executive.body,
    highlights: executive.highlights
  };
}

/**
 * Narrative runtime sonucunu ReportPipelineContext.bag’e işler.
 * Foundation bag.executiveSummary alanını da doldurur.
 */
export function attachNarrativeToPipelineContext(
  context: ReportPipelineContext,
  result: NarrativeResult
): void {
  context.bag[PIPELINE_BAG_NARRATIVE_RUNTIME_RESULT_KEY] = result;
  context.bag.executiveSummary = toExecutiveSummary(result);
}

/**
 * Bag’den zengin Narrative runtime sonucunu okur.
 */
export function readNarrativeFromPipelineContext(
  context: ReportPipelineContext
): NarrativeResult | undefined {
  const value = context.bag[PIPELINE_BAG_NARRATIVE_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as NarrativeResult;
}

/**
 * PipelineResult.context.bag üzerinden Narrative sonucunu bağlar.
 */
export function attachNarrativeToPipelineResult(
  pipelineResult: ReportPipelineResult,
  result: NarrativeResult
): void {
  const ctx = pipelineResult.context as ReportPipelineContext;
  attachNarrativeToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden Narrative runtime sonucunu okur.
 */
export function readNarrativeFromPipelineResult(
  pipelineResult: ReportPipelineResult
): NarrativeResult | undefined {
  return readNarrativeFromPipelineContext(
    pipelineResult.context as ReportPipelineContext
  );
}

/**
 * Validation + Report Model geçmiş pipeline sonucuna Narrative Composer uygular.
 * PR-104A/B orchestrator dosyalarını değiştirmez.
 */
export function applyNarrativeComposerToPipelineResult(
  pipelineResult: ReportPipelineResult,
  composer: NarrativeComposerRuntime = createNarrativeComposerRuntime()
): NarrativeResult {
  const context = pipelineResult.context as ReportPipelineContext;
  const validation = context.bag.decisionValidation;
  const reportModelResult = readReportModelFromPipelineContext(context);

  if (validation && validation.isValid === false) {
    const skipped = composer.compute(
      createNarrativeContext({
        reportContext: context.reportContext,
        request: context.request,
        locale: context.reportContext.locale
      })
    );
    const withWarning: NarrativeResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'DecisionResult validation başarısız; Narrative boş ReportModel ile üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachNarrativeToPipelineContext(context, withWarning);

    const mutableSkip = pipelineResult.reportModel as {
      executiveSummary: typeof pipelineResult.reportModel.executiveSummary;
    };
    mutableSkip.executiveSummary = toExecutiveSummary(withWarning);
    return withWarning;
  }

  if (!reportModelResult) {
    const skipped = composer.compute(
      createNarrativeContext({
        reportContext: context.reportContext,
        request: context.request,
        locale: context.reportContext.locale,
        bag: context.bag
      })
    );
    const withWarning: NarrativeResult = {
      ...skipped,
      warnings: Object.freeze([
        {
          code: 'REPORT_MODEL_RESULT_MISSING',
          message: 'ReportModelResult yok; Narrative atlandı / boş üretildi.'
        },
        ...skipped.warnings
      ]),
      telemetry: {
        ...skipped.telemetry,
        warningCount: skipped.telemetry.warningCount + 1
      }
    };
    attachNarrativeToPipelineContext(context, withWarning);
    return withWarning;
  }

  const result = composer.compute(
    createNarrativeContext({
      reportContext: context.reportContext,
      request: context.request,
      reportModelResult,
      reportModel: reportModelResult.model,
      locale: context.reportContext.locale,
      bag: context.bag
    })
  );

  attachNarrativeToPipelineContext(context, result);

  const mutableResult = pipelineResult.reportModel as {
    executiveSummary: typeof pipelineResult.reportModel.executiveSummary;
  };
  mutableResult.executiveSummary = toExecutiveSummary(result);

  return result;
}
