/**
 * Reader Registry Runtime — PR-101B (en az 10 test)
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
  createReaderRegistryRuntime,
  createReaderFactory,
  StubImportReader,
  DuplicateReaderError,
  InvalidRegistrationError,
  ReaderNotFoundError,
  UnsupportedSourceError,
  attachReaderLookupToPipelineContext,
  readReaderLookupFromPipelineContext,
  normalizeExtension
} = await import('../../src/business/import/readers/runtime/index.ts');

function csvRegistration(overrides = {}) {
  return {
    descriptor: {
      id: 'csv-meta-reader',
      name: 'CSV Metadata Reader',
      description: 'Yalnızca kayıt — okuma yok',
      sourceTypes: ['csv'],
      mimeTypes: ['text/csv'],
      extensions: ['.csv'],
      priority: 10,
      version: '0.1.0',
      ...overrides
    }
  };
}

describe('ReaderRegistryRuntime', () => {
  /** @type {ReturnType<typeof createReaderRegistryRuntime>} */
  let registry;

  beforeEach(() => {
    registry = createReaderRegistryRuntime();
  });

  it('register() adds a reader and count() increases', () => {
    assert.equal(registry.count(), 0);
    registry.register(csvRegistration());
    assert.equal(registry.count(), 1);
    assert.equal(registry.getAll().length, 1);
  });

  it('unregister() removes a reader', () => {
    registry.register(csvRegistration());
    assert.equal(registry.unregister('csv-meta-reader'), true);
    assert.equal(registry.count(), 0);
    assert.equal(registry.unregister('csv-meta-reader'), false);
  });

  it('resolve() selects by sourceType and extension metadata', () => {
    registry.register(csvRegistration());
    const result = registry.resolve({
      sourceType: 'csv',
      extension: 'csv',
      mimeType: 'text/csv'
    });
    assert.equal(result.found, true);
    assert.equal(result.registration?.descriptor.id, 'csv-meta-reader');
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.reason.matchedFields.includes('sourceType'));
  });

  it('duplicate register() throws DuplicateReaderError', () => {
    registry.register(csvRegistration());
    assert.throws(
      () => registry.register(csvRegistration()),
      (err) => {
        assert.ok(err instanceof DuplicateReaderError);
        assert.equal(err.code, 'DUPLICATE_READER');
        return true;
      }
    );
  });

  it('invalid registration throws InvalidRegistrationError', () => {
    assert.throws(
      () =>
        registry.register({
          descriptor: {
            id: '',
            name: 'X',
            sourceTypes: ['csv'],
            version: '1'
          }
        }),
      (err) => err instanceof InvalidRegistrationError
    );
    assert.throws(
      () =>
        registry.register({
          descriptor: {
            id: 'no-sources',
            name: 'X',
            sourceTypes: [],
            version: '1'
          }
        }),
      (err) => err instanceof InvalidRegistrationError
    );
  });

  it('supports() returns false for unsupported source', () => {
    registry.register(csvRegistration());
    assert.equal(registry.supports({ sourceType: 'excel' }), false);
    assert.equal(
      registry.supports({ sourceType: 'csv', extension: '.csv' }),
      true
    );
  });

  it('clear() empties the registry', () => {
    registry.register(csvRegistration());
    registry.register({
      descriptor: {
        id: 'json-meta',
        name: 'JSON',
        sourceTypes: ['json'],
        extensions: ['.json'],
        version: '0.1.0'
      }
    });
    assert.equal(registry.count(), 2);
    registry.clear();
    assert.equal(registry.count(), 0);
    assert.deepEqual(registry.getAll(), []);
  });

  it('resolve(throwIfMissing) raises ReaderNotFound / UnsupportedSource', () => {
    registry.register(csvRegistration());
    assert.throws(
      () =>
        registry.resolve(
          { sourceType: 'pdf' },
          { throwIfMissing: true }
        ),
      (err) => err instanceof ReaderNotFoundError
    );
    assert.throws(
      () => registry.resolve({}, { throwIfMissing: true }),
      (err) => err instanceof UnsupportedSourceError
    );
  });

  it('prefers higher priority and tenant-specific readers', () => {
    registry.register(
      csvRegistration({ id: 'csv-global', priority: 1, tenantId: undefined })
    );
    registry.register(
      csvRegistration({
        id: 'csv-tenant-a',
        priority: 5,
        tenantId: 'tenant-a'
      })
    );
    const globalHit = registry.resolve({ sourceType: 'csv', extension: '.csv' });
    assert.equal(globalHit.registration?.descriptor.id, 'csv-global');

    const tenantHit = registry.resolve({
      sourceType: 'csv',
      extension: '.csv',
      tenantId: 'tenant-a'
    });
    assert.equal(tenantHit.registration?.descriptor.id, 'csv-tenant-a');
  });

  it('ReaderFactory creates stub reader without reading files', async () => {
    registry.register(csvRegistration());
    const factory = createReaderFactory(registry);
    const { reader, readerId, telemetry } = factory.create({
      sourceType: 'csv',
      extension: '.csv'
    });
    assert.equal(readerId, 'csv-meta-reader');
    assert.ok(reader instanceof StubImportReader);
    assert.equal(reader.adapterType, 'csv');
    assert.equal(telemetry.found, true);
    await assert.rejects(() =>
      reader.read({
        importId: 'i1',
        source: { type: 'csv', label: 'a.csv' },
        locale: 'tr',
        currentStage: 'okuma',
        status: 'suruyor'
      })
    );
  });

  it('attachReaderLookupToPipelineContext stores telemetry on bag', () => {
    registry.register(csvRegistration());
    const { telemetry } = registry.resolve({
      sourceType: 'csv',
      mimeType: 'text/csv'
    });
    const context = {
      request: { id: 'r1', source: { type: 'csv', label: 'a' } },
      importContext: {
        importId: 'r1',
        source: { type: 'csv', label: 'a' },
        locale: 'tr',
        currentStage: 'okuma',
        status: 'suruyor'
      },
      stageExecutions: [],
      bag: {},
      startedAt: new Date().toISOString(),
      startedMark: 0
    };
    attachReaderLookupToPipelineContext(context, telemetry);
    const readBack = readReaderLookupFromPipelineContext(context);
    assert.equal(readBack?.selectedReaderId, 'csv-meta-reader');
    assert.ok(typeof readBack?.durationMs === 'number');
  });

  it('normalizeExtension adds leading dot', () => {
    assert.equal(normalizeExtension('CSV'), '.csv');
    assert.equal(normalizeExtension('.xlsx'), '.xlsx');
  });
});
