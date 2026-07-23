/**
 * Analysis Pipeline Runtime — PR-102A (en az 10 unit test)
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(
  pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href
);

const {
  ANALYSIS_PIPELINE_STAGE_COUNT,
  ANALYSIS_PIPELINE_STAGES,
  ANALYSIS_RUNTIME_ERROR_CODES,
  createAnalysisPipelineRuntime
} = await import('../../src/business/analysis/index.ts');

function sampleRequest(overrides = {}) {
  return {
    id: 'analysis-test-001',
    datasetId: 'ds-001',
    locale: 'tr',
    reportId: 'report-1',
    ...overrides
  };
}

function sampleDataset(overrides = {}) {
  return {
    id: 'ds-001',
    metadata: {
      id: 'ds-001',
      title: 'Satış Dataset',
      locale: 'tr',
      createdAt: '2026-07-20T09:00:00.000Z'
    },
    version: {
      schemaVersion: '1.0.0',
      revision: '1',
      effectiveAt: '2026-07-20T09:00:00.000Z'
    },
    source: {
      type: 'csv',
      label: 'satis.csv'
    },
    entities: [
      {
        id: 'ent-1',
        entityType: 'urun',
        name: 'Ürünler',
        layout: 'tablo',
        columns: [{ id: 'sku', name: 'SKU', dataType: 'metin' }],
        rows: [{ id: 'row-1', values: { sku: 'A1' } }]
      }
    ],
    relations: [],
    ...overrides
  };
}

function sampleContext(overrides = {}) {
  return {
    analysisId: 'analysis-ctx-001',
    dataset: sampleDataset(),
    locale: 'tr',
    currentStage: 'dataset-dogrulama',
    status: 'bekliyor',
    metadata: { tenant: 'demo' },
    ...overrides
  };
}

describe('AnalysisPipelineRuntime', () => {
  it('runs all foundation stages in order for a valid dataset', async () => {
    const runtime = createAnalysisPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, ANALYSIS_PIPELINE_STAGE_COUNT);
    assert.deepEqual(
      detailed.stageExecutions.map((stage) => stage.stageId),
      ANALYSIS_PIPELINE_STAGES.map((stage) => stage.id)
    );
  });

  it('implements IAnalysisPipeline.run returning AnalysisResult', async () => {
    const runtime = createAnalysisPipelineRuntime({
      initialContext: sampleContext()
    });

    const result = await runtime.run(sampleRequest());

    assert.equal(result.requestId, 'analysis-test-001');
    assert.equal(result.datasetId, 'ds-001');
    assert.equal(result.lastStage, 'sonuc-derleme');
    assert.ok(result.completedAt);
  });

  it('executes dataset validation for a valid dataset', async () => {
    const runtime = createAnalysisPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const validationStage = detailed.stageExecutions[0];

    assert.equal(validationStage.stageId, 'dataset-dogrulama');
    assert.equal(validationStage.outcome, 'basarili');
    assert.equal(detailed.context.analysisContext.dataset.validation?.isValid, true);
    assert.equal(
      detailed.context.analysisContext.dataset.validation?.counts.error,
      0
    );
  });

  it('marks placeholder stages as not-implemented and still assembles a result', async () => {
    const runtime = createAnalysisPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const placeholderStages = detailed.stageExecutions.filter((stage) =>
      [
        'kpi-hesaplama',
        'kural-degerlendirme',
        'bulgu-uretimi',
        'ozet-uretimi'
      ].includes(stage.stageId)
    );

    assert.equal(placeholderStages.length, 4);
    assert.ok(
      placeholderStages.every((stage) => stage.outcome === 'not-implemented')
    );
    assert.ok(
      placeholderStages.every((stage) =>
        stage.errors.some(
          (error) => error.code === ANALYSIS_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED
        )
      )
    );
    assert.equal(detailed.stageExecutions.at(-1)?.stageId, 'sonuc-derleme');
    assert.equal(detailed.stageExecutions.at(-1)?.outcome, 'basarili');
    assert.equal(detailed.analysisResult.status, 'basarisiz');
  });

  it('halts after dataset validation failure and skips intermediate stages', async () => {
    const runtime = createAnalysisPipelineRuntime({
      initialContext: sampleContext({
        dataset: sampleDataset({ entities: /** @type {any} */ ('broken') })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.deepEqual(
      detailed.stageExecutions.slice(1).map((stage) => stage.outcome),
      ['atlandi', 'atlandi', 'atlandi', 'atlandi', 'basarili']
    );
    assert.equal(detailed.analysisResult.status, 'basarisiz');
  });

  it('fails validation when request datasetId and context dataset.id mismatch', async () => {
    const runtime = createAnalysisPipelineRuntime({
      initialContext: sampleContext({
        dataset: sampleDataset({ id: 'ds-other' })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === ANALYSIS_RUNTIME_ERROR_CODES.DATASET_ID_MISMATCH
      )
    );
  });

  it('records telemetry for total duration, stage durations, outcomes, and summary', async () => {
    const runtime = createAnalysisPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.ok(detailed.totalDurationMs >= 0);
    assert.ok(detailed.telemetry.totalDurationMs >= 0);
    assert.equal(
      detailed.telemetry.stageOutcomes['dataset-dogrulama'],
      'basarili'
    );
    assert.equal(
      detailed.telemetry.stageOutcomes['sonuc-derleme'],
      'basarili'
    );
    assert.ok(detailed.telemetry.stageDurationsMs['dataset-dogrulama'] >= 0);
    assert.equal(detailed.telemetry.summary.stagesExecuted, 6);
    assert.equal(detailed.telemetry.summary.stagesNotImplemented, 4);
    assert.equal(detailed.telemetry.summary.success, false);
  });

  it('fails request validation before the full stage loop when id is missing', async () => {
    const runtime = createAnalysisPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest({ id: '' }));

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === ANALYSIS_RUNTIME_ERROR_CODES.INVALID_REQUEST
      )
    );
  });

  it('returns a structured failure when no context source is available', async () => {
    const runtime = createAnalysisPipelineRuntime();

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) =>
          error.code === ANALYSIS_RUNTIME_ERROR_CODES.CONTEXT_NOT_AVAILABLE
      )
    );
  });

  it('uses a resolver for run(request) when context is not preloaded', async () => {
    const runtime = createAnalysisPipelineRuntime({
      contextResolver: async (request) =>
        sampleContext({
          analysisId: `${request.id}-resolved`
        })
    });

    const result = await runtime.run(sampleRequest());

    assert.equal(result.requestId, 'analysis-test-001');
    assert.equal(result.statistics.entityCount, 1);
  });

  it('preserves validation warnings without failing the dataset stage', async () => {
    const runtime = createAnalysisPipelineRuntime({
      initialContext: sampleContext({
        dataset: sampleDataset({
          entities: [
            {
              id: 'ent-1',
              entityType: 'urun',
              name: 'Ürünler',
              layout: 'tablo',
              columns: [],
              rows: []
            }
          ]
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
    assert.equal(
      detailed.context.analysisContext.dataset.validation?.counts.warning,
      1
    );
    assert.ok(
      detailed.analysisResult.warnings.some(
        (warning) => warning.code === 'ENTITY_EMPTY_ROWS'
      )
    );
  });

  it('prefers explicit context over the preloaded initial context', async () => {
    const runtime = createAnalysisPipelineRuntime({
      initialContext: sampleContext({
        dataset: sampleDataset({ id: 'ds-initial' })
      })
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({ datasetId: 'ds-explicit' }),
      sampleContext({
        dataset: sampleDataset({ id: 'ds-explicit' })
      })
    );

    assert.equal(detailed.context.analysisContext.dataset.id, 'ds-explicit');
    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
  });
});
