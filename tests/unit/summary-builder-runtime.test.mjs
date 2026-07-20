/**
 * Summary Builder Runtime — PR-102E (en az 20 unit test)
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(
  pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href
);

const {
  createSummaryBuilderRuntime,
  createSummaryRegistryRuntime,
  createSummaryContext,
  createKpiEngineRuntime,
  createKpiContext,
  createRuleEngineRuntime,
  createRuleContext,
  createFindingBuilderRuntime,
  createFindingContext,
  createAnalysisPipelineRuntime,
  applyKpiEngineToPipelineResult,
  applyRuleEngineToPipelineResult,
  applyFindingBuilderToPipelineResult,
  applySummaryBuilderToPipelineResult,
  attachSummaryToPipelineContext,
  readSummaryFromPipelineContext,
  attachSummaryToPipelineResult,
  readSummaryFromPipelineResult,
  SUMMARY_SECTION_ORDER,
  SUMMARY_SECTION_LABELS,
  PIPELINE_BAG_SUMMARY_RUNTIME_RESULT_KEY
} = await import('../../src/business/analysis/index.ts');

function sampleDataset(overrides = {}) {
  return {
    id: 'ds-summary-001',
    metadata: {
      id: 'ds-summary-001',
      title: 'Summary Dataset',
      locale: 'tr',
      createdAt: '2026-07-20T13:00:00.000Z'
    },
    version: {
      schemaVersion: '1.0.0',
      revision: '1',
      effectiveAt: '2026-07-20T13:00:00.000Z'
    },
    source: { type: 'csv', label: 'summary.csv' },
    entities: [
      {
        id: 'ent-1',
        entityType: 'urun',
        name: 'Ürünler',
        layout: 'tablo',
        columns: [
          { id: 'sku', name: 'SKU', dataType: 'metin', required: true, order: 1 },
          {
            id: 'adet',
            name: 'Adet',
            dataType: 'tamsayi',
            required: false,
            order: 2
          }
        ],
        rows: [
          { id: 'r1', values: { sku: 'A1', adet: 10 } },
          { id: 'r2', values: { sku: 'A2', adet: 5 } }
        ]
      }
    ],
    relations: [],
    ...overrides
  };
}

function dirtyDataset() {
  return sampleDataset({
    entities: [
      {
        id: 'ent-1',
        entityType: 'urun',
        name: 'Ürünler',
        layout: 'tablo',
        columns: [
          { id: 'sku', name: 'SKU', dataType: 'metin', required: true, order: 1 },
          {
            id: 'adet',
            name: 'Adet',
            dataType: 'tamsayi',
            required: false,
            order: 2
          }
        ],
        rows: [
          { id: 'r1', values: { sku: '', adet: null } },
          { id: 'r2', values: { sku: '   ', adet: null } },
          { id: 'r3', values: { sku: 'ok', adet: 1 } }
        ]
      }
    ]
  });
}

function sampleAnalysisContext(dataset = sampleDataset()) {
  return {
    analysisId: 'an-summary-1',
    dataset,
    locale: 'tr',
    currentStage: 'ozet-uretimi',
    status: 'suruyor'
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'req-summary-1',
    datasetId: 'ds-summary-001',
    locale: 'tr',
    ...overrides
  };
}

function buildRuntimeTrio(dataset) {
  const kpiResult = createKpiEngineRuntime().compute(
    createKpiContext({ dataset })
  );
  const ruleResult = createRuleEngineRuntime().compute(
    createRuleContext({
      dataset,
      kpiResults: kpiResult.kpiResults,
      kpiRuntimeResult: kpiResult
    })
  );
  const findingResult = createFindingBuilderRuntime().compute(
    createFindingContext({
      ruleResult,
      includeSkippedInfo: false
    })
  );
  return { kpiResult, ruleResult, findingResult };
}

describe('SummaryBuilderRuntime', () => {
  /** @type {ReturnType<typeof createSummaryBuilderRuntime>} */
  let builder;

  beforeEach(() => {
    builder = createSummaryBuilderRuntime();
  });

  it('seeds builtin summary sections', () => {
    assert.equal(builder.getRegistry().count(), SUMMARY_SECTION_ORDER.length);
    assert.equal(SUMMARY_SECTION_ORDER.length, 8);
    assert.equal(SUMMARY_SECTION_LABELS['kpi-summary'], 'KPI Summary');
  });

  it('builds empty analysis summary with warnings', () => {
    const result = builder.compute(createSummaryContext({}));
    assert.equal(result.sections.length, 8);
    assert.ok(result.analysisSummary.headline.includes('0 bulgu'));
    assert.ok(
      result.warnings.some((w) => w.code === 'EMPTY_ANALYSIS_INPUTS')
    );
    assert.equal(result.telemetry.kpiTotals, 0);
    assert.equal(result.telemetry.ruleTotals, 0);
    assert.equal(result.telemetry.findingTotals, 0);
  });

  it('summarizes KPI results', () => {
    const { kpiResult } = buildRuntimeTrio(sampleDataset());
    const result = builder.compute(
      createSummaryContext({ kpiResult, locale: 'tr' })
    );
    const kpiSection = result.sections.find((s) => s.id === 'kpi-summary');
    assert.ok(kpiSection);
    assert.ok(Number(kpiSection.metrics.calculatedCount) >= 1);
    assert.equal(result.telemetry.kpiTotals, kpiResult.summary.calculatedCount);
  });

  it('summarizes rule results', () => {
    const { ruleResult } = buildRuntimeTrio(sampleDataset());
    const result = builder.compute(
      createSummaryContext({ ruleResult, locale: 'tr' })
    );
    const ruleSection = result.sections.find((s) => s.id === 'rule-summary');
    assert.equal(
      ruleSection?.metrics.evaluatedCount,
      ruleResult.summary.evaluatedCount
    );
    assert.equal(result.telemetry.ruleTotals, ruleResult.summary.evaluatedCount);
  });

  it('summarizes a single finding', () => {
    const { findingResult } = buildRuntimeTrio(dirtyDataset());
    assert.ok(findingResult.summary.findingCount >= 1);
    const result = builder.compute(
      createSummaryContext({ findingResult, locale: 'tr' })
    );
    const findingSection = result.sections.find(
      (s) => s.id === 'finding-summary'
    );
    assert.equal(
      findingSection?.metrics.findingCount,
      findingResult.summary.findingCount
    );
    assert.equal(
      result.telemetry.findingTotals,
      findingResult.summary.findingCount
    );
  });

  it('summarizes multiple findings', () => {
    const { findingResult } = buildRuntimeTrio(sampleDataset({ entities: [] }));
    assert.ok(findingResult.summary.findingCount >= 2);
    const result = builder.compute(
      createSummaryContext({ findingResult, locale: 'tr' })
    );
    assert.ok(Number(result.sections.find((s) => s.id === 'finding-summary')
      ?.metrics.findingCount) >= 2);
  });

  it('computes severity distribution', () => {
    const { findingResult } = buildRuntimeTrio(sampleDataset({ entities: [] }));
    const result = builder.compute(
      createSummaryContext({ findingResult, locale: 'tr' })
    );
    const severity = result.sections.find(
      (s) => s.id === 'severity-distribution'
    );
    assert.ok(severity);
    const total =
      Number(severity.metrics.INFO ?? 0) +
      Number(severity.metrics.WARNING ?? 0) +
      Number(severity.metrics.ERROR ?? 0) +
      Number(severity.metrics.CRITICAL ?? 0);
    assert.ok(total >= findingResult.summary.findingCount);
  });

  it('computes category distribution', () => {
    const { findingResult } = buildRuntimeTrio(sampleDataset({ entities: [] }));
    const result = builder.compute(
      createSummaryContext({ findingResult, locale: 'tr' })
    );
    const category = result.sections.find(
      (s) => s.id === 'category-distribution'
    );
    assert.ok(category);
    assert.ok(
      Number(category.metrics['dataset-structure'] ?? 0) +
        Number(category.metrics.metadata ?? 0) >=
        1
    );
  });

  it('includes dataset statistics section', () => {
    const { kpiResult } = buildRuntimeTrio(sampleDataset());
    const result = builder.compute(
      createSummaryContext({
        analysisContext: sampleAnalysisContext(),
        kpiResult,
        locale: 'tr'
      })
    );
    const dataset = result.sections.find((s) => s.id === 'dataset-statistics');
    assert.equal(dataset?.metrics.entityCount, 1);
    assert.equal(dataset?.metrics.recordCount, 2);
  });

  it('includes analysis metadata section', () => {
    const result = builder.compute(
      createSummaryContext({
        analysisContext: sampleAnalysisContext(),
        locale: 'tr'
      })
    );
    const meta = result.sections.find((s) => s.id === 'analysis-metadata');
    assert.equal(meta?.metrics.analysisId, 'an-summary-1');
    assert.equal(meta?.metrics.datasetId, 'ds-summary-001');
    assert.equal(result.metadata.datasetId, 'ds-summary-001');
  });

  it('includes execution summary section', () => {
    const trio = buildRuntimeTrio(sampleDataset());
    const result = builder.compute(
      createSummaryContext({
        ...trio,
        analysisContext: sampleAnalysisContext(),
        locale: 'tr'
      })
    );
    const execution = result.sections.find((s) => s.id === 'execution-summary');
    assert.equal(execution?.metrics.sectionsBuilt, 8);
    assert.ok(Number(execution?.metrics.kpiDurationMs) >= 0);
  });

  it('returns AnalysisSummary without recommendations', () => {
    const trio = buildRuntimeTrio(dirtyDataset());
    const result = builder.compute(
      createSummaryContext({
        ...trio,
        analysisContext: sampleAnalysisContext(dirtyDataset()),
        locale: 'tr'
      })
    );
    assert.ok(result.analysisSummary.headline.length > 0);
    assert.ok(result.analysisSummary.highlights.length >= 1);
    assert.equal(result.analysisSummary.recommendations, undefined);
  });

  it('implements ISummaryBuilder.build', async () => {
    const trio = buildRuntimeTrio(dirtyDataset());
    const summary = await builder.build(
      sampleAnalysisContext(dirtyDataset()),
      trio.kpiResult.kpiResults,
      trio.findingResult.findings
    );
    assert.ok(summary.headline.includes('bulgu'));
    assert.ok(Array.isArray(summary.highlights));
  });

  it('records telemetry for duration and totals', () => {
    const trio = buildRuntimeTrio(dirtyDataset());
    const result = builder.compute(
      createSummaryContext({
        ...trio,
        analysisContext: sampleAnalysisContext(dirtyDataset()),
        locale: 'tr'
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.summarySectionCount, 8);
    assert.ok(result.telemetry.kpiTotals >= 1);
    assert.ok(result.telemetry.ruleTotals >= 1);
    assert.ok(result.telemetry.findingTotals >= 1);
  });

  it('supports registry extension and disable via unregister', () => {
    const registry = createSummaryRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'kpi-summary',
      title: 'KPI Summary',
      order: 1,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.equal(registry.unregister('kpi-summary'), true);
  });

  it('rejects duplicate registry registration', () => {
    const registry = createSummaryRegistryRuntime(true);
    assert.throws(
      () =>
        registry.register({
          id: 'kpi-summary',
          title: 'KPI Summary',
          order: 1,
          enabled: true
        }),
      /zaten kayıtlı/
    );
  });

  it('integrates with pipeline bag after KPI + Rule + Finding', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleAnalysisContext(dirtyDataset())
    });
    const detailed = await pipeline.runWithDetails(
      sampleRequest({ datasetId: dirtyDataset().id })
    );
    applyKpiEngineToPipelineResult(detailed);
    applyRuleEngineToPipelineResult(detailed);
    applyFindingBuilderToPipelineResult(detailed);
    const summaryResult = applySummaryBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.equal(summaryResult.sections.length, 8);
    assert.ok(detailed.context.bag[PIPELINE_BAG_SUMMARY_RUNTIME_RESULT_KEY]);
    assert.ok(detailed.context.bag.summary?.headline);
    assert.equal(
      readSummaryFromPipelineResult(detailed)?.telemetry.summarySectionCount,
      8
    );
    assert.ok(detailed.analysisResult.summary?.headline);
  });

  it('still produces summary when validation failed', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleAnalysisContext(
        sampleDataset({ entities: /** @type {any} */ ('broken') })
      )
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyKpiEngineToPipelineResult(detailed);
    applyRuleEngineToPipelineResult(detailed);
    applyFindingBuilderToPipelineResult(detailed);
    const summaryResult = applySummaryBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.ok(
      summaryResult.warnings.some((w) => w.code === 'VALIDATION_NOT_PASSED')
    );
    assert.ok(summaryResult.analysisSummary.headline);
  });

  it('supports attach/read bag bridge helpers', () => {
    const trio = buildRuntimeTrio(sampleDataset());
    const result = builder.compute(
      createSummaryContext({
        ...trio,
        analysisContext: sampleAnalysisContext(),
        locale: 'tr'
      })
    );
    const context = {
      request: sampleRequest(),
      analysisContext: sampleAnalysisContext(),
      stageExecutions: [],
      bag: {},
      startedAt: new Date().toISOString(),
      startedMark: 0
    };

    attachSummaryToPipelineContext(context, result);
    assert.equal(
      readSummaryFromPipelineContext(context)?.sections.length,
      8
    );
    assert.ok(context.bag.summary?.headline);

    const pipelineResult = {
      analysisResult: {
        requestId: 'x',
        datasetId: 'ds',
        status: 'basarisiz',
        lastStage: 'sonuc-derleme',
        kpiResults: [],
        findings: [],
        scores: [],
        statistics: {
          entityCount: 1,
          rowCount: 1,
          relationCount: 0,
          kpiResultCount: 0,
          findingCount: 0
        },
        warnings: []
      },
      context,
      stageExecutions: [],
      totalDurationMs: 1,
      telemetry: {
        totalDurationMs: 1,
        startedAt: context.startedAt,
        endedAt: context.startedAt,
        stageDurationsMs: {},
        stageOutcomes: {},
        summary: {
          stagesExecuted: 0,
          stagesSucceeded: 0,
          stagesNotImplemented: 0,
          stagesFailed: 0,
          stagesSkipped: 0,
          success: false,
          warningCount: 0,
          errorCount: 0
        }
      }
    };

    attachSummaryToPipelineResult(pipelineResult, result);
    assert.ok(readSummaryFromPipelineResult(pipelineResult));
  });

  it('sets sourceStages metadata from available runtime results', () => {
    const trio = buildRuntimeTrio(sampleDataset());
    const result = builder.compute(
      createSummaryContext({
        ...trio,
        analysisContext: sampleAnalysisContext(),
        locale: 'tr'
      })
    );
    assert.deepEqual(result.metadata.sourceStages, [
      'kpi-hesaplama',
      'kural-degerlendirme',
      'bulgu-uretimi'
    ]);
  });

  it('exposes SummaryResult record sections and metadata', () => {
    const trio = buildRuntimeTrio(dirtyDataset());
    const result = builder.compute(
      createSummaryContext({
        ...trio,
        analysisContext: sampleAnalysisContext(dirtyDataset()),
        locale: 'tr'
      })
    );
    assert.equal(result.record.sections.length, 8);
    assert.equal(result.record.analysisSummary.headline, result.analysisSummary.headline);
    assert.ok(result.metadata.generatedAt);
  });
});
