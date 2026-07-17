/**
 * Validation Runtime — PR-101C (en az 15 unit test)
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
  createValidationRuntime,
  createValidationRegistryRuntime,
  createValidationContext,
  isBlockingSeverity,
  VALIDATION_RUNTIME_SEVERITY_LABELS,
  VALIDATION_SEVERITY_RANK,
  BUILTIN_VALIDATION_RULES,
  attachValidationToPipelineContext,
  readValidationFromPipelineContext,
  attachValidationToPipelineResult,
  readValidationFromPipelineResult,
  PIPELINE_BAG_VALIDATION_RESULT_KEY
} = await import('../../src/business/import/validators/runtime/index.ts');

function validRequest(overrides = {}) {
  return {
    id: 'req-1',
    source: { type: 'csv', label: 'satis.csv' },
    locale: 'tr',
    entityHints: ['urun', 'stok'],
    ...overrides
  };
}

function validImportContext(overrides = {}) {
  return {
    importId: 'imp-1',
    source: { type: 'csv', label: 'satis.csv' },
    locale: 'tr',
    currentStage: 'dogrulama',
    status: 'bekliyor',
    ...overrides
  };
}

function validMetadata(overrides = {}) {
  return {
    id: 'ds-1',
    title: 'Satış Dataset',
    locale: 'tr',
    createdAt: '2026-07-17T12:00:00.000Z',
    ...overrides
  };
}

function validDataset(overrides = {}) {
  return {
    id: 'ds-1',
    metadata: validMetadata(),
    version: {
      schemaVersion: '1.0.0',
      revision: '1',
      effectiveAt: '2026-07-17T12:00:00.000Z'
    },
    source: { type: 'csv', label: 'satis.csv' },
    entities: [
      {
        id: 'ent-urun',
        entityType: 'urun',
        name: 'Ürünler',
        layout: 'tablo',
        columns: [],
        rows: []
      }
    ],
    relations: [],
    ...overrides
  };
}

function validContext(overrides = {}) {
  return createValidationContext({
    request: validRequest(),
    importContext: validImportContext(),
    readerOutput: { rows: [{ sku: 'A1' }] },
    dataset: validDataset(),
    metadata: validMetadata(),
    ...overrides
  });
}

describe('ValidationRuntime', () => {
  /** @type {ReturnType<typeof createValidationRuntime>} */
  let runtime;

  beforeEach(() => {
    runtime = createValidationRuntime();
  });

  it('geçerli veri için isValid=true ve blocking issue yok', () => {
    const result = runtime.validate(validContext());
    assert.equal(result.isValid, true);
    assert.equal(
      result.issues.filter((i) => isBlockingSeverity(i.severity)).length,
      0
    );
    assert.ok(result.telemetry.rulesExecuted >= BUILTIN_VALIDATION_RULES.length);
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.rulesPassed > 0);
  });

  it('eksik ImportRequest.id ERROR üretir', () => {
    const result = runtime.validate(
      validContext({ request: validRequest({ id: '' }) })
    );
    assert.equal(result.isValid, false);
    assert.ok(
      result.issues.some(
        (i) => i.code === 'REQUIRED_FIELD' && i.path === 'request.id'
      )
    );
  });

  it('ImportRequest tanımsızsa CRITICAL', () => {
    const result = runtime.validate(
      createValidationContext({
        readerOutput: {},
        importContext: validImportContext(),
        dataset: validDataset()
      })
    );
    assert.equal(result.isValid, false);
    assert.ok(result.issues.some((i) => i.code === 'REQUEST_MISSING'));
    assert.ok(result.issues.some((i) => i.severity === 'CRITICAL'));
  });

  it('null request CRITICAL null-safety üretir', () => {
    const result = runtime.validate(
      createValidationContext({
        request: null,
        readerOutput: {}
      })
    );
    assert.equal(result.isValid, false);
    assert.ok(
      result.issues.some(
        (i) => i.code === 'NULL_VALUE' && i.path === 'request'
      )
    );
  });

  it('yanlış tip: readerOutput primitive ERROR', () => {
    const result = runtime.validate(
      validContext({ readerOutput: 'ham-metin' })
    );
    assert.equal(result.isValid, false);
    assert.ok(
      result.issues.some(
        (i) =>
          i.code === 'INVALID_PRIMITIVE' && i.path === 'readerOutput'
      )
    );
  });

  it('boş koleksiyon: entities WARNING', () => {
    const result = runtime.validate(
      validContext({
        dataset: validDataset({ entities: [] })
      })
    );
    assert.equal(result.isValid, true);
    assert.ok(
      result.issues.some(
        (i) =>
          i.code === 'EMPTY_COLLECTION' &&
          i.path === 'dataset.entities' &&
          i.severity === 'WARNING'
      )
    );
  });

  it('boş koleksiyon: readerOutput [] WARNING', () => {
    const result = runtime.validate(validContext({ readerOutput: [] }));
    assert.ok(
      result.issues.some(
        (i) =>
          i.code === 'EMPTY_COLLECTION' &&
          i.path === 'readerOutput' &&
          i.severity === 'WARNING'
      )
    );
  });

  it('çoklu hata: eksik source + yanlış locale + null metadata', () => {
    const result = runtime.validate(
      createValidationContext({
        request: { id: 'r1', source: null },
        importContext: validImportContext({ locale: 'de' }),
        readerOutput: {},
        metadata: null,
        dataset: validDataset({ metadata: null })
      })
    );
    assert.equal(result.isValid, false);
    assert.ok(result.issues.length >= 3);
    assert.ok(result.telemetry.rulesFailed >= 2);
  });

  it('severity sıralaması ve etiketleri tanımlı', () => {
    assert.equal(VALIDATION_SEVERITY_RANK.INFO, 1);
    assert.equal(VALIDATION_SEVERITY_RANK.CRITICAL, 4);
    assert.equal(VALIDATION_RUNTIME_SEVERITY_LABELS.ERROR, 'Hata');
    assert.equal(isBlockingSeverity('WARNING'), false);
    assert.equal(isBlockingSeverity('ERROR'), true);
  });

  it('registry: builtin kurallar seed edilir', () => {
    const registry = createValidationRegistryRuntime(true);
    assert.ok(registry.count() >= 9);
    assert.ok(registry.getById('import-request-required-fields'));
  });

  it('registry: register / unregister / clear', () => {
    const registry = createValidationRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'custom-rule',
      name: 'Özel',
      description: 'test',
      target: 'generic',
      defaultSeverity: 'INFO',
      validate: () => []
    });
    assert.equal(registry.count(), 1);
    assert.equal(registry.unregister('custom-rule'), true);
    registry.register({
      id: 'custom-rule',
      name: 'Özel',
      description: 'test',
      target: 'generic',
      defaultSeverity: 'INFO',
      validate: () => []
    });
    registry.clear();
    assert.equal(registry.count(), 0);
  });

  it('registry: duplicate register hata fırlatır', () => {
    const registry = createValidationRegistryRuntime(false);
    const rule = {
      id: 'dup',
      name: 'Dup',
      description: 'd',
      target: 'generic',
      defaultSeverity: 'INFO',
      validate: () => []
    };
    registry.register(rule);
    assert.throws(() => registry.register(rule), /zaten kayıtlı/);
  });

  it('telemetri: süre, kural sayıları ve issueCounts', () => {
    const result = runtime.validate(
      validContext({ request: validRequest({ id: '' }) })
    );
    const t = result.telemetry;
    assert.ok(typeof t.durationMs === 'number');
    assert.ok(t.startedAt);
    assert.ok(t.endedAt);
    assert.equal(t.rulesExecuted, t.rulesPassed + t.rulesFailed);
    assert.ok(t.issueCounts.ERROR >= 1);
  });

  it('pipeline context bag’e validation sonucu işlenir', () => {
    const result = runtime.validate(validContext());
    const bag = {};
    const pipelineContext = {
      request: validRequest(),
      importContext: validImportContext(),
      stageExecutions: [],
      bag,
      startedAt: new Date().toISOString(),
      startedMark: 0
    };
    attachValidationToPipelineContext(pipelineContext, result);
    assert.equal(
      bag[PIPELINE_BAG_VALIDATION_RESULT_KEY],
      result
    );
    assert.equal(readValidationFromPipelineContext(pipelineContext), result);
  });

  it('pipeline result bag üzerinden validation okunur', () => {
    const result = runtime.validate(validContext());
    const bag = {};
    const pipelineResult = {
      importResult: {
        requestId: 'req-1',
        status: 'basarili',
        lastStage: 'dogrulama',
        errors: [],
        warnings: []
      },
      context: {
        request: validRequest(),
        importContext: validImportContext(),
        stageExecutions: [],
        bag,
        startedAt: new Date().toISOString(),
        startedMark: 0
      },
      stageExecutions: [],
      totalDurationMs: 1
    };
    attachValidationToPipelineResult(pipelineResult, result);
    assert.equal(readValidationFromPipelineResult(pipelineResult), result);
  });

  it('yanlış tip: entities dizi değilse ERROR', () => {
    const result = runtime.validate(
      validContext({
        dataset: validDataset({ entities: 'degil-dizi' })
      })
    );
    assert.equal(result.isValid, false);
    assert.ok(
      result.issues.some(
        (i) =>
          i.code === 'INVALID_COLLECTION' &&
          i.path === 'dataset.entities'
      )
    );
  });

  it('entityHints null ve yanlış eleman tipi', () => {
    const nullHints = runtime.validate(
      validContext({ request: validRequest({ entityHints: null }) })
    );
    assert.ok(nullHints.issues.some((i) => i.path === 'request.entityHints'));

    const badHints = runtime.validate(
      validContext({ request: validRequest({ entityHints: ['', 2] }) })
    );
    assert.ok(
      badHints.issues.some((i) => i.path === 'request.entityHints[0]')
    );
  });

  it('metadata eksik alan ve id uyuşmazlığı', () => {
    const result = runtime.validate(
      validContext({
        metadata: validMetadata({ id: 'other', title: '', createdAt: '' }),
        dataset: validDataset()
      })
    );
    assert.equal(result.isValid, false);
    assert.ok(result.issues.some((i) => i.code === 'METADATA_ID_MISMATCH'));
    assert.ok(
      result.issues.some(
        (i) => i.code === 'REQUIRED_FIELD' && i.path === 'metadata.title'
      )
    );
  });
});
