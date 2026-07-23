/**
 * Import Pipeline Runtime orchestrator — PR-101A
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

const { IMPORT_PIPELINE_STAGE_COUNT, IMPORT_PIPELINE_STAGES } = await import(
  '../../src/business/import/pipeline/ImportPipeline.ts'
);
const { createImportPipelineRuntime, IMPORT_RUNTIME_ERROR_CODES } =
  await import('../../src/business/import/pipeline/runtime/index.ts');

function sampleRequest(overrides = {}) {
  return {
    id: 'import-test-001',
    source: {
      type: 'csv',
      label: 'ornek.csv'
    },
    locale: 'tr',
    ...overrides
  };
}

describe('ImportPipelineRuntime', () => {
  it('runs all foundation stages in order', async () => {
    const runtime = createImportPipelineRuntime();
    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, IMPORT_PIPELINE_STAGE_COUNT);
    assert.deepEqual(
      detailed.stageExecutions.map((s) => s.stageId),
      IMPORT_PIPELINE_STAGES.map((s) => s.id)
    );
    assert.ok(detailed.totalDurationMs >= 0);
  });

  it('selects adapter successfully and marks later stages not-implemented', async () => {
    const runtime = createImportPipelineRuntime();
    const detailed = await runtime.runWithDetails(sampleRequest());

    const adapterStage = detailed.stageExecutions[0];
    assert.equal(adapterStage.stageId, 'adapter-secimi');
    assert.equal(adapterStage.outcome, 'basarili');
    assert.equal(
      detailed.context.bag.selectedAdapter?.id,
      'csv'
    );

    const middle = detailed.stageExecutions.filter((s) =>
      [
        'okuma',
        'tespit',
        'semantik-esleme',
        'normalizasyon',
        'dogrulama',
        'dataset-olusturma'
      ].includes(s.stageId)
    );
    assert.ok(middle.every((s) => s.outcome === 'not-implemented'));
    assert.ok(
      middle.every((s) =>
        s.errors.some((e) => e.code === IMPORT_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED)
      )
    );

    assert.equal(detailed.importResult.status, 'basarisiz');
    assert.equal(detailed.importResult.dataset, undefined);
  });

  it('implements IImportPipeline.run returning ImportResult', async () => {
    const runtime = createImportPipelineRuntime();
    const result = await runtime.run(sampleRequest());
    assert.equal(result.requestId, 'import-test-001');
    assert.ok(result.completedAt);
    assert.ok(Array.isArray(result.errors));
    assert.ok(result.errors.some((e) => e.code === 'NOT_IMPLEMENTED'));
  });

  it('fails adapter selection for unknown source type without reading files', async () => {
    const runtime = createImportPipelineRuntime();
    const badRequest = sampleRequest();
    badRequest.source = { type: /** @type {any} */ ('bilinmeyen'), label: 'x' };
    const detailed = await runtime.runWithDetails(badRequest);

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (e) => e.code === IMPORT_RUNTIME_ERROR_CODES.ADAPTER_NOT_FOUND
      )
    );
    assert.equal(detailed.importResult.status, 'basarisiz');
    const skipped = detailed.stageExecutions.filter(
      (s) => s.outcome === 'atlandi'
    );
    assert.ok(skipped.length > 0);
  });

  it('records per-stage durationMs', async () => {
    const runtime = createImportPipelineRuntime();
    const detailed = await runtime.runWithDetails(sampleRequest());
    for (const stage of detailed.stageExecutions) {
      assert.ok(typeof stage.durationMs === 'number');
      assert.ok(stage.durationMs >= 0);
      assert.ok(stage.startedAt);
      assert.ok(stage.endedAt);
    }
  });
});
