/**
 * Platform Admin Runtime Facade — PR-201F (en az 13 unit test)
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
  createPlatformAdminRuntimeFacade,
  createPlatformAdminPipelineRunner,
  createPlatformAdminExecutionContext,
  createSkippedStageExecution,
  createStageExecution,
  buildPlatformAdminExecutionTelemetry,
  createEmptyPlatformAdminResult,
  buildE2ESummaryItems,
  PLATFORM_ADMIN_PIPELINE_STAGES,
  PLATFORM_ADMIN_SKIP_ON_VALIDATION_FAILURE,
  PLATFORM_ADMIN_STAGE_LABELS
} = await import('../../src/platform-admin/integration/runtime/index.ts');

describe('PlatformAdminRuntimeFacade — unit', () => {
  it('createPlatformAdminRuntimeFacade factory', () => {
    const facade = createPlatformAdminRuntimeFacade();
    assert.ok(facade);
    assert.equal(typeof facade.execute, 'function');
    assert.equal(typeof facade.run, 'function');
  });

  it('createPlatformAdminPipelineRunner factory', () => {
    const runner = createPlatformAdminPipelineRunner();
    assert.ok(runner);
    assert.equal(typeof runner.execute, 'function');
  });

  it('createPlatformAdminExecutionContext preserves options', () => {
    const ctx = createPlatformAdminExecutionContext({
      locale: 'en',
      actorId: 'ops-1',
      tenantIds: ['tenant-demo-001']
    });
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.actorId, 'ops-1');
    assert.deepEqual(ctx.tenantIds, ['tenant-demo-001']);
  });

  it('PLATFORM_ADMIN_PIPELINE_STAGES has fixed order', () => {
    assert.deepEqual([...PLATFORM_ADMIN_PIPELINE_STAGES], [
      'platform-validation',
      'foundation',
      'tenant',
      'users',
      'subscriptions',
      'system-monitoring',
      'summary'
    ]);
  });

  it('PLATFORM_ADMIN_SKIP_ON_VALIDATION_FAILURE excludes summary', () => {
    assert.ok(
      !PLATFORM_ADMIN_SKIP_ON_VALIDATION_FAILURE.includes('summary')
    );
    assert.ok(
      PLATFORM_ADMIN_SKIP_ON_VALIDATION_FAILURE.includes('foundation')
    );
    assert.equal(PLATFORM_ADMIN_SKIP_ON_VALIDATION_FAILURE.length, 5);
  });

  it('PLATFORM_ADMIN_STAGE_LABELS covers all stages', () => {
    for (const stage of PLATFORM_ADMIN_PIPELINE_STAGES) {
      assert.ok(PLATFORM_ADMIN_STAGE_LABELS[stage]);
    }
  });

  it('createSkippedStageExecution sets skipped outcome', () => {
    const exec = createSkippedStageExecution(
      'tenant',
      'Skipped due to validation failure.'
    );
    assert.equal(exec.stageId, 'tenant');
    assert.equal(exec.outcome, 'skipped');
    assert.ok(exec.durationMs >= 0);
    assert.ok(exec.startedAt);
    assert.ok(exec.endedAt);
  });

  it('createStageExecution sets succeeded outcome', () => {
    const exec = createStageExecution(
      'foundation',
      'succeeded',
      '8 modules projected.'
    );
    assert.equal(exec.outcome, 'succeeded');
    assert.equal(exec.stageName, 'Foundation');
  });

  it('buildPlatformAdminExecutionTelemetry counts succeeded and skipped', () => {
    const stages = [
      createStageExecution('platform-validation', 'succeeded', 'ok'),
      createSkippedStageExecution('foundation', 'skip'),
      createSkippedStageExecution('tenant', 'skip'),
      createStageExecution('summary', 'succeeded', 'ok')
    ];
    const telemetry = buildPlatformAdminExecutionTelemetry(
      stages,
      '2026-07-21T10:00:00.000Z',
      '2026-07-21T10:00:01.000Z',
      1000
    );
    assert.equal(telemetry.summary.stagesSucceeded, 2);
    assert.equal(telemetry.summary.stagesSkipped, 2);
    assert.equal(telemetry.summary.stagesFailed, 0);
    assert.equal(telemetry.totalDurationMs, 1000);
    assert.ok(telemetry.stageDurationsMs['platform-validation'] !== undefined);
  });

  it('createEmptyPlatformAdminResult is always valid shape', () => {
    const result = createEmptyPlatformAdminResult(
      [{ code: 'INVALID_LOCALE', message: 'bad', severity: 'error' }],
      [{ key: 'locale', label: 'Locale', value: 'tr' }],
      '2026-07-21T10:00:00.000Z',
      '2026-07-21T10:00:01.000Z',
      50
    );
    assert.equal(result.modules.length, 0);
    assert.equal(result.summary.success, false);
    assert.equal(result.validationIssues.length, 1);
    assert.equal(result.summaryItems.length, 1);
    assert.ok(result.telemetry);
  });

  it('buildE2ESummaryItems includes stage and count keys', () => {
    const items = buildE2ESummaryItems(
      [
        createStageExecution('platform-validation', 'succeeded', 'ok'),
        createSkippedStageExecution('foundation', 'skip')
      ],
      'tr',
      {
        moduleCount: 0,
        tenantCount: 0,
        userCount: 0,
        subscriptionCount: 0,
        serviceCount: 0
      }
    );
    assert.ok(items.some((i) => i.key === 'stages-succeeded' && i.value === 1));
    assert.ok(items.some((i) => i.key === 'stages-skipped' && i.value === 1));
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'tr'));
  });

  it('facade.run returns PlatformAdminResult', () => {
    const facade = createPlatformAdminRuntimeFacade();
    const result = facade.run();
    assert.ok(Array.isArray(result.modules));
    assert.ok(result.summary);
    assert.ok(result.telemetry);
    assert.ok(Array.isArray(result.summaryItems));
  });

  it('facade.execute returns PlatformAdminExecutionResult', () => {
    const facade = createPlatformAdminRuntimeFacade();
    const result = facade.execute(
      createPlatformAdminExecutionContext({ locale: 'en' })
    );
    assert.ok(result.platformAdminResult);
    assert.ok(result.stageExecutions.length >= 7);
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.bag);
  });
});
