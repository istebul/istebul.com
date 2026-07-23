/**
 * KPI Engine Runtime — PR-102B (en az 20 unit test)
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
  createKpiEngineRuntime,
  createKpiRegistryRuntime,
  createKpiContext,
  createAnalysisPipelineRuntime,
  applyKpiEngineToPipelineResult,
  attachKpiToPipelineContext,
  readKpiFromPipelineContext,
  attachKpiToPipelineResult,
  readKpiFromPipelineResult,
  BUILTIN_KPI_DEFINITION_COUNT,
  BUILTIN_KPI_DEFINITIONS,
  getBuiltinKpiDefinition,
  computeDatasetFieldStats,
  PIPELINE_BAG_KPI_RUNTIME_RESULT_KEY,
  KPI_CATEGORY_LABELS
} = await import('../../src/business/analysis/index.ts');

function sampleDataset(overrides = {}) {
  return {
    id: 'ds-kpi-001',
    metadata: {
      id: 'ds-kpi-001',
      title: 'KPI Dataset',
      locale: 'tr',
      createdAt: '2026-07-20T10:00:00.000Z'
    },
    version: {
      schemaVersion: '1.0.0',
      revision: '3',
      effectiveAt: '2026-07-20T10:00:00.000Z'
    },
    source: {
      type: 'csv',
      label: 'kpi.csv'
    },
    entities: [
      {
        id: 'ent-urun',
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
          { id: 'r2', values: { sku: '', adet: null } },
          { id: 'r3', values: { sku: '   ', adet: 2 } }
        ]
      }
    ],
    relations: [],
    ...overrides
  };
}

function sampleContext(dataset = sampleDataset()) {
  return {
    analysisId: 'an-kpi-1',
    dataset,
    locale: 'tr',
    currentStage: 'kpi-hesaplama',
    status: 'suruyor'
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'req-kpi-1',
    datasetId: 'ds-kpi-001',
    locale: 'tr',
    ...overrides
  };
}

describe('KpiEngineRuntime', () => {
  /** @type {ReturnType<typeof createKpiEngineRuntime>} */
  let engine;

  beforeEach(() => {
    engine = createKpiEngineRuntime();
  });

  it('seeds builtin KPI definitions', () => {
    assert.equal(engine.getRegistry().count(), BUILTIN_KPI_DEFINITION_COUNT);
    assert.equal(BUILTIN_KPI_DEFINITION_COUNT, 12);
    assert.ok(getBuiltinKpiDefinition('entity-count'));
    assert.equal(KPI_CATEGORY_LABELS['data-quality'], 'Data Quality');
  });

  it('calculates dataset metrics for a single entity', () => {
    const result = engine.compute(
      createKpiContext({ dataset: sampleDataset() })
    );
    const byId = Object.fromEntries(
      result.kpiResults.map((item) => [item.kpiId, item.value])
    );

    assert.equal(byId['entity-count'], 1);
    assert.equal(byId['record-count'], 3);
    assert.equal(byId['column-count'], 2);
    assert.equal(byId['total-field-count'], 6);
  });

  it('calculates empty and null quality metrics', () => {
    const result = engine.compute(
      createKpiContext({ dataset: sampleDataset() })
    );
    const byId = Object.fromEntries(
      result.kpiResults.map((item) => [item.kpiId, item.value])
    );

    // empty: sku '' and sku '   ' => 2
    assert.equal(byId['empty-value-count'], 2);
    // null: adet null on r2 => 1
    assert.equal(byId['null-value-count'], 1);
    assert.equal(byId['empty-value-ratio'], 0.3333);
    assert.equal(byId['filled-value-ratio'], 0.5);
  });

  it('calculates structure averages', () => {
    const result = engine.compute(
      createKpiContext({ dataset: sampleDataset() })
    );
    const byId = Object.fromEntries(
      result.kpiResults.map((item) => [item.kpiId, item.value])
    );

    assert.equal(byId['average-column-count'], 2);
    assert.equal(byId['average-record-width'], 2);
  });

  it('exposes metadata KPIs for version and entity names', () => {
    const result = engine.compute(
      createKpiContext({ dataset: sampleDataset() })
    );
    const byId = Object.fromEntries(
      result.kpiResults.map((item) => [item.kpiId, item.value])
    );

    assert.equal(byId['dataset-version'], '1.0.0:3');
    assert.equal(byId['entity-names'], 'Ürünler');
  });

  it('supports empty dataset', () => {
    const result = engine.compute(
      createKpiContext({
        dataset: sampleDataset({ entities: [] })
      })
    );

    assert.equal(result.summary.success, true);
    assert.ok(result.warnings.some((w) => w.code === 'EMPTY_DATASET'));
    const byId = Object.fromEntries(
      result.kpiResults.map((item) => [item.kpiId, item.value])
    );
    assert.equal(byId['entity-count'], 0);
    assert.equal(byId['record-count'], 0);
    assert.equal(byId['total-field-count'], 0);
    assert.equal(byId['empty-value-ratio'], 0);
    assert.equal(byId['filled-value-ratio'], 0);
    assert.equal(byId['entity-names'], '');
  });

  it('supports multiple entities', () => {
    const dataset = sampleDataset({
      entities: [
        {
          id: 'ent-a',
          entityType: 'urun',
          name: 'A',
          layout: 'tablo',
          columns: [
            { id: 'x', name: 'X', dataType: 'metin', required: true, order: 1 }
          ],
          rows: [{ id: '1', values: { x: 'v' } }]
        },
        {
          id: 'ent-b',
          entityType: 'stok',
          name: 'B',
          layout: 'tablo',
          columns: [
            { id: 'y', name: 'Y', dataType: 'sayi', required: false, order: 1 },
            { id: 'z', name: 'Z', dataType: 'sayi', required: false, order: 2 }
          ],
          rows: [
            { id: '1', values: { y: 1, z: null } },
            { id: '2', values: { y: '', z: 3 } }
          ]
        }
      ]
    });

    const result = engine.compute(createKpiContext({ dataset }));
    const byId = Object.fromEntries(
      result.kpiResults.map((item) => [item.kpiId, item.value])
    );

    assert.equal(byId['entity-count'], 2);
    assert.equal(byId['record-count'], 3);
    assert.equal(byId['column-count'], 3);
    // ent-a: 1*1=1, ent-b: 2*2=4 => 5
    assert.equal(byId['total-field-count'], 5);
    assert.equal(byId['null-value-count'], 1);
    assert.equal(byId['empty-value-count'], 1);
    assert.equal(byId['average-column-count'], 1.5);
    assert.equal(byId['entity-names'], 'A, B');
  });

  it('treats blank strings as empty values', () => {
    const stats = computeDatasetFieldStats(
      sampleDataset({
        entities: [
          {
            id: 'e1',
            entityType: 'urun',
            name: 'E',
            layout: 'tablo',
            columns: [
              {
                id: 'c1',
                name: 'C1',
                dataType: 'metin',
                required: false,
                order: 1
              }
            ],
            rows: [
              { id: 'r1', values: { c1: '' } },
              { id: 'r2', values: { c1: '  ' } },
              { id: 'r3', values: { c1: 'ok' } }
            ]
          }
        ]
      })
    );

    assert.equal(stats.emptyValueCount, 2);
    assert.equal(stats.filledValueCount, 1);
    assert.equal(stats.nullValueCount, 0);
  });

  it('counts null cells separately from empty strings', () => {
    const stats = computeDatasetFieldStats(
      sampleDataset({
        entities: [
          {
            id: 'e1',
            entityType: 'urun',
            name: 'E',
            layout: 'tablo',
            columns: [
              {
                id: 'c1',
                name: 'C1',
                dataType: 'metin',
                required: false,
                order: 1
              }
            ],
            rows: [
              { id: 'r1', values: { c1: null } },
              { id: 'r2', values: {} }
            ]
          }
        ]
      })
    );

    assert.equal(stats.nullValueCount, 2);
    assert.equal(stats.emptyValueCount, 0);
  });

  it('implements IKPIEngine.calculate', async () => {
    const results = await engine.calculate(
      sampleContext(),
      sampleDataset(),
      ['entity-count', 'record-count']
    );

    assert.equal(results.length, 2);
    assert.equal(results[0].kpiId, 'entity-count');
    assert.equal(results[0].value, 1);
    assert.equal(results[1].value, 3);
  });

  it('filters by requested kpiIds', () => {
    const result = engine.compute(
      createKpiContext({
        dataset: sampleDataset(),
        kpiIds: ['entity-count', 'dataset-version']
      })
    );

    assert.equal(result.summary.requestedCount, 2);
    assert.equal(result.kpiResults.length, 2);
    assert.deepEqual(
      result.kpiResults.map((item) => item.kpiId),
      ['entity-count', 'dataset-version']
    );
  });

  it('warns for unknown kpi ids', () => {
    const result = engine.compute(
      createKpiContext({
        dataset: sampleDataset(),
        kpiIds: ['entity-count', 'unknown-kpi']
      })
    );

    assert.equal(result.summary.unavailableCount, 1);
    assert.ok(
      result.warnings.some(
        (warning) =>
          warning.code === 'KPI_NOT_REGISTERED' &&
          warning.kpiId === 'unknown-kpi'
      )
    );
    assert.equal(
      result.kpiResults.find((item) => item.kpiId === 'unknown-kpi')?.value,
      null
    );
  });

  it('records telemetry duration, counts, and dataset size', () => {
    const result = engine.compute(
      createKpiContext({ dataset: sampleDataset() })
    );

    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.calculatedKpiCount, 12);
    assert.equal(result.telemetry.datasetSize.entityCount, 1);
    assert.equal(result.telemetry.datasetSize.recordCount, 3);
    assert.equal(result.telemetry.datasetSize.columnCount, 2);
    assert.equal(result.telemetry.datasetSize.totalFieldCount, 6);
    assert.equal(result.telemetry.warningCount, result.warnings.length);
  });

  it('returns execution summary with calculated KPIs', () => {
    const result = engine.compute(
      createKpiContext({ dataset: sampleDataset() })
    );

    assert.equal(result.summary.calculatedCount, 12);
    assert.equal(result.summary.requestedCount, 12);
    assert.equal(result.summary.unavailableCount, 0);
    assert.equal(result.summary.success, true);
    assert.equal(result.calculations.length, 12);
  });

  it('fails gracefully when dataset is missing', () => {
    const result = engine.compute(
      createKpiContext({
        dataset: /** @type {any} */ (null)
      })
    );

    assert.equal(result.summary.success, false);
    assert.ok(result.warnings.some((w) => w.code === 'DATASET_MISSING'));
  });

  it('allows registry extension and lookup', () => {
    const registry = createKpiRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'custom-kpi',
      name: 'Custom',
      description: 'Custom KPI',
      category: 'dataset-metrics',
      unit: 'adet',
      calculationType: 'adet',
      order: 99
    });
    assert.equal(registry.count(), 1);
    assert.equal(registry.getById('custom-kpi')?.name, 'Custom');
    assert.equal(registry.getByCategory('dataset-metrics').length, 1);
    assert.equal(registry.unregister('custom-kpi'), true);
    assert.equal(registry.count(), 0);
  });

  it('rejects duplicate registry registration', () => {
    const registry = createKpiRegistryRuntime(true);
    assert.throws(
      () => registry.register(BUILTIN_KPI_DEFINITIONS[0]),
      /zaten kayıtlı/
    );
  });

  it('integrates with analysis pipeline after successful validation', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    assert.equal(
      detailed.context.bag.datasetValidation?.isValid,
      true
    );

    const kpiResult = applyKpiEngineToPipelineResult(detailed, engine);

    assert.equal(kpiResult.summary.success, true);
    assert.ok(detailed.context.bag.kpiResults?.length >= 12);
    assert.equal(
      readKpiFromPipelineResult(detailed)?.telemetry.calculatedKpiCount,
      12
    );
    assert.equal(detailed.analysisResult.statistics.kpiResultCount, 12);
    assert.ok(detailed.analysisResult.kpiResults.length >= 12);
  });

  it('skips KPI calculation when dataset validation failed', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleContext(
        sampleDataset({ entities: /** @type {any} */ ('broken') })
      )
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    assert.equal(
      detailed.context.bag.datasetValidation?.isValid,
      false
    );

    const kpiResult = applyKpiEngineToPipelineResult(detailed, engine);
    assert.equal(kpiResult.summary.success, false);
    assert.ok(
      kpiResult.warnings.some((w) => w.code === 'VALIDATION_NOT_PASSED')
    );
    assert.equal(detailed.context.bag.kpiResults?.length ?? 0, 0);
  });

  it('supports attach/read bag bridge helpers', () => {
    const context = {
      request: sampleRequest(),
      analysisContext: sampleContext(),
      stageExecutions: [],
      bag: {},
      startedAt: new Date().toISOString(),
      startedMark: 0
    };
    const result = engine.compute(
      createKpiContext({ dataset: sampleDataset() })
    );

    attachKpiToPipelineContext(context, result);
    assert.equal(
      context.bag[PIPELINE_BAG_KPI_RUNTIME_RESULT_KEY],
      result
    );
    assert.equal(readKpiFromPipelineContext(context)?.summary.calculatedCount, 12);
    assert.equal(context.bag.kpiResults?.length, 12);

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

    attachKpiToPipelineResult(pipelineResult, result);
    assert.equal(readKpiFromPipelineResult(pipelineResult)?.summary.success, true);
  });

  it('honors request kpiIds when integrating with pipeline', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleContext()
    });
    const detailed = await pipeline.runWithDetails(
      sampleRequest({ kpiIds: ['entity-count', 'record-count'] })
    );
    const kpiResult = applyKpiEngineToPipelineResult(detailed, engine);

    assert.equal(kpiResult.summary.requestedCount, 2);
    assert.deepEqual(
      kpiResult.kpiResults.map((item) => item.kpiId),
      ['entity-count', 'record-count']
    );
  });

  it('warns when dataset version metadata is missing', () => {
    const result = engine.compute(
      createKpiContext({
        dataset: sampleDataset({
          version: {
            schemaVersion: '',
            revision: '',
            effectiveAt: '2026-07-20T10:00:00.000Z'
          }
        }),
        kpiIds: ['dataset-version']
      })
    );

    assert.equal(result.kpiResults[0].value, null);
    assert.ok(
      result.warnings.some((w) => w.code === 'METADATA_VERSION_MISSING')
    );
  });
});
