/**
 * End-to-End Import Runtime — PR-101J (en az 15 entegrasyon testi)
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
  createImportRuntimeFacade,
  createPipelineRunner,
  createImportExecutionContext
} = await import('../../src/business/import/integration/runtime/index.ts');

const { BUSINESS_DATASET_SCHEMA_VERSION } = await import(
  '../../src/business/dataset/schemas/DatasetSchemaConstants.ts'
);

function csvRequest(overrides = {}) {
  return {
    id: 'e2e-csv-1',
    source: { type: 'csv', label: 'urunler.csv' },
    locale: 'tr',
    ...overrides
  };
}

const SAMPLE_CSV = [
  'urun_adi,adet,aktif,tarih',
  '  Elma  ,3,evet,2024-01-15',
  'Armut,5,hayir,2024-02-01'
].join('\n');

function excelWorkbook() {
  return {
    label: 'stok.xlsx',
    sheets: [
      {
        name: 'Urunler',
        rows: [
          ['urun_adi', 'adet', 'aktif', 'tarih'],
          ['Elma', 3, true, '2024-01-15'],
          ['Armut', 5, false, '2024-02-01']
        ]
      }
    ]
  };
}

describe('ImportRuntimeFacade — integration', () => {
  /** @type {ReturnType<typeof createImportRuntimeFacade>} */
  let facade;

  beforeEach(() => {
    facade = createImportRuntimeFacade();
  });

  it('CSV örneği — uçtan uca başarılı import', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest(),
        csvContent: SAMPLE_CSV
      })
    );
    assert.equal(result.importResult.status, 'basarili');
    assert.ok(result.importResult.dataset);
    assert.ok(result.csvResult);
    assert.ok(result.schemaResult);
    assert.ok(result.semanticResult);
    assert.ok(result.normalizationResult);
    assert.ok(result.builderResult);
  });

  it('CSV — ImportResult.dataset entity ve satır içerir', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest(),
        csvContent: SAMPLE_CSV
      })
    );
    const dataset = result.importResult.dataset;
    assert.ok(dataset);
    assert.equal(dataset.version.schemaVersion, BUSINESS_DATASET_SCHEMA_VERSION);
    assert.ok(dataset.entities.length > 0);
    const totalRows = dataset.entities.reduce(
      (sum, e) => sum + e.rows.length,
      0
    );
    assert.ok(totalRows >= 2);
  });

  it('Excel örneği — yapısal workbook ile başarılı', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: {
          id: 'e2e-xlsx-1',
          source: { type: 'excel', label: 'stok.xlsx' },
          locale: 'tr'
        },
        excelWorkbook: excelWorkbook()
      })
    );
    assert.equal(result.importResult.status, 'basarili');
    assert.ok(result.excelResult);
    assert.ok(result.importResult.dataset);
    assert.equal(result.excelResult.sheet.name, 'Urunler');
  });

  it('boş dosya — yalnızca başlık, boş entities kabul edilir', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-empty' }),
        csvContent: 'urun_adi,adet\n'
      })
    );
    assert.equal(result.importResult.status, 'basarili');
    assert.ok(result.importResult.dataset);
    assert.equal(result.csvResult?.rows.length, 0);
  });

  it('validation hatası — geçersiz istek id pipeline durur', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: '' }),
        csvContent: SAMPLE_CSV
      })
    );
    assert.equal(result.importResult.status, 'basarisiz');
    assert.equal(result.importResult.dataset, undefined);
    assert.ok(
      result.stageExecutions.some(
        (s) => s.stageId === 'dogrulama' && s.outcome === 'basarisiz'
      )
    );
  });

  it('reader bulunamadı — kayıtsız registry', async () => {
    const runner = createPipelineRunner({ skipReaderRegistration: true });
    const result = await runner.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-no-reader' }),
        csvContent: SAMPLE_CSV
      })
    );
    assert.equal(result.importResult.status, 'basarisiz');
    assert.ok(
      result.stageExecutions.some(
        (s) =>
          s.stageId === 'okuma' &&
          s.outcome === 'basarisiz' &&
          s.errors.some((e) => e.code === 'READER_NOT_FOUND')
      )
    );
  });

  it('semantic confidence düşük — bilinmeyen kolonlar uyarı üretir', async () => {
    const csv = ['xyz1,xyz2,xyz3', 'a,b,c'].join('\n');
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-low-conf' }),
        csvContent: csv,
        minSemanticConfidence: 0.99
      })
    );
    assert.equal(result.importResult.status, 'basarili');
    assert.ok(result.semanticResult);
    assert.ok(result.semanticResult.unmappedSourceKeys.length >= 1);
    assert.ok(
      result.stageExecutions
        .find((s) => s.stageId === 'semantik-esleme')
        ?.warnings.some((w) => w.code === 'SEMANTIC_UNMAPPED_COLUMNS')
    );
  });

  it('normalizer warning — trim uyarısı ImportResult warnings', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-norm-warn' }),
        csvContent: SAMPLE_CSV
      })
    );
    assert.ok(result.normalizationResult);
    const hasNormWarning =
      result.normalizationResult.warnings.length > 0 ||
      result.importResult.warnings.some((w) => w.stage === 'normalizasyon');
    assert.ok(hasNormWarning);
  });

  it('dataset assembly — builder telemetri ve assembly modeli', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-assembly' }),
        csvContent: SAMPLE_CSV,
        title: 'Test Dataset'
      })
    );
    assert.ok(result.builderResult);
    assert.ok(result.builderResult.assembly);
    assert.equal(result.builderResult.assembly.metadata.title, 'Test Dataset');
    assert.ok(result.builderResult.telemetry.entityCount >= 0);
    assert.ok(result.builderResult.telemetry.durationMs >= 0);
  });

  it('telemetri — toplam süre ve aşama süreleri', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-telemetry' }),
        csvContent: SAMPLE_CSV
      })
    );
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.stageDurationsMs.okuma !== undefined);
    assert.ok(result.telemetry.stageDurationsMs.tespit !== undefined);
    assert.ok(result.telemetry.stageDurationsMs['dataset-olusturma'] !== undefined);
  });

  it('telemetri — stage sonuçları kayıtlı', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-stage-outcomes' }),
        csvContent: SAMPLE_CSV
      })
    );
    assert.equal(result.telemetry.stageOutcomes['adapter-secimi'], 'basarili');
    assert.equal(result.telemetry.stageOutcomes.okuma, 'basarili');
    assert.equal(result.telemetry.stageOutcomes.tamamlandi, 'basarili');
  });

  it('pipeline özeti — başarı ve dataset üretildi', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-summary' }),
        csvContent: SAMPLE_CSV
      })
    );
    assert.equal(result.telemetry.summary.success, true);
    assert.equal(result.telemetry.summary.datasetProduced, true);
    assert.ok(result.telemetry.summary.stagesSucceeded >= 7);
    assert.equal(result.telemetry.summary.stagesFailed, 0);
  });

  it('pipeline bag — ara sonuçlar bağlı', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-bag' }),
        csvContent: SAMPLE_CSV
      })
    );
    const bag = result.pipelineContext.bag;
    assert.ok(bag.selectedAdapter);
    assert.ok(bag.rawPayload);
    assert.ok(bag.schemaDetectionResult);
    assert.ok(bag.semanticMappingResult);
    assert.ok(bag.normalizationResult);
    assert.ok(bag.validationResult);
    assert.ok(bag.datasetBuildResult);
  });

  it('facade.run kısayolu ImportResult döner', async () => {
    const importResult = await facade.run(csvRequest({ id: 'e2e-run' }), {
      csvContent: SAMPLE_CSV
    });
    assert.equal(importResult.status, 'basarili');
    assert.ok(importResult.dataset);
    assert.equal(importResult.lastStage, 'tamamlandi');
  });

  it('Excel — reader lookup telemetrisi', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: {
          id: 'e2e-xlsx-lookup',
          source: { type: 'excel', label: 'veri.xlsx' }
        },
        excelWorkbook: excelWorkbook()
      })
    );
    assert.ok(result.readerLookup);
    assert.equal(result.readerLookup.found, true);
    assert.ok(result.readerLookup.selectedReaderId);
  });

  it('CSV — çok kolonlu veri şema tespiti', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-schema' }),
        csvContent: SAMPLE_CSV
      })
    );
    assert.ok(result.schemaResult);
    assert.ok(result.schemaResult.columnKeys.length >= 4);
    assert.ok(result.schemaResult.telemetry.columnsInspected >= 4);
  });

  it('validation uyarıları — boş reader output WARNING, devam eder', async () => {
    const result = await facade.execute(
      createImportExecutionContext({
        request: csvRequest({ id: 'e2e-empty-rows' }),
        csvContent: 'a,b\n'
      })
    );
    assert.equal(result.importResult.status, 'basarili');
    const validationStage = result.stageExecutions.find(
      (s) => s.stageId === 'dogrulama'
    );
    assert.equal(validationStage?.outcome, 'basarili');
  });
});
