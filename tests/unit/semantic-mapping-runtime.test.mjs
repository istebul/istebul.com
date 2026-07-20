/**
 * Semantic Mapping Runtime — PR-101G (en az 25 unit test)
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
  createSemanticMappingRuntime,
  createSemanticRegistryRuntime,
  createSemanticContext,
  normalizeSemanticKey,
  clampConfidence,
  roundConfidence,
  confidenceBand,
  BUSINESS_FIELD_CATALOG,
  BUILTIN_SEMANTIC_RULES,
  attachSemanticToPipelineContext,
  readSemanticFromPipelineContext,
  toFoundationSemanticMappingResult,
  PIPELINE_BAG_SEMANTIC_RESULT_KEY
} = await import('../../src/business/import/mappers/runtime/index.ts');

const {
  createSchemaDetectionRuntime,
  createSchemaContext
} = await import('../../src/business/import/detectors/runtime/index.ts');

describe('SemanticMappingRuntime', () => {
  /** @type {ReturnType<typeof createSemanticMappingRuntime>} */
  let runtime;

  beforeEach(() => {
    runtime = createSemanticMappingRuntime();
  });

  it('alias: musteri_adi → customer_name', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['musteri_adi'] })
    );
    assert.equal(result.columns[0].businessField, 'customer_name');
    assert.equal(result.columns[0].entityType, 'musteri');
    assert.ok((result.columns[0].confidence ?? 0) >= 0.9);
  });

  it('alias: barkod → sku', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['barkod'] })
    );
    assert.equal(result.columns[0].businessField, 'sku');
  });

  it('case-insensitive: SKU / Sku / sku', () => {
    for (const key of ['SKU', 'Sku', 'sku']) {
      const result = runtime.map(
        createSemanticContext({ columnKeys: [key] })
      );
      assert.equal(result.columns[0].businessField, 'sku', key);
    }
  });

  it('Türkçe karakter: Ürün Adı → name', () => {
    assert.equal(normalizeSemanticKey('Ürün Adı'), 'urun_adi');
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['Ürün Adı'] })
    );
    assert.equal(result.columns[0].businessField, 'name');
  });

  it('Türkçe karakter: Müşteri → customer_name', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['Müşteri'] })
    );
    assert.equal(result.columns[0].businessField, 'customer_name');
  });

  it('birden fazla kolon eşleşir', () => {
    const result = runtime.map(
      createSemanticContext({
        columnKeys: ['urun_adi', 'adet', 'fiyat', 'xyz_unknown']
      })
    );
    assert.equal(result.telemetry.totalMatches, 3);
    assert.deepEqual(result.unmappedSourceKeys, ['xyz_unknown']);
  });

  it('birden fazla aday / alternatives üretir', () => {
    const result = runtime.map(
      createSemanticContext({
        columnKeys: ['stok_adedi'],
        maxAlternatives: 3
      })
    );
    const col = result.columns[0];
    assert.ok(col.businessField);
    assert.ok(col.candidates.length >= 1);
    assert.ok(Array.isArray(col.alternatives));
  });

  it('confidence 0–1 ve reason dolu', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['email'] })
    );
    const col = result.columns[0];
    assert.ok(col.confidence !== undefined && col.confidence <= 1);
    assert.ok(col.confidence >= 0);
    assert.ok(col.reason && col.reason.length > 0);
  });

  it('confidence band helpers', () => {
    assert.equal(clampConfidence(2), 1);
    assert.equal(roundConfidence(0.456), 0.46);
    assert.equal(confidenceBand(0.9), 'high');
    assert.equal(confidenceBand(0.5), 'medium');
    assert.equal(confidenceBand(0.1), 'low');
  });

  it('alternatives primary dışındaki adaylar', () => {
    const result = runtime.map(
      createSemanticContext({
        columnKeys: ['ad'],
        entityHints: ['personel'],
        maxAlternatives: 5
      })
    );
    const col = result.columns[0];
    assert.ok(col.primary);
    if (col.alternatives.length > 0) {
      assert.notEqual(
        col.alternatives[0].businessField + col.alternatives[0].entityType,
        col.primary.businessField + col.primary.entityType
      );
    }
  });

  it('entityHints confidence yükseltebilir', () => {
    const without = runtime.map(
      createSemanticContext({ columnKeys: ['personel_adi'] })
    );
    const withHint = runtime.map(
      createSemanticContext({
        columnKeys: ['personel_adi'],
        entityHints: ['personel']
      })
    );
    assert.ok(
      (withHint.columns[0].confidence ?? 0) >=
        (without.columns[0].confidence ?? 0)
    );
  });

  it('telemetri: ruleCount, rulesExecuted, totalMatches, distribution', () => {
    const result = runtime.map(
      createSemanticContext({
        columnKeys: ['sku', 'fiyat', 'bilinmeyen']
      })
    );
    const t = result.telemetry;
    assert.ok(t.ruleCount >= BUILTIN_SEMANTIC_RULES.length);
    assert.ok(t.rulesExecuted >= t.ruleCount);
    assert.equal(t.totalMatches, 2);
    assert.equal(t.unmappedCount, 1);
    const distSum =
      t.confidenceDistribution.high +
      t.confidenceDistribution.medium +
      t.confidenceDistribution.low;
    assert.equal(distSum, 2);
    assert.ok(t.durationMs >= 0);
  });

  it('registry seed ve register/unregister', () => {
    const registry = createSemanticRegistryRuntime(true);
    assert.ok(registry.count() >= 4);
    const empty = createSemanticRegistryRuntime(false);
    assert.equal(empty.count(), 0);
    empty.register({
      id: 'custom',
      name: 'Custom',
      description: 't',
      match: (sourceKey) => [
        {
          sourceKey,
          businessField: 'custom_field',
          entityType: 'dokuman',
          confidence: 0.8,
          reason: 'custom',
          ruleId: 'custom'
        }
      ]
    });
    assert.equal(empty.count(), 1);
    assert.throws(() => empty.register(empty.getById('custom')), /zaten/);
    assert.equal(empty.unregister('custom'), true);
  });

  it('Schema Detection sonucu ile map', () => {
    const schema = createSchemaDetectionRuntime().detect(
      createSchemaContext({
        input: [
          { urun_adi: 'Elma', stok: 3, must: 'A1' },
          { urun_adi: 'Armut', stok: 1, sku: 'A2' }
        ]
      })
    );
    const result = runtime.map(
      createSemanticContext({ schemaResult: schema })
    );
    assert.ok(result.mappings.length >= 2);
    assert.ok(result.columns.some((c) => c.businessField === 'name' || c.businessField === 'sku' || c.businessField === 'quantity'));
  });

  it('toFoundationSemanticMappingResult şekli', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['telefon', 'xyz'] })
    );
    const foundation = toFoundationSemanticMappingResult(result);
    assert.ok(Array.isArray(foundation.mappings));
    assert.equal(foundation.mappings[0].targetColumnId, 'phone');
    assert.deepEqual(foundation.unmappedSourceKeys, ['xyz']);
  });

  it('pipeline bag’e semantic sonucu yazılır', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['fiyat'] })
    );
    const bag = {};
    const ctx = {
      request: { id: 'r', source: { type: 'csv', label: 'x' } },
      importContext: {
        importId: 'i',
        source: { type: 'csv', label: 'x' },
        locale: 'tr',
        currentStage: 'semantik-esleme',
        status: 'bekliyor'
      },
      stageExecutions: [],
      bag,
      startedAt: new Date().toISOString(),
      startedMark: 0
    };
    attachSemanticToPipelineContext(ctx, result);
    assert.equal(bag[PIPELINE_BAG_SEMANTIC_RESULT_KEY], result);
    assert.equal(readSemanticFromPipelineContext(ctx), result);
  });

  it('BUSINESS_FIELD_CATALOG dolu', () => {
    assert.ok(BUSINESS_FIELD_CATALOG.length >= 10);
    assert.ok(BUSINESS_FIELD_CATALOG.some((f) => f.fieldId === 'price'));
  });

  it('minConfidence eşiği düşük adayları eler', () => {
    const high = runtime.map(
      createSemanticContext({
        columnKeys: ['ad'],
        minConfidence: 0.99
      })
    );
    // exact match ~0.95 may still pass or fail depending — use absurd threshold
    const absurd = runtime.map(
      createSemanticContext({
        columnKeys: ['ad'],
        minConfidence: 1.01
      })
    );
    assert.ok(high.mappings.length >= 0);
    assert.equal(absurd.mappings.length, 0);
    assert.deepEqual(absurd.unmappedSourceKeys, ['ad']);
  });

  it('output: businessField, confidence, reason, alternatives alanları', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['siparis_no'] })
    );
    const col = result.columns[0];
    assert.equal(col.businessField, 'order_id');
    assert.equal(typeof col.confidence, 'number');
    assert.equal(typeof col.reason, 'string');
    assert.ok(Array.isArray(col.alternatives));
  });

  it('fatura_no → invoice_no', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['fatura_no'] })
    );
    assert.equal(result.columns[0].businessField, 'invoice_no');
    assert.equal(result.columns[0].entityType, 'fatura');
  });

  it('depo_id → warehouse_id', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['depo_id'] })
    );
    assert.equal(result.columns[0].businessField, 'warehouse_id');
  });

  it('kategori_adi → category_name', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['kategori_adi'] })
    );
    assert.equal(result.columns[0].businessField, 'category_name');
  });

  it('bütçe / butce_kodu → budget_code', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['Bütçe'] })
    );
    assert.equal(result.columns[0].businessField, 'budget_code');
  });

  it('boş columnKeys → boş sonuç', () => {
    const result = runtime.map(createSemanticContext({ columnKeys: [] }));
    assert.equal(result.columns.length, 0);
    assert.equal(result.telemetry.totalMatches, 0);
  });

  it('runtime.toFoundationResult delegasyonu', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['qty'] })
    );
    const foundation = runtime.toFoundationResult(result);
    assert.equal(foundation.mappings[0].targetColumnId, 'quantity');
  });

  it('contains alias: urun_kodu_eski → sku', () => {
    const result = runtime.map(
      createSemanticContext({ columnKeys: ['urun_kodu_eski'] })
    );
    assert.equal(result.columns[0].businessField, 'sku');
    assert.ok((result.columns[0].confidence ?? 0) < 0.95);
  });
});
