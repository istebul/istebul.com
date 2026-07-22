/**
 * Business Admin Runtime Facade — PR-202F (en az 15 unit test)
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
  createBusinessAdminRuntimeFacade,
  createBusinessAdminPipelineRunner,
  createBusinessAdminExecutionContext,
  createSkippedStageExecution,
  createStageExecution,
  buildBusinessAdminExecutionTelemetry,
  createEmptyBusinessAdminResult,
  buildE2ESummaryItems,
  BUSINESS_ADMIN_PIPELINE_STAGES,
  BUSINESS_ADMIN_SKIP_ON_VALIDATION_FAILURE,
  BUSINESS_ADMIN_STAGE_LABELS
} = await import('../../src/business-admin/integration/runtime/index.ts');

describe('BusinessAdminRuntimeFacade — unit', () => {
  it('createBusinessAdminRuntimeFacade factory', () => {
    const facade = createBusinessAdminRuntimeFacade();
    assert.ok(facade);
    assert.equal(typeof facade.execute, 'function');
    assert.equal(typeof facade.run, 'function');
  });

  it('createBusinessAdminPipelineRunner factory', () => {
    const runner = createBusinessAdminPipelineRunner();
    assert.ok(runner);
    assert.equal(typeof runner.execute, 'function');
  });

  it('createBusinessAdminExecutionContext preserves options', () => {
    const ctx = createBusinessAdminExecutionContext({
      tenantId: 'tenant-1',
      locale: 'en',
      actorId: 'ops-1',
      moduleIds: ['dashboard', 'reports']
    });
    assert.equal(ctx.tenantId, 'tenant-1');
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.actorId, 'ops-1');
    assert.deepEqual(ctx.moduleIds, ['dashboard', 'reports']);
  });

  it('BUSINESS_ADMIN_PIPELINE_STAGES has fixed order', () => {
    assert.deepEqual([...BUSINESS_ADMIN_PIPELINE_STAGES], [
      'business-validation',
      'foundation',
      'dashboard',
      'reports',
      'exports',
      'settings',
      'summary'
    ]);
  });

  it('BUSINESS_ADMIN_SKIP_ON_VALIDATION_FAILURE excludes summary', () => {
    assert.ok(!BUSINESS_ADMIN_SKIP_ON_VALIDATION_FAILURE.includes('summary'));
    assert.ok(
      BUSINESS_ADMIN_SKIP_ON_VALIDATION_FAILURE.includes('foundation')
    );
    assert.ok(
      BUSINESS_ADMIN_SKIP_ON_VALIDATION_FAILURE.includes('dashboard')
    );
    assert.equal(BUSINESS_ADMIN_SKIP_ON_VALIDATION_FAILURE.length, 5);
  });

  it('BUSINESS_ADMIN_STAGE_LABELS covers all stages', () => {
    for (const stage of BUSINESS_ADMIN_PIPELINE_STAGES) {
      assert.ok(BUSINESS_ADMIN_STAGE_LABELS[stage]);
    }
  });

  it('createSkippedStageExecution sets skipped outcome', () => {
    const exec = createSkippedStageExecution(
      'dashboard',
      'Skipped due to validation failure.'
    );
    assert.equal(exec.stageId, 'dashboard');
    assert.equal(exec.outcome, 'skipped');
    assert.ok(exec.durationMs >= 0);
    assert.ok(exec.startedAt);
    assert.ok(exec.endedAt);
  });

  it('createStageExecution sets succeeded outcome', () => {
    const exec = createStageExecution(
      'foundation',
      'succeeded',
      '6 modules projected.'
    );
    assert.equal(exec.outcome, 'succeeded');
    assert.equal(exec.stageName, 'Foundation');
  });

  it('buildBusinessAdminExecutionTelemetry counts succeeded and skipped', () => {
    const stages = [
      createStageExecution('business-validation', 'succeeded', 'ok'),
      createSkippedStageExecution('foundation', 'skip'),
      createSkippedStageExecution('dashboard', 'skip'),
      createStageExecution('summary', 'succeeded', 'ok')
    ];
    const telemetry = buildBusinessAdminExecutionTelemetry(
      stages,
      '2026-07-22T10:00:00.000Z',
      '2026-07-22T10:00:01.000Z',
      1000
    );
    assert.equal(telemetry.summary.stagesSucceeded, 2);
    assert.equal(telemetry.summary.stagesSkipped, 2);
    assert.equal(telemetry.summary.stagesFailed, 0);
    assert.equal(telemetry.totalDurationMs, 1000);
    assert.ok(
      telemetry.stageDurationsMs['business-validation'] !== undefined
    );
  });

  it('createEmptyBusinessAdminResult is always valid shape', () => {
    const result = createEmptyBusinessAdminResult(
      'tenant-1',
      [{ code: 'INVALID_LOCALE', message: 'bad', severity: 'error' }],
      [{ key: 'locale', label: 'Locale', value: 'tr' }],
      '2026-07-22T10:00:00.000Z',
      '2026-07-22T10:00:01.000Z',
      50
    );
    assert.equal(result.modules.length, 0);
    assert.equal(result.summary.success, false);
    assert.equal(result.summary.tenantId, 'tenant-1');
    assert.equal(result.validationIssues.length, 1);
    assert.equal(result.summaryItems.length, 1);
    assert.ok(result.telemetry);
  });

  it('buildE2ESummaryItems includes stage and workspace count keys', () => {
    const items = buildE2ESummaryItems(
      [
        createStageExecution('business-validation', 'succeeded', 'ok'),
        createSkippedStageExecution('foundation', 'skip')
      ],
      'tr',
      {
        moduleCount: 0,
        dashboardWidgetCount: 0,
        reportsWidgetCount: 0,
        exportWidgetCount: 0,
        settingsSectionCount: 0
      }
    );
    assert.ok(items.some((i) => i.key === 'stages-succeeded' && i.value === 1));
    assert.ok(items.some((i) => i.key === 'stages-skipped' && i.value === 1));
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'tr'));
    assert.ok(items.some((i) => i.key === 'dashboard-widget-count'));
    assert.ok(items.some((i) => i.key === 'settings-section-count'));
  });

  it('facade.run returns BusinessAdminResult', () => {
    const facade = createBusinessAdminRuntimeFacade();
    const result = facade.run({ tenantId: 'tenant-1' });
    assert.ok(Array.isArray(result.modules));
    assert.ok(result.summary);
    assert.ok(result.telemetry);
    assert.ok(Array.isArray(result.summaryItems));
  });

  it('facade.execute returns BusinessAdminExecutionResult', () => {
    const facade = createBusinessAdminRuntimeFacade();
    const result = facade.execute(
      createBusinessAdminExecutionContext({
        tenantId: 'tenant-1',
        locale: 'en'
      })
    );
    assert.ok(result.businessAdminResult);
    assert.ok(result.stageExecutions.length >= 7);
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.bag);
  });

  it('createStageExecution accepts explicit timing', () => {
    const exec = createStageExecution('summary', 'succeeded', 'ok', {
      durationMs: 12,
      startedAt: '2026-07-22T10:00:00.000Z',
      endedAt: '2026-07-22T10:00:00.012Z'
    });
    assert.equal(exec.durationMs, 12);
    assert.equal(exec.startedAt, '2026-07-22T10:00:00.000Z');
  });

  it('telemetry marks success false when a stage failed', () => {
    const telemetry = buildBusinessAdminExecutionTelemetry(
      [
        createStageExecution('business-validation', 'failed', 'bad'),
        createStageExecution('summary', 'succeeded', 'ok')
      ],
      '2026-07-22T10:00:00.000Z',
      '2026-07-22T10:00:01.000Z',
      100
    );
    assert.equal(telemetry.summary.stagesFailed, 1);
    assert.equal(telemetry.summary.success, false);
  });
});
