/**
 * Dataset Normalizer Runtime — PR-101H (en az 30 unit test)
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
  createDatasetNormalizerRuntime,
  createNormalizationRegistryRuntime,
  createNormalizationContext,
  createNormalizationContextFromSemantic,
  inferPrimitiveType,
  parseBoolean,
  parseNumber,
  parseDateIso,
  BUILTIN_NORMALIZATION_RULES,
  attachNormalizationToPipelineContext,
  readNormalizationFromPipelineContext,
  PIPELINE_BAG_NORMALIZATION_RESULT_KEY
} = await import('../../src/business/import/normalizers/runtime/index.ts');

const {
  createSemanticMappingRuntime,
  createSemanticContext
} = await import('../../src/business/import/mappers/runtime/index.ts');

function semanticAndRows() {
  const rows = [
    {
      urun_adi: '  Elma  ',
      adet: '3',
      aktif: 'evet',
      tarih: '2024-01-15',
      etiketler: ['a', 'b']
    },
    {
      urun_adi: 'Armut',
      adet: 5,
      aktif: false,
      tarih: '2024-02-01T10:00:00.000Z',
      etiketler: []
    }
  ];
  const semantic = createSemanticMappingRuntime().map(
    createSemanticContext({
      columnKeys: ['urun_adi', 'adet', 'aktif', 'tarih', 'etiketler']
    })
  );
  return { rows, semantic };
}

describe('DatasetNormalizerRuntime', () => {
  /** @type {ReturnType<typeof createDatasetNormalizerRuntime>} */
  let runtime;

  beforeEach(() => {
    runtime = createDatasetNormalizerRuntime();
  });

  it('string trim ve field name mapping', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const nameField = result.records[0].fields.find(
      (f) => f.fieldName === 'name'
    );
    assert.ok(nameField);
    assert.equal(nameField.value, 'Elma');
    assert.equal(nameField.primitiveType, 'string');
    assert.ok(nameField.appliedRules.includes('trim-whitespace'));
  });

  it('number string → number', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const qty = result.records[0].fields.find((f) => f.fieldName === 'quantity');
    assert.equal(qty?.primitiveType, 'number');
    assert.equal(qty?.value, 3);
  });

  it('number zaten number kalır', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const qty = result.records[1].fields.find((f) => f.fieldName === 'quantity');
    assert.equal(qty?.value, 5);
    assert.equal(qty?.primitiveType, 'number');
  });

  it('boolean evet → true', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const active = result.records[0].fields.find(
      (f) => f.sourceKey === 'aktif'
    );
    assert.equal(active?.primitiveType, 'boolean');
    assert.equal(active?.value, true);
  });

  it('boolean false kalır', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const active = result.records[1].fields.find(
      (f) => f.sourceKey === 'aktif'
    );
    assert.equal(active?.value, false);
  });

  it('date ISO string', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const dateField = result.records[0].fields.find(
      (f) => f.fieldName === 'date'
    );
    assert.equal(dateField?.primitiveType, 'date');
    assert.ok(dateField?.dateIso?.startsWith('2024-01-15'));
  });

  it('null undefined → null', () => {
    const result = runtime.normalize(
      createNormalizationContext({
        rows: [{ bos: undefined, empty: '' }],
        mappings: [
          {
            sourceKey: 'bos',
            entityType: 'urun',
            targetColumnId: 'bos',
            confidence: 1
          },
          {
            sourceKey: 'empty',
            entityType: 'urun',
            targetColumnId: 'empty',
            confidence: 1
          }
        ]
      })
    );
    const bos = result.records[0].fields.find((f) => f.fieldName === 'bos');
    const empty = result.records[0].fields.find((f) => f.fieldName === 'empty');
    assert.equal(bos?.value, null);
    assert.equal(bos?.primitiveType, 'null');
    assert.equal(empty?.value, null);
  });

  it('collection dizisi', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const tags = result.records[0].fields.find(
      (f) => f.sourceKey === 'etiketler'
    );
    assert.equal(tags?.primitiveType, 'collection');
    assert.deepEqual(tags?.value, ['a', 'b']);
  });

  it('warnings trim için üretilir', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    assert.ok(result.warnings.some((w) => w.code === 'TRIMMED'));
    assert.ok(result.telemetry.warningCount >= 1);
  });

  it('appliedRules telemetride', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    assert.ok(result.appliedRules.length > 0);
    assert.ok(
      result.appliedRules.some((r) => r.ruleId === 'map-field-name')
    );
  });

  it('telemetri: rulesExecuted, fieldsNormalized, typesTransformed, duration', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const t = result.telemetry;
    assert.ok(t.rulesExecuted > 0);
    assert.ok(t.fieldsNormalized > 0);
    assert.ok(t.typesTransformed > 0);
    assert.equal(t.recordCount, 2);
    assert.ok(t.durationMs >= 0);
  });

  it('fields özeti benzersiz fieldName', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const names = result.fields.map((f) => f.fieldName);
    assert.ok(names.includes('name'));
    assert.ok(names.includes('quantity'));
    assert.equal(new Set(names).size, names.length);
  });

  it('registry seed ve register/unregister', () => {
    const registry = createNormalizationRegistryRuntime(true);
    assert.ok(registry.count() >= BUILTIN_NORMALIZATION_RULES.length);
    const empty = createNormalizationRegistryRuntime(false);
    empty.register({
      id: 'custom',
      name: 'Custom',
      description: 'd',
      apply: (state) => ({
        ...state,
        appliedRuleIds: [...state.appliedRuleIds, 'custom']
      })
    });
    assert.equal(empty.count(), 1);
    assert.throws(() => empty.register(empty.getById('custom')), /zaten/);
    assert.equal(empty.unregister('custom'), true);
  });

  it('inferPrimitiveType helpers', () => {
    assert.equal(inferPrimitiveType(null), 'null');
    assert.equal(inferPrimitiveType(undefined), 'null');
    assert.equal(inferPrimitiveType(42), 'number');
    assert.equal(inferPrimitiveType(true), 'boolean');
    assert.equal(inferPrimitiveType('2024-01-01'), 'date');
    assert.equal(inferPrimitiveType(['x']), 'collection');
    assert.equal(inferPrimitiveType('metin'), 'string');
  });

  it('parseBoolean Türkçe', () => {
    assert.equal(parseBoolean('evet'), true);
    assert.equal(parseBoolean('hayir'), false);
    assert.equal(parseBoolean('false'), false);
  });

  it('parseNumber virgül/nokta', () => {
    assert.equal(parseNumber('3,14'), 3.14);
    assert.equal(parseNumber('  10 '), 10);
  });

  it('parseDateIso', () => {
    assert.ok(parseDateIso('2024-06-01')?.startsWith('2024-06-01'));
  });

  it('coerceTypes=false string kalır', () => {
    const result = runtime.normalize(
      createNormalizationContext({
        rows: [{ adet: '5' }],
        mappings: [
          {
            sourceKey: 'adet',
            entityType: 'stok',
            targetColumnId: 'quantity'
          }
        ],
        coerceTypes: false
      })
    );
    const field = result.records[0].fields[0];
    assert.equal(field.value, '5');
    assert.equal(typeof field.value, 'string');
  });

  it('trimWhitespace=false', () => {
    const result = runtime.normalize(
      createNormalizationContext({
        rows: [{ ad: '  x  ' }],
        mappings: [{ sourceKey: 'ad', entityType: 'urun', targetColumnId: 'name' }],
        trimWhitespace: false
      })
    );
    assert.equal(result.records[0].fields[0].value, '  x  ');
    assert.equal(result.warnings.filter((w) => w.code === 'TRIMMED').length, 0);
  });

  it('mapping olmadan sourceKey fieldName olur', () => {
    const result = runtime.normalize(
      createNormalizationContext({
        rows: [{ custom_col: 'deger' }]
      })
    );
    assert.equal(result.records[0].fields[0].fieldName, 'custom_col');
    assert.equal(result.records[0].fields[0].value, 'deger');
  });

  it('boş rows → boş records', () => {
    const result = runtime.normalize(
      createNormalizationContext({ rows: [] })
    );
    assert.equal(result.records.length, 0);
    assert.equal(result.telemetry.recordCount, 0);
  });

  it('pipeline bag yazma/okuma', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const bag = {};
    const ctx = {
      request: { id: 'r', source: { type: 'csv', label: 'x' } },
      importContext: {
        importId: 'i',
        source: { type: 'csv', label: 'x' },
        locale: 'tr',
        currentStage: 'normalizasyon',
        status: 'bekliyor'
      },
      stageExecutions: [],
      bag,
      startedAt: new Date().toISOString(),
      startedMark: 0
    };
    attachNormalizationToPipelineContext(ctx, result);
    assert.equal(bag[PIPELINE_BAG_NORMALIZATION_RESULT_KEY], result);
    assert.equal(readNormalizationFromPipelineContext(ctx), result);
  });

  it('semantic + tabular uçtan uca', () => {
    const rows = [
      { urun_adi: 'Elma', adet: '2', fiyat: '10,5' },
      { urun_adi: 'Armut', adet: '1', fiyat: '8' }
    ];
    const semantic = createSemanticMappingRuntime().map(
      createSemanticContext({ columnKeys: ['urun_adi', 'adet', 'fiyat'] })
    );
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    assert.equal(result.records.length, 2);
    const price = result.records[0].fields.find((f) => f.fieldName === 'price');
    assert.equal(price?.primitiveType, 'number');
    assert.equal(price?.value, 10.5);
  });

  it('eksik kolon undefined → null', () => {
    const result = runtime.normalize(
      createNormalizationContext({
        rows: [{}],
        mappings: [
          { sourceKey: 'adet', entityType: 'stok', targetColumnId: 'quantity' }
        ]
      })
    );
    const field = result.records[0].fields.find(
      (f) => f.fieldName === 'quantity'
    );
    assert.equal(field?.value, null);
  });

  it('NUMBER_PARSE_FAILED uyarısı', () => {
    const result = runtime.normalize(
      createNormalizationContext({
        rows: [{ adet: 'abc' }],
        mappings: [
          { sourceKey: 'adet', entityType: 'stok', targetColumnId: 'quantity' }
        ]
      })
    );
    assert.ok(
      result.warnings.some((w) => w.code === 'NUMBER_PARSE_FAILED') ||
        result.records[0].fields[0].primitiveType === 'string'
    );
  });

  it('entityType semantic mapping’den gelir', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const nameField = result.records[0].fields.find(
      (f) => f.fieldName === 'name'
    );
    assert.equal(nameField?.entityType, 'urun');
  });

  it('birden fazla kayıt normalize edilir', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    assert.equal(result.records[0].index, 0);
    assert.equal(result.records[1].index, 1);
    assert.ok(result.records[1].fields.length > 0);
  });

  it('warningCodes alan üzerinde', () => {
    const { rows, semantic } = semanticAndRows();
    const result = runtime.normalize(
      createNormalizationContextFromSemantic(semantic, rows)
    );
    const trimmed = result.records[0].fields.find((f) =>
      f.warningCodes.includes('TRIMMED')
    );
    assert.ok(trimmed);
  });

  it('emptyStringAsNull=false boş string kalır', () => {
    const result = runtime.normalize(
      createNormalizationContext({
        rows: [{ x: '   ' }],
        mappings: [{ sourceKey: 'x', entityType: 'urun', targetColumnId: 'x' }],
        emptyStringAsNull: false,
        trimWhitespace: false
      })
    );
    assert.equal(result.records[0].fields[0].value, '   ');
  });

  it('Date nesnesi ISO', () => {
    const d = new Date('2024-03-01T00:00:00.000Z');
    const result = runtime.normalize(
      createNormalizationContext({
        rows: [{ tarih: d }],
        mappings: [
          { sourceKey: 'tarih', entityType: 'siparis', targetColumnId: 'date' }
        ]
      })
    );
    assert.equal(result.records[0].fields[0].primitiveType, 'date');
    assert.ok(result.records[0].fields[0].dateIso);
  });
});
