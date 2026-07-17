/**
 * Schema Detection Runtime — PR-101D (en az 20 unit test)
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
  createSchemaDetectionRuntime,
  createSchemaRegistryRuntime,
  createSchemaContext,
  createSchemaDetectorRegistry,
  createColumnDetectorRegistry,
  createEntityDetectorRegistry,
  clampConfidence,
  roundConfidence,
  confidenceBand,
  inferValueType,
  dominantType,
  normalizeColumnName,
  attachSchemaToPipelineContext,
  readSchemaFromPipelineContext,
  PIPELINE_BAG_SCHEMA_RESULT_KEY,
  BUILTIN_SCHEMA_DETECTORS,
  BUILTIN_COLUMN_DETECTORS,
  BUILTIN_ENTITY_DETECTORS
} = await import('../../src/business/import/detectors/runtime/index.ts');

describe('SchemaDetectionRuntime', () => {
  /** @type {ReturnType<typeof createSchemaDetectionRuntime>} */
  let runtime;

  beforeEach(() => {
    runtime = createSchemaDetectionRuntime();
  });

  it('object-rows: kolon adlarını algılar', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [
          { urun_adi: 'Elma', adet: 3 },
          { urun_adi: 'Armut', adet: 5 }
        ]
      })
    );
    assert.deepEqual([...result.columnKeys].sort(), ['adet', 'urun_adi'].sort());
    assert.equal(result.rowCountEstimate, 2);
    assert.ok(result.candidates.length >= 1);
  });

  it('columns/rows şeklini dilimler', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: {
          columns: ['sku', 'fiyat'],
          rows: [
            { sku: 'A1', fiyat: 10 },
            { sku: 'A2', fiyat: 12 }
          ]
        }
      })
    );
    assert.deepEqual(result.columnKeys, ['sku', 'fiyat']);
    assert.equal(result.columns[0].detectedType, 'kimlik');
  });

  it('headers/records matrisini dilimler', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: {
          headers: ['musteri_adi', 'telefon'],
          records: [
            ['Ali', '555'],
            ['Veli', '556']
          ]
        }
      })
    );
    assert.equal(result.columns.length, 2);
    assert.equal(result.candidates[0].sourceShape, 'header-matrix');
  });

  it('tip algılama: tamsayi / sayi / mantiksal / tarih', () => {
    assert.equal(inferValueType(42), 'tamsayi');
    assert.equal(inferValueType(3.14), 'sayi');
    assert.equal(inferValueType(true), 'mantiksal');
    assert.equal(inferValueType('2024-01-15'), 'tarih');
    assert.equal(inferValueType('2024-01-15T10:00:00Z'), 'tarih-saat');
    assert.equal(inferValueType('100 TL'), 'para');
    assert.equal(inferValueType('12%'), 'yuzde');
  });

  it('kolon tipi tamsayi olarak tespit edilir', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [{ adet: 1 }, { adet: 2 }, { adet: 3 }]
      })
    );
    assert.equal(result.columns[0].detectedType, 'tamsayi');
    assert.ok(result.columns[0].confidence > 0.5);
  });

  it('confidence 0.00–1.00 aralığında ve bantlı', () => {
    assert.equal(clampConfidence(1.5), 1);
    assert.equal(clampConfidence(-1), 0);
    assert.equal(roundConfidence(0.456), 0.46);
    assert.equal(confidenceBand(0.9), 'high');
    assert.equal(confidenceBand(0.5), 'medium');
    assert.equal(confidenceBand(0.1), 'low');
  });

  it('boş kolon: emptyRatio yüksek, tip bilinmeyen olabilir', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [
          { not: 'a', bos: null },
          { not: 'b', bos: '' },
          { not: 'c', bos: undefined }
        ]
      })
    );
    const bos = result.columns.find((c) => c.name === 'bos');
    assert.ok(bos);
    assert.equal(bos.nullable, true);
    assert.ok(bos.emptyRatio >= 0.99);
    assert.ok(['bilinmeyen', 'metin', 'karisik'].includes(bos.detectedType));
  });

  it('karışık tip: dominantType karisik döner', () => {
    const { type, consistency } = dominantType([1, 'metin', true, 2]);
    assert.equal(type, 'karisik');
    assert.ok(consistency < 0.7);
  });

  it('karışık kolon detectedType=karisik', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [
          { x: 1 },
          { x: 'abc' },
          { x: true },
          { x: 2 }
        ]
      })
    );
    assert.equal(result.columns[0].detectedType, 'karisik');
  });

  it('entity tahmini: urun + stok sinyalleri', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [
          { urun_adi: 'Elma', stok: 10, sku: 'E1' },
          { urun_adi: 'Armut', stok: 4, sku: 'A1' }
        ]
      })
    );
    const types = result.entities.map((e) => e.entityType);
    assert.ok(types.includes('urun'));
    assert.ok(types.includes('stok'));
    assert.ok(result.entities[0].confidence > 0);
  });

  it('entityHints confidence yükseltir', () => {
    const withHint = runtime.detect(
      createSchemaContext({
        input: [{ kod: '1', ad: 'x' }],
        entityHints: ['personel']
      })
    );
    assert.ok(withHint.entities.some((e) => e.entityType === 'personel'));
  });

  it('aday alan: musteri_adi → customer', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [{ musteri_adi: 'Ali' }, { musteri_adi: 'Veli' }]
      })
    );
    const fields = result.columns[0].candidateFields.map((f) => f.fieldKey);
    assert.ok(fields.includes('customer') || fields.includes('name'));
  });

  it('koleksiyon değerleri isCollection=true', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [{ tags: ['a', 'b'] }, { tags: ['c'] }]
      })
    );
    assert.equal(result.columns[0].isCollection, true);
    assert.equal(result.columns[0].detectedType, 'json');
  });

  it('uniqueRatio ve sampleValues üretilir', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [{ id: 'a' }, { id: 'b' }, { id: 'a' }],
        maxSampleValues: 2
      })
    );
    const col = result.columns[0];
    assert.ok(col.uniqueRatio > 0 && col.uniqueRatio < 1);
    assert.ok(col.sampleValues.length <= 2);
  });

  it('telemetri: süre, kolon, aday, confidence dağılımı', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [
          { a: 1, b: null },
          { a: 2, b: 3 }
        ]
      })
    );
    const t = result.telemetry;
    assert.ok(t.durationMs >= 0);
    assert.equal(t.columnsInspected, 2);
    assert.ok(t.candidatesProduced >= 1);
    const distSum =
      t.confidenceDistribution.high +
      t.confidenceDistribution.medium +
      t.confidenceDistribution.low;
    assert.equal(distSum, 2);
  });

  it('tanınmayan girdi: boş sonuç, confidence 0', () => {
    const result = runtime.detect(
      createSchemaContext({ input: 'ham-metin-degil-tablo' })
    );
    assert.equal(result.columns.length, 0);
    assert.equal(result.candidates.length, 0);
    assert.equal(result.overallConfidence, 0);
  });

  it('toImportDetectionResult foundation şekline projekte eder', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [{ urun: 'x', stok: 1 }]
      })
    );
    const projected = runtime.toImportDetectionResult(result);
    assert.ok(Array.isArray(projected.columnKeys));
    assert.ok(Array.isArray(projected.entitySuggestions));
    assert.equal(typeof projected.confidence, 'number');
  });

  it('registry facade seed ve totalCount', () => {
    const registry = createSchemaRegistryRuntime(true);
    assert.ok(registry.schemaDetectors.count() >= BUILTIN_SCHEMA_DETECTORS.length);
    assert.ok(registry.columnDetectors.count() >= BUILTIN_COLUMN_DETECTORS.length);
    assert.ok(registry.entityDetectors.count() >= BUILTIN_ENTITY_DETECTORS.length);
    assert.ok(registry.totalCount() >= 3);
  });

  it('SchemaDetectorRegistry register/unregister/duplicate', () => {
    const reg = createSchemaDetectorRegistry(false);
    assert.equal(reg.count(), 0);
    const detector = {
      id: 'custom-schema',
      name: 'Custom',
      description: 't',
      detect: () => null
    };
    reg.register(detector);
    assert.equal(reg.count(), 1);
    assert.throws(() => reg.register(detector), /zaten kayıtlı/);
    assert.equal(reg.unregister('custom-schema'), true);
  });

  it('ColumnDetectorRegistry ve EntityDetectorRegistry register', () => {
    const cols = createColumnDetectorRegistry(false);
    const ents = createEntityDetectorRegistry(false);
    cols.register({
      id: 'c1',
      name: 'C',
      description: 'd',
      detect: (name, index) => ({
        name,
        index,
        detectedType: 'metin',
        nullable: false,
        isCollection: false,
        sampleValues: [],
        uniqueRatio: 1,
        emptyRatio: 0,
        confidence: 0.5,
        candidateFields: []
      })
    });
    ents.register({
      id: 'e1',
      name: 'E',
      description: 'd',
      detect: () => []
    });
    assert.equal(cols.count(), 1);
    assert.equal(ents.count(), 1);
  });

  it('pipeline bag’e schema sonucu yazılır', () => {
    const result = runtime.detect(
      createSchemaContext({ input: [{ a: 1 }] })
    );
    const bag = {};
    const ctx = {
      request: { id: 'r', source: { type: 'csv', label: 'x' } },
      importContext: {
        importId: 'i',
        source: { type: 'csv', label: 'x' },
        locale: 'tr',
        currentStage: 'tespit',
        status: 'bekliyor'
      },
      stageExecutions: [],
      bag,
      startedAt: new Date().toISOString(),
      startedMark: 0
    };
    attachSchemaToPipelineContext(ctx, result);
    assert.equal(bag[PIPELINE_BAG_SCHEMA_RESULT_KEY], result);
    assert.equal(readSchemaFromPipelineContext(ctx), result);
  });

  it('normalizeColumnName Türkçe karakterleri sadeleştirir', () => {
    assert.equal(normalizeColumnName('Ürün Adı'), 'urun_adi');
    assert.equal(normalizeColumnName('Müşteri-ID'), 'musteri_id');
  });

  it('nullable true null değer içeren kolonda', () => {
    const result = runtime.detect(
      createSchemaContext({
        input: [{ a: 1 }, { a: null }, { a: 3 }]
      })
    );
    assert.equal(result.columns[0].nullable, true);
    assert.ok(result.columns[0].emptyRatio > 0);
  });
});
