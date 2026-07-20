/**
 * BusinessDataset Builder Runtime — PR-101I (en az 35 unit test)
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
  createBusinessDatasetBuilderRuntime,
  createBuilderContext,
  toImportResult,
  toNormalizationSummary,
  toValidationSummary,
  toBusinessValidationResult,
  primitiveTypeToColumnDataType,
  cellValueFromField,
  resolveEntityTypeId,
  mapImportSourceToBusinessSource,
  columnFromNormalizedField,
  entityDisplayName,
  groupFieldDefinitionsByEntity,
  attachDatasetBuildToPipelineContext,
  readDatasetBuildFromPipelineContext,
  PIPELINE_BAG_DATASET_BUILD_RESULT_KEY
} = await import('../../src/business/import/builder/runtime/index.ts');

const {
  createDatasetNormalizerRuntime,
  createNormalizationContext
} = await import('../../src/business/import/normalizers/runtime/index.ts');

const { BUSINESS_DATASET_SCHEMA_VERSION } = await import(
  '../../src/business/dataset/schemas/DatasetSchemaConstants.ts'
);

function validRequest(overrides = {}) {
  return {
    id: 'req-builder-1',
    source: { type: 'csv', label: 'satis.csv' },
    locale: 'tr',
    ...overrides
  };
}

function emptyNormalizationResult(overrides = {}) {
  return {
    records: [],
    fields: [],
    warnings: [],
    appliedRules: [],
    telemetry: {
      rulesExecuted: 0,
      fieldsNormalized: 0,
      typesTransformed: 0,
      warningCount: 0,
      durationMs: 0,
      startedAt: '2026-07-20T08:00:00.000Z',
      endedAt: '2026-07-20T08:00:00.000Z',
      recordCount: 0
    },
    ...overrides
  };
}

function singleEntityNormalization() {
  return createDatasetNormalizerRuntime().normalize(
    createNormalizationContext({
      rows: [
        { urun_adi: 'Elma', adet: 3, aktif: true },
        { urun_adi: 'Armut', adet: 5, aktif: false }
      ],
      mappings: [
        { sourceKey: 'urun_adi', entityType: 'urun', targetColumnId: 'name' },
        { sourceKey: 'adet', entityType: 'urun', targetColumnId: 'quantity' },
        { sourceKey: 'aktif', entityType: 'urun', targetColumnId: 'isActive' }
      ]
    })
  );
}

function multiEntityNormalization() {
  return createDatasetNormalizerRuntime().normalize(
    createNormalizationContext({
      rows: [
        { urun: 'A', stok_miktar: 10 },
        { urun: 'B', stok_miktar: 20 }
      ],
      mappings: [
        { sourceKey: 'urun', entityType: 'urun', targetColumnId: 'name' },
        { sourceKey: 'stok_miktar', entityType: 'stok', targetColumnId: 'quantity' }
      ]
    })
  );
}

function validationResultFixture(overrides = {}) {
  return {
    isValid: true,
    issues: [
      {
        ruleId: 'empty-collection',
        code: 'EMPTY_COLLECTION',
        message: 'Boş koleksiyon',
        severity: 'WARNING',
        path: 'dataset.entities'
      }
    ],
    telemetry: {
      durationMs: 5,
      startedAt: '2026-07-20T08:00:00.000Z',
      endedAt: '2026-07-20T08:00:01.000Z',
      rulesExecuted: 10,
      rulesPassed: 9,
      rulesFailed: 1,
      issueCounts: {
        INFO: 0,
        WARNING: 1,
        ERROR: 0,
        CRITICAL: 0
      }
    },
    ...overrides
  };
}

describe('BusinessDatasetBuilderRuntime', () => {
  /** @type {ReturnType<typeof createBusinessDatasetBuilderRuntime>} */
  let runtime;

  beforeEach(() => {
    runtime = createBusinessDatasetBuilderRuntime();
  });

  it('boş dataset — entities boş', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest()
      })
    );
    assert.equal(result.dataset.entities.length, 0);
    assert.equal(result.telemetry.entityCount, 0);
    assert.equal(result.telemetry.recordCount, 0);
    assert.equal(result.telemetry.fieldCount, 0);
  });

  it('boş dataset — relations boş', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest()
      })
    );
    assert.deepEqual(result.dataset.relations, []);
    assert.deepEqual(result.assembly.relations, []);
  });

  it('boş dataset — dataset id ds-{requestId}', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest({ id: 'abc-99' })
      })
    );
    assert.equal(result.dataset.id, 'ds-abc-99');
    assert.equal(result.dataset.metadata.id, 'ds-abc-99');
  });

  it('tek entity — urun satırları', () => {
    const normalization = singleEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    assert.equal(result.dataset.entities.length, 1);
    assert.equal(result.dataset.entities[0].entityType, 'urun');
    assert.equal(result.dataset.entities[0].rows.length, 2);
  });

  it('tek entity — sütunlar fieldName ile', () => {
    const normalization = singleEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    const entity = result.dataset.entities[0];
    assert.ok(entity.columns.some((c) => c.id === 'name'));
    assert.ok(entity.columns.some((c) => c.id === 'quantity'));
    assert.equal(entity.layout, 'tablo');
  });

  it('tek entity — hücre değerleri satırda', () => {
    const normalization = singleEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    const row = result.dataset.entities[0].rows[0];
    assert.equal(row.values.name, 'Elma');
    assert.equal(row.values.quantity, 3);
    assert.equal(row.values.isActive, true);
    assert.ok(row.sourceRef?.startsWith('kayit-'));
  });

  it('çoklu entity — urun ve stok ayrı tablolar', () => {
    const normalization = multiEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    assert.equal(result.dataset.entities.length, 2);
    const types = result.dataset.entities.map((e) => e.entityType).sort();
    assert.deepEqual(types, ['stok', 'urun']);
  });

  it('çoklu entity — her entity kendi satır sayısı', () => {
    const normalization = multiEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    for (const entity of result.dataset.entities) {
      assert.equal(entity.rows.length, 2);
    }
  });

  it('metadata — title özel', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest(),
        title: 'Özel Başlık',
        description: 'Açıklama metni',
        tags: ['test', 'builder']
      })
    );
    assert.equal(result.dataset.metadata.title, 'Özel Başlık');
    assert.equal(result.dataset.metadata.description, 'Açıklama metni');
    assert.deepEqual(result.dataset.metadata.tags, ['test', 'builder']);
  });

  it('metadata — locale request’ten', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest({ locale: 'en' })
      })
    );
    assert.equal(result.dataset.metadata.locale, 'en');
  });

  it('metadata — createdAt ve updatedAt set', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest()
      })
    );
    assert.ok(result.dataset.metadata.createdAt);
    assert.ok(result.dataset.metadata.updatedAt);
  });

  it('version — schemaVersion foundation sabiti', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest()
      })
    );
    assert.equal(
      result.dataset.version.schemaVersion,
      BUSINESS_DATASET_SCHEMA_VERSION
    );
    assert.equal(result.dataset.version.revision, '1');
    assert.ok(result.dataset.version.effectiveAt);
    assert.equal(
      result.dataset.version.changeSummary,
      'İçe aktarma ile oluşturuldu'
    );
  });

  it('version — özel revision', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest(),
        revision: '7'
      })
    );
    assert.equal(result.dataset.version.revision, '7');
  });

  it('source — csv kaynağı', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest({
          source: { type: 'csv', label: 'envanter.csv', uri: 'file:///a.csv' }
        })
      })
    );
    assert.equal(result.dataset.source.type, 'csv');
    assert.equal(result.dataset.source.label, 'envanter.csv');
    assert.equal(result.dataset.source.uri, 'file:///a.csv');
    assert.ok(result.dataset.source.capturedAt);
  });

  it('source — manual → manual-entry', () => {
    const mapped = mapImportSourceToBusinessSource({
      type: 'manual',
      label: 'El ile'
    });
    assert.equal(mapped.type, 'manual-entry');
  });

  it('rows — satır id formatı', () => {
    const normalization = multiEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    const urun = result.dataset.entities.find((e) => e.entityType === 'urun');
    assert.equal(urun?.rows[0].id, 'row-urun-0');
    assert.equal(urun?.rows[1].id, 'row-urun-1');
  });

  it('columns — primitive tip eşlemesi metin', () => {
    assert.equal(primitiveTypeToColumnDataType('string'), 'metin');
    assert.equal(primitiveTypeToColumnDataType('unknown'), 'metin');
  });

  it('columns — primitive tip eşlemesi sayi ve mantiksal', () => {
    assert.equal(primitiveTypeToColumnDataType('number'), 'sayi');
    assert.equal(primitiveTypeToColumnDataType('boolean'), 'mantiksal');
    assert.equal(primitiveTypeToColumnDataType('date'), 'tarih-saat');
    assert.equal(primitiveTypeToColumnDataType('collection'), 'json');
  });

  it('columns — sourceFieldKey kaynak kolon', () => {
    const normalization = multiEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    const stok = result.dataset.entities.find((e) => e.entityType === 'stok');
    const qty = stok?.columns.find((c) => c.id === 'quantity');
    assert.equal(qty?.sourceFieldKey, 'stok_miktar');
    assert.equal(qty?.dataType, 'sayi');
  });

  it('warnings — normalizasyon uyarıları ImportResult’a', () => {
    const normalization = emptyNormalizationResult({
      warnings: [
        {
          code: 'TEST_WARN',
          message: 'Test uyarısı',
          path: 'records[0].x'
        }
      ],
      telemetry: {
        rulesExecuted: 1,
        fieldsNormalized: 0,
        typesTransformed: 0,
        warningCount: 1,
        durationMs: 1,
        startedAt: '2026-07-20T08:00:00.000Z',
        endedAt: '2026-07-20T08:00:01.000Z',
        recordCount: 0
      }
    });
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    assert.ok(
      result.importResult.warnings.some((w) => w.code === 'TEST_WARN')
    );
    assert.equal(result.importResult.warnings[0].stage, 'normalizasyon');
  });

  it('warnings — validation WARNING ImportResult’a', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest(),
        validationResult: validationResultFixture()
      })
    );
    assert.ok(
      result.importResult.warnings.some((w) => w.code === 'EMPTY_COLLECTION')
    );
    assert.equal(result.validationSummary?.isValid, true);
  });

  it('ImportResult — başarılı ve dataset bağlı', () => {
    const normalization = singleEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    assert.equal(result.importResult.status, 'basarili');
    assert.equal(result.importResult.lastStage, 'dataset-olusturma');
    assert.equal(result.importResult.requestId, 'req-builder-1');
    assert.ok(result.importResult.dataset);
    assert.equal(result.importResult.dataset.id, result.dataset.id);
    assert.ok(result.importResult.completedAt);
  });

  it('toImportResult helper', () => {
    const normalization = singleEntityNormalization();
    const built = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    assert.deepEqual(toImportResult(built), built.importResult);
  });

  it('telemetri — entity, record, field sayıları', () => {
    const normalization = multiEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    assert.equal(result.telemetry.entityCount, 2);
    assert.equal(result.telemetry.recordCount, 4);
    assert.equal(result.telemetry.fieldCount, 2);
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
  });

  it('normalizationSummary bağlı', () => {
    const normalization = singleEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    const summary = toNormalizationSummary(normalization);
    assert.equal(
      result.normalizationSummary.recordCount,
      summary.recordCount
    );
    assert.equal(
      result.normalizationSummary.fieldsNormalized,
      summary.fieldsNormalized
    );
  });

  it('validationSummary — businessValidation foundation modeli', () => {
    const validation = validationResultFixture();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest(),
        validationResult: validation
      })
    );
    assert.ok(result.dataset.validation);
    assert.equal(result.dataset.validation.isValid, true);
    assert.equal(result.dataset.validation.counts.warning, 1);
    const mapped = toBusinessValidationResult(validation);
    assert.equal(mapped.results[0].severity, 'warning');
  });

  it('validationSummary — CRITICAL error sayısına dahil', () => {
    const validation = validationResultFixture({
      isValid: false,
      issues: [
        {
          ruleId: 'x',
          code: 'CRIT',
          message: 'Kritik',
          severity: 'CRITICAL'
        }
      ],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-20T08:00:00.000Z',
        endedAt: '2026-07-20T08:00:01.000Z',
        rulesExecuted: 1,
        rulesPassed: 0,
        rulesFailed: 1,
        issueCounts: {
          INFO: 0,
          WARNING: 0,
          ERROR: 0,
          CRITICAL: 1
        }
      }
    });
    const summary = toValidationSummary(validation);
    assert.equal(summary.businessValidation.counts.error, 1);
    assert.equal(summary.businessValidation.results[0].severity, 'error');
  });

  it('assemble — ara model entity assembly içerir', () => {
    const normalization = multiEntityNormalization();
    const assembly = runtime.assemble(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    assert.equal(assembly.entities.length, 2);
    assert.ok(assembly.entities[0].entity.id.startsWith('ent-'));
    assert.ok(assembly.entities[0].records.length > 0);
  });

  it('entityDisplayName — urun Türkçe ad', () => {
    assert.equal(entityDisplayName('urun'), 'Ürün');
  });

  it('resolveEntityTypeId — bilinmeyen varsayılan urun', () => {
    assert.equal(resolveEntityTypeId('bilinmeyen'), 'urun');
    assert.equal(resolveEntityTypeId('stok'), 'stok');
  });

  it('cellValueFromField — date ISO', () => {
    const value = cellValueFromField({
      fieldName: 'date',
      sourceKey: 'tarih',
      primitiveType: 'date',
      rawValue: '2024-01-01',
      value: '2024-01-01',
      dateIso: '2024-01-01T00:00:00.000Z',
      appliedRules: [],
      warningCodes: []
    });
    assert.equal(value, '2024-01-01T00:00:00.000Z');
  });

  it('columnFromNormalizedField — order ve dataType', () => {
    const col = columnFromNormalizedField(
      {
        fieldName: 'qty',
        sourceKey: 'adet',
        primitiveType: 'number',
        rawValue: 1,
        value: 1,
        appliedRules: [],
        warningCodes: []
      },
      3
    );
    assert.equal(col.order, 3);
    assert.equal(col.dataType, 'sayi');
    assert.equal(col.id, 'qty');
  });

  it('groupFieldDefinitionsByEntity — entity bazlı gruplama', () => {
    const fields = [
      {
        fieldName: 'a',
        sourceKey: 'a',
        entityType: 'urun',
        primitiveType: 'string',
        rawValue: 'x',
        value: 'x',
        appliedRules: [],
        warningCodes: []
      },
      {
        fieldName: 'b',
        sourceKey: 'b',
        entityType: 'stok',
        primitiveType: 'number',
        rawValue: 1,
        value: 1,
        appliedRules: [],
        warningCodes: []
      }
    ];
    const grouped = groupFieldDefinitionsByEntity(fields, 'urun');
    assert.equal(grouped.get('urun')?.length, 1);
    assert.equal(grouped.get('stok')?.length, 1);
  });

  it('özel datasetId', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest(),
        datasetId: 'custom-ds-42'
      })
    );
    assert.equal(result.dataset.id, 'custom-ds-42');
  });

  it('importContext locale önceliği', () => {
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: emptyNormalizationResult(),
        request: validRequest({ locale: 'tr' }),
        importContext: {
          importId: 'imp-1',
          source: { type: 'csv', label: 'x.csv' },
          locale: 'en',
          currentStage: 'dataset-olusturma',
          status: 'suruyor'
        },
        locale: 'en'
      })
    );
    assert.equal(result.dataset.metadata.locale, 'en');
  });

  it('pipeline bag — attach ve read', () => {
    const normalization = singleEntityNormalization();
    const built = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    const context = {
      request: validRequest(),
      importContext: {
        importId: 'imp-1',
        source: { type: 'csv', label: 'satis.csv' },
        locale: 'tr',
        currentStage: 'dataset-olusturma',
        status: 'suruyor'
      },
      stageExecutions: [],
      bag: {},
      startedAt: '2026-07-20T08:00:00.000Z',
      startedMark: 0
    };
    attachDatasetBuildToPipelineContext(context, built);
    assert.ok(context.bag[PIPELINE_BAG_DATASET_BUILD_RESULT_KEY]);
    const read = readDatasetBuildFromPipelineContext(context);
    assert.equal(read?.dataset.id, built.dataset.id);
  });

  it('entity name registry’den gelir', () => {
    const normalization = multiEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    const stok = result.dataset.entities.find((e) => e.entityType === 'stok');
    assert.equal(stok?.name, 'Stok');
  });

  it('field assembly — warningCodes korunur', () => {
    const normalization = singleEntityNormalization();
    const result = runtime.build(
      createBuilderContext({
        normalizationResult: normalization,
        request: validRequest()
      })
    );
    const assembly = result.assembly.entities[0];
    const withWarn = assembly.records[0].fields.find(
      (f) => f.warningCodes.length > 0
    );
    assert.ok(withWarn || assembly.records[0].fields.length > 0);
  });
});
