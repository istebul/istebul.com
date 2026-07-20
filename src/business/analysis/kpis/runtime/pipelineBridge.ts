/**
 * Analysis Pipeline köprüsü — PR-102A dosyalarını değiştirmeden bag’e yazar (PR-102B).
 */

import type { AnalysisPipelineContext } from '../../pipeline/runtime/AnalysisPipelineContext';
import type { AnalysisPipelineResult } from '../../pipeline/runtime/AnalysisPipelineResult';
import type { KpiResult } from './KpiResult';
import { PIPELINE_BAG_KPI_RUNTIME_RESULT_KEY } from './KpiResult';
import type { KpiEngineRuntime } from './KpiEngineRuntime';
import { createKpiEngineRuntime } from './KpiEngineRuntime';
import { createKpiContext } from './KpiContext';

/**
 * KPI runtime sonucunu AnalysisPipelineContext.bag’e işler.
 * Foundation bag.kpiResults alanını da doldurur.
 */
export function attachKpiToPipelineContext(
  context: AnalysisPipelineContext,
  result: KpiResult
): void {
  context.bag[PIPELINE_BAG_KPI_RUNTIME_RESULT_KEY] = result;
  context.bag.kpiResults = result.kpiResults;
}

/**
 * Bag’den zengin KPI runtime sonucunu okur.
 */
export function readKpiFromPipelineContext(
  context: AnalysisPipelineContext
): KpiResult | undefined {
  const value = context.bag[PIPELINE_BAG_KPI_RUNTIME_RESULT_KEY];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as KpiResult;
}

/**
 * PipelineResult.context.bag üzerinden KPI sonucunu bağlar.
 */
export function attachKpiToPipelineResult(
  pipelineResult: AnalysisPipelineResult,
  result: KpiResult
): void {
  const ctx = pipelineResult.context as AnalysisPipelineContext;
  attachKpiToPipelineContext(ctx, result);
}

/**
 * PipelineResult içinden KPI runtime sonucunu okur.
 */
export function readKpiFromPipelineResult(
  pipelineResult: AnalysisPipelineResult
): KpiResult | undefined {
  return readKpiFromPipelineContext(
    pipelineResult.context as AnalysisPipelineContext
  );
}

/**
 * Validation geçmiş pipeline sonucuna KPI stage’ini uygular.
 * PR-102A orchestrator’ını değiştirmez; bag + analysisResult’i günceller.
 */
export function applyKpiEngineToPipelineResult(
  pipelineResult: AnalysisPipelineResult,
  engine: KpiEngineRuntime = createKpiEngineRuntime()
): KpiResult {
  const context = pipelineResult.context as AnalysisPipelineContext;
  const validation = context.bag.datasetValidation;
  const dataset = context.analysisContext.dataset;

  if (validation && validation.isValid === false) {
    const skipped: KpiResult = {
      calculations: Object.freeze([]),
      kpiResults: Object.freeze([]),
      summary: {
        calculatedCount: 0,
        requestedCount: 0,
        unavailableCount: 0,
        success: false
      },
      warnings: Object.freeze([
        {
          code: 'VALIDATION_NOT_PASSED',
          message:
            'Dataset validation başarısız; KPI hesaplaması atlandı.'
        }
      ]),
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        calculatedKpiCount: 0,
        warningCount: 1,
        datasetSize: {
          entityCount: 0,
          recordCount: 0,
          columnCount: 0,
          totalFieldCount: 0
        }
      }
    };
    attachKpiToPipelineContext(context, skipped);
    return skipped;
  }

  const kpiIds =
    context.request.kpiIds ?? context.analysisContext.kpiIds ?? undefined;

  const result = engine.compute(
    createKpiContext({
      dataset,
      analysisContext: context.analysisContext,
      locale: context.analysisContext.locale,
      kpiIds
    })
  );

  attachKpiToPipelineContext(context, result);

  const mutableResult = pipelineResult.analysisResult as {
    kpiResults: typeof pipelineResult.analysisResult.kpiResults;
    statistics: typeof pipelineResult.analysisResult.statistics;
    warnings: typeof pipelineResult.analysisResult.warnings;
  };

  mutableResult.kpiResults = result.kpiResults;
  mutableResult.statistics = {
    ...pipelineResult.analysisResult.statistics,
    kpiResultCount: result.summary.calculatedCount
  };
  mutableResult.warnings = Object.freeze([
    ...pipelineResult.analysisResult.warnings,
    ...result.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      stage: 'kpi-hesaplama' as const
    }))
  ]);

  return result;
}
