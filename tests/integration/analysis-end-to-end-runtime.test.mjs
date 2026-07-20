/**
 * End-to-End Analysis Runtime — PR-102F (en az 15 entegrasyon testi)
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
  createAnalysisRuntimeFacade,
  createAnalysisPipelineRunner,
  createAnalysisExecutionContext,
  SUMMARY_SECTION_ORDER
} = await import('../../src/business/analysis/index.ts');

function sampleDataset(overrides = {}) {
  return {
    id: 'ds-e2e-001',
    metadata: {
      id: 'ds-e2e-001',
      title: 'E2E Dataset',
      locale: 'tr',
      createdAt: '2026-07-20T15:00:00.000Z'
    },
    version: {
      schemaVersion: '1.0.0',
      revision: '1',
      effectiveAt: '2026-07-20T15:00:00.000Z'
    },
    source: { type: 'csv', label: 'e2e.csv' },
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
    id: 'ds-e2e-dirty',
    metadata: {
      id: 'ds-e2e-dirty',
      title: 'Dirty E2E',
      locale: 'tr',
      createdAt: '2026-07-20T15:00:00.000Z'
    },
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

function multiEntityDataset() {
  return sampleDataset({
    id: 'ds-e2e-multi',
    metadata: {
      id: 'ds-e2e-multi',
      title: 'Multi Entity',
      locale: 'tr',
      createdAt: '2026-07-20T15:00:00.000Z'
    },
    entities: [
      {
        id: 'ent-1',
        entityType: 'urun',
        name: 'Ürünler',
        layout: 'tablo',
        columns: [
          { id: 'sku', name: 'SKU', dataType: 'metin', required: true, order: 1 }
        ],
        rows: [
          { id: 'r1', values: { sku: 'A1' } },
          { id: 'r2', values: { sku: 'A2' } }
        ]
      },
      {
        id: 'ent-2',
        entityType: 'musteri',
        name: 'Müşteriler',
        layout: 'tablo',
        columns: [
          {
            id: 'ad',
            name: 'Ad',
            dataType: 'metin',
            required: true,
            order: 1
          }
        ],
        rows: [{ id: 'c1', values: { ad: 'Ali' } }]
      }
    ]
  });
}

function sampleRequest(overrides = {}) {
  return {
    id: 'req-e2e-1',
    datasetId: 'ds-e2e-001',
    locale: 'tr',
    ...overrides
  };
}

function outcomeOf(result, stageId) {
  return result.stageExecutions.find((s) => s.stageId === stageId)?.outcome;
}

describe('AnalysisRuntimeFacade — integration', () => {
  /** @type {ReturnType<typeof createAnalysisRuntimeFacade>} */
  let facade;

  beforeEach(() => {
    facade = createAnalysisRuntimeFacade();
  });

  it('geçerli BusinessDataset — uçtan uca başarılı', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest(),
        dataset: sampleDataset()
      })
    );
    assert.equal(result.analysisResult.status, 'basarili');
    assert.ok(result.kpiResult?.summary.success);
    assert.ok(result.ruleResult);
    assert.ok(result.findingResult);
    assert.ok(result.summaryResult);
    assert.equal(outcomeOf(result, 'dataset-dogrulama'), 'basarili');
    assert.equal(outcomeOf(result, 'kpi-hesaplama'), 'basarili');
    assert.equal(outcomeOf(result, 'kural-degerlendirme'), 'basarili');
    assert.equal(outcomeOf(result, 'bulgu-uretimi'), 'basarili');
    assert.equal(outcomeOf(result, 'ozet-uretimi'), 'basarili');
    assert.equal(outcomeOf(result, 'sonuc-derleme'), 'basarili');
  });

  it('validation hatası — pipeline durur, downstream atlanır', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest(),
        dataset: sampleDataset({ entities: 'broken' })
      })
    );
    assert.equal(result.analysisResult.status, 'basarisiz');
    assert.equal(outcomeOf(result, 'dataset-dogrulama'), 'basarisiz');
    assert.equal(outcomeOf(result, 'kpi-hesaplama'), 'atlandi');
    assert.equal(outcomeOf(result, 'kural-degerlendirme'), 'atlandi');
    assert.equal(outcomeOf(result, 'bulgu-uretimi'), 'atlandi');
    assert.equal(outcomeOf(result, 'ozet-uretimi'), 'atlandi');
    assert.equal(result.kpiResult, undefined);
  });

  it('boş dataset — entities [] ile başarılı analiz', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({ id: 'req-empty', datasetId: 'ds-e2e-001' }),
        dataset: sampleDataset({ entities: [] })
      })
    );
    assert.equal(result.analysisResult.status, 'basarili');
    assert.equal(outcomeOf(result, 'dataset-dogrulama'), 'basarili');
    assert.ok(result.kpiResult);
    assert.ok(result.summaryResult);
  });

  it('tek entity — KPI ve summary üretir', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({ id: 'req-single' }),
        dataset: sampleDataset()
      })
    );
    assert.equal(result.analysisResult.status, 'basarili');
    assert.ok((result.kpiResult?.summary.calculatedCount ?? 0) > 0);
    assert.equal(result.analysisResult.statistics.entityCount, 1);
  });

  it('çok entity — entityCount telemetrisi', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({
          id: 'req-multi',
          datasetId: 'ds-e2e-multi'
        }),
        dataset: multiEntityDataset()
      })
    );
    assert.equal(result.analysisResult.status, 'basarili');
    assert.equal(result.analysisResult.statistics.entityCount, 2);
    assert.ok((result.kpiResult?.summary.calculatedCount ?? 0) > 0);
  });

  it('rule trigger — dirty dataset tetikleme üretir', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({
          id: 'req-trigger',
          datasetId: 'ds-e2e-dirty'
        }),
        dataset: dirtyDataset()
      })
    );
    assert.equal(result.analysisResult.status, 'basarili');
    assert.ok((result.ruleResult?.summary.triggeredCount ?? 0) > 0);
    assert.ok((result.ruleResult?.triggeredRules.length ?? 0) > 0);
  });

  it('finding üretimi — triggered kurallardan finding', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({
          id: 'req-finding',
          datasetId: 'ds-e2e-dirty'
        }),
        dataset: dirtyDataset()
      })
    );
    assert.ok((result.findingResult?.summary.findingCount ?? 0) > 0);
    assert.ok(result.analysisResult.findings.length > 0);
  });

  it('summary üretimi — bölümler ve AnalysisSummary', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({ id: 'req-summary' }),
        dataset: sampleDataset()
      })
    );
    assert.ok(result.summaryResult);
    assert.ok(result.summaryResult.sections.length >= SUMMARY_SECTION_ORDER.length);
    assert.ok(result.analysisResult.summary);
    assert.ok(result.analysisResult.summary.headline);
  });

  it('pipeline telemetry — toplam süre ve stage sonuçları', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({ id: 'req-telemetry' }),
        dataset: sampleDataset()
      })
    );
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(
      result.telemetry.stageOutcomes['dataset-dogrulama'],
      'basarili'
    );
    assert.equal(result.telemetry.stageOutcomes['kpi-hesaplama'], 'basarili');
    assert.equal(result.telemetry.summary.stagesNotImplemented, 0);
    assert.equal(result.telemetry.summary.success, true);
    assert.ok(result.telemetry.summary.kpiCount > 0);
    assert.ok(result.telemetry.summary.ruleCount > 0);
    assert.ok(result.telemetry.summary.summarySectionCount > 0);
  });

  it('KPI başarısız — rule/finding/summary SKIPPED', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({ id: 'req-kpi-fail' }),
        dataset: sampleDataset(),
        kpiIds: ['kpi-does-not-exist']
      })
    );
    assert.equal(result.analysisResult.status, 'basarisiz');
    assert.equal(outcomeOf(result, 'kpi-hesaplama'), 'basarisiz');
    assert.equal(outcomeOf(result, 'kural-degerlendirme'), 'atlandi');
    assert.equal(outcomeOf(result, 'bulgu-uretimi'), 'atlandi');
    assert.equal(outcomeOf(result, 'ozet-uretimi'), 'atlandi');
    assert.equal(result.ruleResult, undefined);
    assert.equal(result.findingResult, undefined);
    assert.equal(result.summaryResult, undefined);
  });

  it('run kısayolu — yalnızca AnalysisResult döner', async () => {
    const analysisResult = await facade.run(sampleRequest({ id: 'req-run' }), {
      dataset: sampleDataset()
    });
    assert.equal(analysisResult.status, 'basarili');
    assert.ok(analysisResult.kpiResults.length > 0);
    assert.ok(analysisResult.summary);
  });

  it('analysisContext ile yürütme', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({ id: 'req-ctx' }),
        analysisContext: {
          analysisId: 'an-ctx-1',
          dataset: sampleDataset(),
          locale: 'tr',
          currentStage: 'dataset-dogrulama',
          status: 'bekliyor'
        }
      })
    );
    assert.equal(result.analysisResult.status, 'basarili');
    assert.equal(result.pipelineContext.analysisContext.analysisId, 'an-ctx-1');
  });

  it('datasetId mismatch — validation başarısız', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({
          id: 'req-mismatch',
          datasetId: 'other-id'
        }),
        dataset: sampleDataset()
      })
    );
    assert.equal(result.analysisResult.status, 'basarisiz');
    assert.equal(outcomeOf(result, 'dataset-dogrulama'), 'basarisiz');
  });

  it('includeSkippedFindings false — informational azaltılabilir', async () => {
    const withSkipped = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({ id: 'req-skip-on' }),
        dataset: sampleDataset(),
        includeSkippedFindings: true
      })
    );
    const withoutSkipped = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({ id: 'req-skip-off' }),
        dataset: sampleDataset(),
        includeSkippedFindings: false
      })
    );
    assert.ok(withSkipped.findingResult);
    assert.ok(withoutSkipped.findingResult);
    assert.ok(
      (withoutSkipped.findingResult.summary.informationalCount ?? 0) <=
        (withSkipped.findingResult.summary.informationalCount ?? 0)
    );
  });

  it('createAnalysisPipelineRunner — doğrudan execute', async () => {
    const runner = createAnalysisPipelineRunner();
    const result = await runner.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({ id: 'req-runner' }),
        dataset: sampleDataset()
      })
    );
    assert.equal(result.analysisResult.status, 'basarili');
    assert.ok(result.telemetry.summary.kpiCount > 0);
  });

  it('geçersiz request id — validation öncesi hata', async () => {
    const result = await facade.execute(
      createAnalysisExecutionContext({
        request: sampleRequest({ id: '' }),
        dataset: sampleDataset()
      })
    );
    assert.equal(result.analysisResult.status, 'basarisiz');
    assert.equal(outcomeOf(result, 'dataset-dogrulama'), 'basarisiz');
  });
});
