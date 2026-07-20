/**
 * Import Runtime Facade — PR-101J (en az 10 unit test)
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
  createImportRuntimeFacade,
  createPipelineRunner,
  createImportExecutionContext,
  createPipelineContextFromExecution,
  importTargetFromRequest,
  buildExecutionTelemetry,
  adapterLabelForSourceType
} = await import('../../src/business/import/integration/runtime/index.ts');

describe('ImportRuntimeFacade — unit', () => {
  it('createImportRuntimeFacade fabrika', () => {
    const facade = createImportRuntimeFacade();
    assert.ok(facade);
    assert.equal(typeof facade.execute, 'function');
    assert.equal(typeof facade.run, 'function');
  });

  it('createPipelineRunner fabrika', () => {
    const runner = createPipelineRunner();
    assert.ok(runner);
    assert.equal(typeof runner.execute, 'function');
  });

  it('createImportExecutionContext — request korunur', () => {
    const ctx = createImportExecutionContext({
      request: { id: 'u-1', source: { type: 'csv', label: 'a.csv' } },
      csvContent: 'a,b\n1,2'
    });
    assert.equal(ctx.request.id, 'u-1');
    assert.equal(ctx.csvContent, 'a,b\n1,2');
  });

  it('createPipelineContextFromExecution — metadata csvContent', () => {
    const ctx = createPipelineContextFromExecution(
      createImportExecutionContext({
        request: { id: 'u-2', source: { type: 'csv', label: 'b.csv' } },
        csvContent: 'x,y\n1,2'
      })
    );
    assert.equal(ctx.request.id, 'u-2');
    assert.equal(ctx.importContext.metadata?.csvContent, 'x,y\n1,2');
    assert.equal(ctx.importContext.status, 'bekliyor');
  });

  it('createPipelineContextFromExecution — excelWorkbook metadata', () => {
    const wb = { sheets: [{ name: 'S1', rows: [['a']] }] };
    const ctx = createPipelineContextFromExecution(
      createImportExecutionContext({
        request: { id: 'u-3', source: { type: 'excel', label: 'c.xlsx' } },
        excelWorkbook: wb
      })
    );
    assert.ok(ctx.importContext.metadata?.excelWorkbook);
    assert.ok(ctx.importContext.metadata.excelWorkbook.includes('S1'));
  });

  it('importTargetFromRequest — csv extension ve mime', () => {
    const target = importTargetFromRequest({
      id: 'u-4',
      source: { type: 'csv', label: 'veri.csv' }
    });
    assert.equal(target.sourceType, 'csv');
    assert.equal(target.extension, '.csv');
    assert.equal(target.mimeType, 'text/csv');
  });

  it('importTargetFromRequest — excel extension', () => {
    const target = importTargetFromRequest({
      id: 'u-5',
      source: { type: 'excel', label: 'rapor.xlsx' }
    });
    assert.equal(target.sourceType, 'excel');
    assert.equal(target.extension, '.xlsx');
    assert.ok(target.mimeType?.includes('spreadsheet'));
  });

  it('buildExecutionTelemetry — özet sayıları', () => {
    const context = createPipelineContextFromExecution(
      createImportExecutionContext({
        request: { id: 'u-6', source: { type: 'csv', label: 'd.csv' } }
      })
    );
    context.stageExecutions.push({
      stageId: 'okuma',
      stageName: 'Okuma',
      outcome: 'basarili',
      startedAt: '2026-07-20T08:00:00.000Z',
      endedAt: '2026-07-20T08:00:01.000Z',
      durationMs: 10,
      errors: [],
      warnings: []
    });
    const telemetry = buildExecutionTelemetry(
      context,
      '2026-07-20T08:00:00.000Z',
      '2026-07-20T08:00:02.000Z',
      20
    );
    assert.equal(telemetry.totalDurationMs, 20);
    assert.equal(telemetry.summary.stagesSucceeded, 1);
    assert.equal(telemetry.stageDurationsMs.okuma, 10);
    assert.equal(telemetry.stageOutcomes.okuma, 'basarili');
  });

  it('adapterLabelForSourceType — csv Türkçe ad', () => {
    assert.equal(adapterLabelForSourceType('csv'), 'CSV');
  });

  it('adapterLabelForSourceType — bilinmeyen tip fallback', () => {
    assert.equal(adapterLabelForSourceType('bilinmeyen-tip'), 'bilinmeyen-tip');
  });

  it('skipReaderRegistration — boş registry', () => {
    const runner = createPipelineRunner({ skipReaderRegistration: true });
    assert.ok(runner);
  });

  it('ImportExecutionContext — haltOnValidationFailure varsayılan', () => {
    const ctx = createImportExecutionContext({
      request: { id: 'u-7', source: { type: 'csv', label: 'e.csv' } }
    });
    assert.equal(ctx.haltOnValidationFailure, undefined);
  });
});
