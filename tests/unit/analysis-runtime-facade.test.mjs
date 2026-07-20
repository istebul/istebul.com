/**
 * Analysis Runtime Facade — PR-102F (en az 10 unit test)
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
  createAnalysisRuntimeFacade,
  createAnalysisPipelineRunner,
  createAnalysisExecutionContext,
  resolveAnalysisContext,
  ensureRequestDatasetId,
  createSkippedStageExecution,
  createStageExecution,
  replaceStageExecution,
  buildAnalysisExecutionTelemetry
} = await import('../../src/business/analysis/integration/runtime/index.ts');

function sampleDataset(overrides = {}) {
  return {
    id: 'ds-facade-001',
    metadata: {
      id: 'ds-facade-001',
      title: 'Facade Dataset',
      locale: 'tr',
      createdAt: '2026-07-20T14:00:00.000Z'
    },
    version: {
      schemaVersion: '1.0.0',
      revision: '1',
      effectiveAt: '2026-07-20T14:00:00.000Z'
    },
    source: { type: 'csv', label: 'facade.csv' },
    entities: [
      {
        id: 'ent-1',
        entityType: 'urun',
        name: 'Ürünler',
        layout: 'tablo',
        columns: [
          { id: 'sku', name: 'SKU', dataType: 'metin', required: true, order: 1 }
        ],
        rows: [{ id: 'r1', values: { sku: 'A1' } }]
      }
    ],
    relations: [],
    ...overrides
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'req-facade-1',
    datasetId: 'ds-facade-001',
    locale: 'tr',
    ...overrides
  };
}

describe('AnalysisRuntimeFacade — unit', () => {
  it('createAnalysisRuntimeFacade fabrika', () => {
    const facade = createAnalysisRuntimeFacade();
    assert.ok(facade);
    assert.equal(typeof facade.execute, 'function');
    assert.equal(typeof facade.run, 'function');
  });

  it('createAnalysisPipelineRunner fabrika', () => {
    const runner = createAnalysisPipelineRunner();
    assert.ok(runner);
    assert.equal(typeof runner.execute, 'function');
  });

  it('createAnalysisExecutionContext — request korunur', () => {
    const ctx = createAnalysisExecutionContext({
      request: sampleRequest(),
      dataset: sampleDataset(),
      locale: 'en',
      kpiIds: ['entity-count']
    });
    assert.equal(ctx.request.id, 'req-facade-1');
    assert.equal(ctx.locale, 'en');
    assert.deepEqual(ctx.kpiIds, ['entity-count']);
  });

  it('resolveAnalysisContext — dataset üzerinden üretir', () => {
    const ctx = resolveAnalysisContext(
      createAnalysisExecutionContext({
        request: sampleRequest(),
        dataset: sampleDataset()
      })
    );
    assert.equal(ctx.analysisId, 'req-facade-1');
    assert.equal(ctx.dataset.id, 'ds-facade-001');
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.currentStage, 'dataset-dogrulama');
    assert.equal(ctx.status, 'bekliyor');
  });

  it('resolveAnalysisContext — analysisContext varsa birleştirir', () => {
    const ctx = resolveAnalysisContext(
      createAnalysisExecutionContext({
        request: sampleRequest({ reportId: 'rep-1' }),
        analysisContext: {
          analysisId: 'an-existing',
          dataset: sampleDataset(),
          locale: 'tr',
          currentStage: 'kpi-hesaplama',
          status: 'suruyor'
        },
        locale: 'en',
        kpiIds: ['row-count']
      })
    );
    assert.equal(ctx.analysisId, 'an-existing');
    assert.equal(ctx.locale, 'en');
    assert.deepEqual(ctx.kpiIds, ['row-count']);
    assert.equal(ctx.reportId, 'rep-1');
    assert.equal(ctx.currentStage, 'dataset-dogrulama');
  });

  it('resolveAnalysisContext — dataset yoksa hata', () => {
    assert.throws(
      () =>
        resolveAnalysisContext(
          createAnalysisExecutionContext({
            request: sampleRequest()
          })
        ),
      /dataset veya analysisContext zorunludur/
    );
  });

  it('ensureRequestDatasetId — boş datasetId doldurur', () => {
    const request = ensureRequestDatasetId(
      sampleRequest({ datasetId: '' }),
      sampleDataset()
    );
    assert.equal(request.datasetId, 'ds-facade-001');
  });

  it('ensureRequestDatasetId — mevcut datasetId korunur', () => {
    const request = ensureRequestDatasetId(
      sampleRequest({ datasetId: 'keep-me' }),
      sampleDataset()
    );
    assert.equal(request.datasetId, 'keep-me');
  });

  it('createSkippedStageExecution — atlandi outcome', () => {
    const stage = createSkippedStageExecution(
      'kpi-hesaplama',
      'KPI Calculation',
      'skipped for test'
    );
    assert.equal(stage.stageId, 'kpi-hesaplama');
    assert.equal(stage.outcome, 'atlandi');
    assert.equal(stage.detail, 'skipped for test');
    assert.ok(typeof stage.durationMs === 'number');
  });

  it('createStageExecution — basarili outcome', () => {
    const stage = createStageExecution(
      'ozet-uretimi',
      'Summary Generation',
      'basarili',
      'ok'
    );
    assert.equal(stage.outcome, 'basarili');
    assert.equal(stage.errors.length, 0);
  });

  it('replaceStageExecution — mevcut aşamayı değiştirir', () => {
    const context = {
      stageExecutions: [
        createStageExecution(
          'kpi-hesaplama',
          'KPI Calculation',
          'not-implemented',
          'placeholder'
        )
      ]
    };
    replaceStageExecution(
      context,
      createStageExecution(
        'kpi-hesaplama',
        'KPI Calculation',
        'basarili',
        'done'
      )
    );
    assert.equal(context.stageExecutions.length, 1);
    assert.equal(context.stageExecutions[0].outcome, 'basarili');
  });

  it('buildAnalysisExecutionTelemetry — sayaçlar ve süreler', () => {
    const context = {
      stageExecutions: [
        {
          stageId: 'dataset-dogrulama',
          stageName: 'Dataset Validation',
          outcome: 'basarili',
          startedAt: '2026-07-20T14:00:00.000Z',
          endedAt: '2026-07-20T14:00:01.000Z',
          durationMs: 12,
          errors: [],
          warnings: [{ code: 'W1', message: 'warn' }]
        },
        {
          stageId: 'kpi-hesaplama',
          stageName: 'KPI Calculation',
          outcome: 'basarisiz',
          startedAt: '2026-07-20T14:00:01.000Z',
          endedAt: '2026-07-20T14:00:02.000Z',
          durationMs: 8,
          errors: [{ code: 'E1', message: 'fail' }],
          warnings: []
        },
        {
          stageId: 'kural-degerlendirme',
          stageName: 'Rule Evaluation',
          outcome: 'atlandi',
          startedAt: '2026-07-20T14:00:02.000Z',
          endedAt: '2026-07-20T14:00:02.000Z',
          durationMs: 0,
          errors: [],
          warnings: []
        }
      ]
    };
    const telemetry = buildAnalysisExecutionTelemetry(
      context,
      '2026-07-20T14:00:00.000Z',
      '2026-07-20T14:00:03.000Z',
      30,
      {
        kpiCount: 2,
        ruleCount: 0,
        findingCount: 0,
        summarySectionCount: 0
      }
    );
    assert.equal(telemetry.totalDurationMs, 30);
    assert.equal(telemetry.summary.stagesSucceeded, 1);
    assert.equal(telemetry.summary.stagesFailed, 1);
    assert.equal(telemetry.summary.stagesSkipped, 1);
    assert.equal(telemetry.summary.success, false);
    assert.equal(telemetry.summary.kpiCount, 2);
    assert.equal(telemetry.summary.warningCount, 1);
    assert.equal(telemetry.summary.errorCount, 1);
    assert.equal(telemetry.stageDurationsMs['dataset-dogrulama'], 12);
    assert.equal(telemetry.stageOutcomes['kpi-hesaplama'], 'basarisiz');
  });
});
