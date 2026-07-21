/**
 * End-to-End Platform Admin Runtime — PR-201F (en az 16 integration test)
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
  createPlatformAdminRuntimeFacade,
  createPlatformAdminPipelineRunner,
  createPlatformAdminExecutionContext,
  PLATFORM_ADMIN_PIPELINE_STAGES,
  PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY,
  PIPELINE_BAG_TENANT_MANAGEMENT_RESULT_KEY,
  PIPELINE_BAG_USER_MANAGEMENT_RESULT_KEY,
  PIPELINE_BAG_SUBSCRIPTION_MANAGEMENT_RESULT_KEY,
  PIPELINE_BAG_SYSTEM_MONITORING_RESULT_KEY,
  BUILTIN_PLATFORM_ADMIN_MODULE_COUNT,
  BUILTIN_TENANT_DEFINITION_COUNT,
  BUILTIN_USER_DEFINITION_COUNT,
  BUILTIN_SUBSCRIPTION_DEFINITION_COUNT,
  BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT
} = await import('../../src/platform-admin/index.ts');

describe('Platform Admin End-to-End Runtime', () => {
  let facade;
  let runner;

  beforeEach(() => {
    facade = createPlatformAdminRuntimeFacade();
    runner = createPlatformAdminPipelineRunner();
  });

  it('full pipeline runs all stages in order', () => {
    const result = runner.execute(createPlatformAdminExecutionContext());
    const stageIds = result.stageExecutions.map((s) => s.stageId);
    assert.deepEqual(stageIds, [...PLATFORM_ADMIN_PIPELINE_STAGES]);
    assert.ok(
      result.stageExecutions.every((s) => s.outcome === 'succeeded')
    );
  });

  it('full pipeline projects foundation modules', () => {
    const result = facade.execute();
    assert.equal(
      result.platformAdminResult.modules.length,
      BUILTIN_PLATFORM_ADMIN_MODULE_COUNT
    );
    assert.equal(result.platformAdminResult.summary.success, true);
  });

  it('full pipeline projects tenants, users, subscriptions, services', () => {
    const result = facade.execute();
    assert.equal(
      result.tenantResult?.summary.tenantCount,
      BUILTIN_TENANT_DEFINITION_COUNT
    );
    assert.equal(
      result.userResult?.summary.userCount,
      BUILTIN_USER_DEFINITION_COUNT
    );
    assert.equal(
      result.subscriptionResult?.summary.subscriptionCount,
      BUILTIN_SUBSCRIPTION_DEFINITION_COUNT
    );
    assert.equal(
      result.systemMonitoringResult?.summary.serviceCount,
      BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT
    );
  });

  it('validation failure skips foundation through monitoring', () => {
    const result = runner.execute(
      createPlatformAdminExecutionContext({ locale: 'xx' })
    );
    const byId = Object.fromEntries(
      result.stageExecutions.map((s) => [s.stageId, s])
    );
    assert.equal(byId['platform-validation'].outcome, 'failed');
    assert.equal(byId.foundation.outcome, 'skipped');
    assert.equal(byId.tenant.outcome, 'skipped');
    assert.equal(byId.users.outcome, 'skipped');
    assert.equal(byId.subscriptions.outcome, 'skipped');
    assert.equal(byId['system-monitoring'].outcome, 'skipped');
  });

  it('validation failure still runs summary', () => {
    const result = runner.execute(
      createPlatformAdminExecutionContext({ locale: 'xx' })
    );
    const summary = result.stageExecutions.find((s) => s.stageId === 'summary');
    assert.ok(summary);
    assert.equal(summary.outcome, 'succeeded');
  });

  it('validation failure still returns valid PlatformAdminResult', () => {
    const result = facade.execute(
      createPlatformAdminExecutionContext({ locale: 'xx' })
    );
    assert.ok(result.platformAdminResult);
    assert.equal(result.platformAdminResult.modules.length, 0);
    assert.equal(result.platformAdminResult.summary.success, false);
    assert.ok(
      result.platformAdminResult.validationIssues.some(
        (i) => i.code === 'INVALID_LOCALE'
      )
    );
    assert.ok(result.platformAdminResult.summaryItems.length > 0);
    assert.ok(result.platformAdminResult.telemetry);
  });

  it('validation failure does not produce module runtime results', () => {
    const result = facade.execute(
      createPlatformAdminExecutionContext({ locale: 'xx' })
    );
    assert.equal(result.tenantResult, undefined);
    assert.equal(result.userResult, undefined);
    assert.equal(result.subscriptionResult, undefined);
    assert.equal(result.systemMonitoringResult, undefined);
  });

  it('empty input runs full successful pipeline', () => {
    const result = facade.execute({});
    assert.equal(result.telemetry.summary.success, true);
    assert.equal(result.telemetry.summary.stagesSkipped, 0);
    assert.equal(
      result.telemetry.summary.stagesSucceeded,
      PLATFORM_ADMIN_PIPELINE_STAGES.length
    );
  });

  it('stage order matches PLATFORM_ADMIN_PIPELINE_STAGES', () => {
    const result = runner.execute();
    assert.deepEqual(
      result.stageExecutions.map((s) => s.stageId),
      [...PLATFORM_ADMIN_PIPELINE_STAGES]
    );
  });

  it('bag uses existing Platform Admin result keys', () => {
    const result = facade.execute();
    assert.ok(result.bag[PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_TENANT_MANAGEMENT_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_USER_MANAGEMENT_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_SUBSCRIPTION_MANAGEMENT_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_SYSTEM_MONITORING_RESULT_KEY]);
  });

  it('initialBag is preserved and merged', () => {
    const result = facade.execute(
      createPlatformAdminExecutionContext({
        initialBag: { customFlag: true }
      })
    );
    assert.equal(result.bag.customFlag, true);
    assert.ok(result.bag[PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY]);
  });

  it('telemetry includes total duration and stage durations', () => {
    const result = facade.execute();
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    for (const stage of PLATFORM_ADMIN_PIPELINE_STAGES) {
      assert.ok(result.telemetry.stageDurationsMs[stage] !== undefined);
      assert.equal(result.telemetry.stageOutcomes[stage], 'succeeded');
    }
  });

  it('telemetry reports succeeded and skipped counts on validation failure', () => {
    const result = facade.execute(
      createPlatformAdminExecutionContext({ locale: 'xx' })
    );
    assert.equal(result.telemetry.summary.stagesSucceeded, 1); // summary only
    assert.equal(result.telemetry.summary.stagesSkipped, 5);
    assert.equal(result.telemetry.summary.stagesFailed, 1);
    assert.equal(result.telemetry.summary.success, false);
  });

  it('PlatformAdminResult summaryItems include e2e keys', () => {
    const result = facade.execute();
    const keys = result.platformAdminResult.summaryItems.map((i) => i.key);
    assert.ok(keys.includes('stages-succeeded'));
    assert.ok(keys.includes('tenant-count'));
    assert.ok(keys.includes('user-count'));
    assert.ok(keys.includes('subscription-count'));
    assert.ok(keys.includes('service-count'));
  });

  it('facade.run shortcut returns PlatformAdminResult only', () => {
    const result = facade.run({ locale: 'en' });
    assert.ok(result.modules.length > 0);
    assert.equal(result.summary.success, true);
    assert.ok(!('stageExecutions' in result));
  });

  it('filtered execution respects module and tenant ids', () => {
    const result = facade.execute(
      createPlatformAdminExecutionContext({
        moduleIds: ['tenant', 'users'],
        tenantIds: ['tenant-demo-001']
      })
    );
    assert.equal(result.platformAdminResult.modules.length, 2);
    assert.equal(result.tenantResult?.summary.tenantCount, 1);
    assert.equal(
      result.tenantResult?.tenants[0]?.identity.id,
      'tenant-demo-001'
    );
  });
});
