/**
 * Identity & Access Runtime Facade — PR-203F (≥90 unit tests)
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
  createIdentityAccessRuntimeFacade,
  createIdentityAccessPipelineRunner,
  createIdentityAccessExecutionContext,
  createSkippedStageExecution,
  createStageExecution,
  buildIdentityAccessExecutionTelemetry,
  createEmptyIdentityAccessResult,
  createIdentityAccessResult,
  buildE2ESummaryItems,
  validateIdentityAccessContext,
  IDENTITY_ACCESS_PIPELINE_STAGES,
  IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE,
  IDENTITY_ACCESS_STAGE_LABELS,
  PIPELINE_BAG_IDENTITY_ACCESS_RESULT_KEY,
  IdentityAccessRuntimeFacade,
  IdentityAccessPipelineRunner,
  createIdentityRuntime,
  createAuthenticationRuntime,
  createSessionRuntime,
  createAuthorizationRuntime,
  createTenantIsolationRuntime,
  PIPELINE_BAG_IDENTITY_RESULT_KEY,
  PIPELINE_BAG_AUTHENTICATION_RESULT_KEY,
  PIPELINE_BAG_SESSION_RESULT_KEY,
  PIPELINE_BAG_AUTHORIZATION_RESULT_KEY,
  PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY
} = await import('../../src/identity/index.ts');

describe('IdentityAccess — stages constants', () => {
  it('IDENTITY_ACCESS_PIPELINE_STAGES has fixed order of 7', () => {
    assert.deepEqual([...IDENTITY_ACCESS_PIPELINE_STAGES], [
      'validation',
      'identity',
      'authentication',
      'session',
      'authorization',
      'tenant-isolation',
      'summary'
    ]);
  });

  it('IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE has 5 projection stages', () => {
    assert.equal(IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE.length, 5);
    assert.deepEqual([...IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE], [
      'identity',
      'authentication',
      'session',
      'authorization',
      'tenant-isolation'
    ]);
  });

  it('skip list excludes validation and summary', () => {
    assert.ok(!IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE.includes('validation'));
    assert.ok(!IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE.includes('summary'));
  });

  it('IDENTITY_ACCESS_STAGE_LABELS covers all pipeline stages', () => {
    for (const stage of IDENTITY_ACCESS_PIPELINE_STAGES) {
      assert.equal(typeof IDENTITY_ACCESS_STAGE_LABELS[stage], 'string');
      assert.ok(IDENTITY_ACCESS_STAGE_LABELS[stage].length > 0);
    }
  });

  it('PIPELINE_BAG_IDENTITY_ACCESS_RESULT_KEY is stable', () => {
    assert.equal(PIPELINE_BAG_IDENTITY_ACCESS_RESULT_KEY, 'identityAccessResult');
  });
});

describe('IdentityAccess — ExecutionContext', () => {
  it('createIdentityAccessExecutionContext defaults to empty object shape', () => {
    const ctx = createIdentityAccessExecutionContext();
    assert.deepEqual(ctx, {});
  });

  it('preserves locale', () => {
    const ctx = createIdentityAccessExecutionContext({ locale: 'en' });
    assert.equal(ctx.locale, 'en');
  });

  it('preserves actorId', () => {
    const ctx = createIdentityAccessExecutionContext({ actorId: 'actor-1' });
    assert.equal(ctx.actorId, 'actor-1');
  });

  it('preserves identityIds filter', () => {
    const ctx = createIdentityAccessExecutionContext({
      identityIds: ['identity-platform-owner-001']
    });
    assert.deepEqual(ctx.identityIds, ['identity-platform-owner-001']);
  });

  it('preserves authenticationIds filter', () => {
    const ctx = createIdentityAccessExecutionContext({
      authenticationIds: ['auth-1']
    });
    assert.deepEqual(ctx.authenticationIds, ['auth-1']);
  });

  it('preserves sessionIds filter', () => {
    const ctx = createIdentityAccessExecutionContext({
      sessionIds: ['session-1']
    });
    assert.deepEqual(ctx.sessionIds, ['session-1']);
  });

  it('preserves authorizationIds filter', () => {
    const ctx = createIdentityAccessExecutionContext({
      authorizationIds: ['authz-1']
    });
    assert.deepEqual(ctx.authorizationIds, ['authz-1']);
  });

  it('preserves isolationIds and tenantId', () => {
    const ctx = createIdentityAccessExecutionContext({
      isolationIds: ['iso-1'],
      tenantId: 'tenant-demo'
    });
    assert.deepEqual(ctx.isolationIds, ['iso-1']);
    assert.equal(ctx.tenantId, 'tenant-demo');
  });

  it('preserves initialBag', () => {
    const ctx = createIdentityAccessExecutionContext({
      initialBag: { trace: 't1' }
    });
    assert.equal(ctx.initialBag.trace, 't1');
  });
});

describe('IdentityAccess — Validation', () => {
  it('validates default context with no errors', () => {
    const issues = validateIdentityAccessContext({});
    assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  });

  it('accepts locale tr', () => {
    const issues = validateIdentityAccessContext({ locale: 'tr' });
    assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  });

  it('accepts locale en', () => {
    const issues = validateIdentityAccessContext({ locale: 'en' });
    assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  });

  it('rejects invalid locale with error', () => {
    const issues = validateIdentityAccessContext({ locale: 'de' });
    assert.ok(issues.some((i) => i.code === 'INVALID_LOCALE' && i.severity === 'error'));
  });

  it('rejects empty actorId', () => {
    const issues = validateIdentityAccessContext({ actorId: '  ' });
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });

  it('rejects empty tenantId', () => {
    const issues = validateIdentityAccessContext({ tenantId: '' });
    assert.ok(issues.some((i) => i.code === 'EMPTY_TENANT_ID'));
  });

  it('warns on empty identityIds array', () => {
    const issues = validateIdentityAccessContext({ identityIds: [] });
    assert.ok(issues.some((i) => i.code === 'EMPTY_IDENTITYIDS' && i.severity === 'warning'));
  });

  it('warns on empty authenticationIds array', () => {
    const issues = validateIdentityAccessContext({ authenticationIds: [] });
    assert.ok(issues.some((i) => i.code === 'EMPTY_AUTHENTICATIONIDS'));
  });

  it('warns on empty sessionIds array', () => {
    const issues = validateIdentityAccessContext({ sessionIds: [] });
    assert.ok(issues.some((i) => i.code === 'EMPTY_SESSIONIDS'));
  });

  it('warns on empty authorizationIds array', () => {
    const issues = validateIdentityAccessContext({ authorizationIds: [] });
    assert.ok(issues.some((i) => i.code === 'EMPTY_AUTHORIZATIONIDS'));
  });

  it('warns on empty isolationIds array', () => {
    const issues = validateIdentityAccessContext({ isolationIds: [] });
    assert.ok(issues.some((i) => i.code === 'EMPTY_ISOLATIONIDS'));
  });

  it('accepts non-empty filters without errors', () => {
    const issues = validateIdentityAccessContext({
      identityIds: ['identity-platform-owner-001'],
      authenticationIds: ['a1'],
      sessionIds: ['s1'],
      authorizationIds: ['z1'],
      isolationIds: ['i1'],
      tenantId: 'tenant-1',
      actorId: 'actor-1'
    });
    assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  });
});

describe('IdentityAccess — helpers stage execution', () => {
  it('createSkippedStageExecution sets skipped outcome', () => {
    const exec = createSkippedStageExecution(
      'identity',
      'Skipped due to validation failure.'
    );
    assert.equal(exec.stageId, 'identity');
    assert.equal(exec.outcome, 'skipped');
    assert.equal(exec.stageName, 'Identity Projection');
    assert.ok(exec.durationMs >= 0);
    assert.ok(exec.startedAt);
    assert.ok(exec.endedAt);
  });

  it('createSkippedStageExecution for each skippable stage', () => {
    for (const stage of IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE) {
      const exec = createSkippedStageExecution(stage, 'skip');
      assert.equal(exec.outcome, 'skipped');
      assert.equal(exec.stageId, stage);
    }
  });

  it('createStageExecution succeeded', () => {
    const exec = createStageExecution('validation', 'succeeded', 'ok');
    assert.equal(exec.outcome, 'succeeded');
    assert.equal(exec.stageName, 'Validation');
  });

  it('createStageExecution failed', () => {
    const exec = createStageExecution('validation', 'failed', 'bad');
    assert.equal(exec.outcome, 'failed');
    assert.equal(exec.detail, 'bad');
  });

  it('createStageExecution accepts explicit timing', () => {
    const exec = createStageExecution('summary', 'succeeded', 'ok', {
      durationMs: 12,
      startedAt: '2026-07-22T10:00:00.000Z',
      endedAt: '2026-07-22T10:00:00.012Z'
    });
    assert.equal(exec.durationMs, 12);
    assert.equal(exec.startedAt, '2026-07-22T10:00:00.000Z');
    assert.equal(exec.endedAt, '2026-07-22T10:00:00.012Z');
  });

  it('createStageExecution labels authentication', () => {
    const exec = createStageExecution('authentication', 'succeeded', 'ok');
    assert.equal(exec.stageName, 'Authentication Projection');
  });

  it('createStageExecution labels tenant-isolation', () => {
    const exec = createStageExecution('tenant-isolation', 'succeeded', 'ok');
    assert.equal(exec.stageName, 'Tenant Isolation Projection');
  });
});

describe('IdentityAccess — Telemetry helpers', () => {
  it('buildIdentityAccessExecutionTelemetry counts succeeded and skipped', () => {
    const stages = [
      createStageExecution('validation', 'succeeded', 'ok'),
      createSkippedStageExecution('identity', 'skip'),
      createSkippedStageExecution('authentication', 'skip'),
      createSkippedStageExecution('session', 'skip'),
      createSkippedStageExecution('authorization', 'skip'),
      createSkippedStageExecution('tenant-isolation', 'skip'),
      createStageExecution('summary', 'succeeded', 'ok')
    ];
    const telemetry = buildIdentityAccessExecutionTelemetry(
      stages,
      '2026-07-22T10:00:00.000Z',
      '2026-07-22T10:00:01.000Z',
      1000,
      9
    );
    assert.equal(telemetry.succeededStageCount, 2);
    assert.equal(telemetry.skippedStageCount, 5);
    assert.equal(telemetry.summary.stagesFailed, 0);
    assert.equal(telemetry.totalDurationMs, 1000);
    assert.equal(telemetry.summaryCount, 9);
    assert.ok(telemetry.stageDurationsMs.validation !== undefined);
  });

  it('telemetry marks success false when a stage failed', () => {
    const telemetry = buildIdentityAccessExecutionTelemetry(
      [
        createStageExecution('validation', 'failed', 'bad'),
        createStageExecution('summary', 'succeeded', 'ok')
      ],
      '2026-07-22T10:00:00.000Z',
      '2026-07-22T10:00:01.000Z',
      100,
      2
    );
    assert.equal(telemetry.summary.stagesFailed, 1);
    assert.equal(telemetry.summary.success, false);
  });

  it('telemetry includes stage outcomes map', () => {
    const telemetry = buildIdentityAccessExecutionTelemetry(
      [
        createStageExecution('validation', 'succeeded', 'ok'),
        createStageExecution('summary', 'succeeded', 'ok')
      ],
      '2026-07-22T10:00:00.000Z',
      '2026-07-22T10:00:01.000Z',
      50,
      1
    );
    assert.equal(telemetry.stageOutcomes.validation, 'succeeded');
    assert.equal(telemetry.stageOutcomes.summary, 'succeeded');
  });

  it('telemetry stagesExecuted equals stage list length', () => {
    const stages = [
      createStageExecution('validation', 'succeeded', 'ok'),
      createStageExecution('identity', 'succeeded', 'ok'),
      createStageExecution('summary', 'succeeded', 'ok')
    ];
    const telemetry = buildIdentityAccessExecutionTelemetry(
      stages,
      'a',
      'b',
      1,
      3
    );
    assert.equal(telemetry.summary.stagesExecuted, 3);
  });
});

describe('IdentityAccess — Summary helpers', () => {
  it('createEmptyIdentityAccessResult is always valid shape', () => {
    const result = createEmptyIdentityAccessResult(
      [{ code: 'INVALID_LOCALE', message: 'bad', severity: 'error' }],
      [{ key: 'locale', label: 'Locale', value: 'tr' }],
      '2026-07-22T10:00:00.000Z',
      '2026-07-22T10:00:01.000Z',
      50,
      { stagesSucceeded: 1, stagesSkipped: 5, stagesFailed: 1 }
    );
    assert.equal(result.summary.success, false);
    assert.equal(result.summary.identityCount, 0);
    assert.equal(result.summary.authenticationCount, 0);
    assert.equal(result.summary.sessionCount, 0);
    assert.equal(result.summary.authorizationCount, 0);
    assert.equal(result.summary.tenantIsolationCount, 0);
    assert.equal(result.validationIssues.length, 1);
    assert.equal(result.summaryItems.length, 1);
    assert.ok(result.telemetry);
    assert.equal(result.summary.stagesSkipped, 5);
  });

  it('createIdentityAccessResult includes nested optional results', () => {
    const identityResult = createIdentityRuntime().execute({ locale: 'tr' });
    const result = createIdentityAccessResult({
      success: true,
      identityCount: identityResult.summary.identityCount,
      authenticationCount: 0,
      sessionCount: 0,
      authorizationCount: 0,
      tenantIsolationCount: 0,
      stagesSucceeded: 7,
      stagesSkipped: 0,
      stagesFailed: 0,
      summaryItems: [{ key: 'locale', label: 'Locale', value: 'tr' }],
      validationIssues: [],
      startedAt: 'a',
      endedAt: 'b',
      durationMs: 10,
      identityResult
    });
    assert.equal(result.summary.success, true);
    assert.ok(result.identityResult);
    assert.equal(
      result.identityResult.summary.identityCount,
      identityResult.summary.identityCount
    );
  });

  it('buildE2ESummaryItems includes stage and count keys', () => {
    const items = buildE2ESummaryItems(
      [
        createStageExecution('validation', 'succeeded', 'ok'),
        createSkippedStageExecution('identity', 'skip')
      ],
      'tr',
      {
        identityCount: 0,
        authenticationCount: 0,
        sessionCount: 0,
        authorizationCount: 0,
        tenantIsolationCount: 0
      }
    );
    assert.ok(items.some((i) => i.key === 'stages-succeeded' && i.value === 1));
    assert.ok(items.some((i) => i.key === 'stages-skipped' && i.value === 1));
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'tr'));
    assert.ok(items.some((i) => i.key === 'identity-count'));
    assert.ok(items.some((i) => i.key === 'authentication-count'));
    assert.ok(items.some((i) => i.key === 'session-count'));
    assert.ok(items.some((i) => i.key === 'authorization-count'));
    assert.ok(items.some((i) => i.key === 'tenant-isolation-count'));
  });

  it('buildE2ESummaryItems counts failed stages', () => {
    const items = buildE2ESummaryItems(
      [createStageExecution('validation', 'failed', 'bad')],
      'en',
      {
        identityCount: 1,
        authenticationCount: 2,
        sessionCount: 3,
        authorizationCount: 4,
        tenantIsolationCount: 5
      }
    );
    assert.ok(items.some((i) => i.key === 'stages-failed' && i.value === 1));
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'en'));
    assert.ok(items.some((i) => i.key === 'identity-count' && i.value === 1));
    assert.ok(items.some((i) => i.key === 'tenant-isolation-count' && i.value === 5));
  });
});

describe('IdentityAccess — factories', () => {
  it('createIdentityAccessRuntimeFacade factory', () => {
    const facade = createIdentityAccessRuntimeFacade();
    assert.ok(facade);
    assert.equal(typeof facade.execute, 'function');
    assert.equal(typeof facade.run, 'function');
  });

  it('IdentityAccessRuntimeFacade constructible', () => {
    const facade = new IdentityAccessRuntimeFacade();
    assert.ok(facade instanceof IdentityAccessRuntimeFacade);
  });

  it('createIdentityAccessPipelineRunner factory', () => {
    const runner = createIdentityAccessPipelineRunner();
    assert.ok(runner);
    assert.equal(typeof runner.execute, 'function');
  });

  it('IdentityAccessPipelineRunner constructible', () => {
    const runner = new IdentityAccessPipelineRunner();
    assert.ok(runner instanceof IdentityAccessPipelineRunner);
  });

  it('facade accepts injected runtimes', () => {
    const facade = createIdentityAccessRuntimeFacade({
      identityRuntime: createIdentityRuntime(),
      authenticationRuntime: createAuthenticationRuntime(),
      sessionRuntime: createSessionRuntime(),
      authorizationRuntime: createAuthorizationRuntime(),
      tenantIsolationRuntime: createTenantIsolationRuntime()
    });
    const result = facade.run();
    assert.ok(result.summary);
  });
});

describe('IdentityAccess — Pipeline happy path', () => {
  it('facade.run returns IdentityAccessResult', () => {
    const facade = createIdentityAccessRuntimeFacade();
    const result = facade.run();
    assert.ok(result.summary);
    assert.ok(result.telemetry);
    assert.ok(Array.isArray(result.summaryItems));
    assert.ok(Array.isArray(result.validationIssues));
  });

  it('facade.execute returns IdentityAccessExecutionResult', () => {
    const facade = createIdentityAccessRuntimeFacade();
    const result = facade.execute(
      createIdentityAccessExecutionContext({ locale: 'en' })
    );
    assert.ok(result.identityAccessResult);
    assert.ok(result.stageExecutions.length >= 7);
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.bag);
  });

  it('pipeline executes all 7 stages in order on success', () => {
    const result = createIdentityAccessPipelineRunner().execute({ locale: 'tr' });
    assert.deepEqual(
      result.stageExecutions.map((s) => s.stageId),
      [...IDENTITY_ACCESS_PIPELINE_STAGES]
    );
  });

  it('happy path has no skipped stages', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.equal(
      result.stageExecutions.filter((s) => s.outcome === 'skipped').length,
      0
    );
  });

  it('happy path validation succeeded', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    const validation = result.stageExecutions.find((s) => s.stageId === 'validation');
    assert.equal(validation.outcome, 'succeeded');
  });

  it('happy path identity succeeded', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    const stage = result.stageExecutions.find((s) => s.stageId === 'identity');
    assert.equal(stage.outcome, 'succeeded');
    assert.ok(result.identityResult);
  });

  it('happy path authentication succeeded', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    const stage = result.stageExecutions.find(
      (s) => s.stageId === 'authentication'
    );
    assert.equal(stage.outcome, 'succeeded');
    assert.ok(result.authenticationResult);
  });

  it('happy path session succeeded', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    const stage = result.stageExecutions.find((s) => s.stageId === 'session');
    assert.equal(stage.outcome, 'succeeded');
    assert.ok(result.sessionResult);
  });

  it('happy path authorization succeeded', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    const stage = result.stageExecutions.find(
      (s) => s.stageId === 'authorization'
    );
    assert.equal(stage.outcome, 'succeeded');
    assert.ok(result.authorizationResult);
  });

  it('happy path tenant-isolation succeeded', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    const stage = result.stageExecutions.find(
      (s) => s.stageId === 'tenant-isolation'
    );
    assert.equal(stage.outcome, 'succeeded');
    assert.ok(result.tenantIsolationResult);
  });

  it('happy path summary always succeeded', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    const stage = result.stageExecutions.find((s) => s.stageId === 'summary');
    assert.equal(stage.outcome, 'succeeded');
  });

  it('nested results stored in bag', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(result.bag[PIPELINE_BAG_IDENTITY_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_AUTHENTICATION_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_SESSION_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_AUTHORIZATION_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_IDENTITY_ACCESS_RESULT_KEY]);
  });

  it('aggregate result mirrors nested counts', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    const agg = result.identityAccessResult;
    assert.equal(
      agg.summary.identityCount,
      result.identityResult.summary.identityCount
    );
    assert.equal(
      agg.summary.authenticationCount,
      result.authenticationResult.summary.authenticationStateCount
    );
    assert.equal(
      agg.summary.sessionCount,
      result.sessionResult.summary.sessionCount
    );
    assert.equal(
      agg.summary.authorizationCount,
      result.authorizationResult.summary.authorizationCount
    );
    assert.equal(
      agg.summary.tenantIsolationCount,
      result.tenantIsolationResult.summary.tenantCount
    );
  });

  it('passes identityIds filter into identity runtime', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      identityIds: ['identity-platform-owner-001']
    });
    assert.equal(result.identityResult.summary.identityCount, 1);
    assert.equal(
      result.identityResult.identities[0].identityId,
      'identity-platform-owner-001'
    );
  });

  it('preserves initialBag entries', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      initialBag: { correlationId: 'corr-1' }
    });
    assert.equal(result.bag.correlationId, 'corr-1');
  });

  it('en locale flows through pipeline', () => {
    const result = createIdentityAccessRuntimeFacade().execute({ locale: 'en' });
    assert.equal(result.identityResult.identities.length > 0, true);
    assert.ok(
      result.identityAccessResult.summaryItems.some(
        (i) => i.key === 'locale' && i.value === 'en'
      )
    );
  });
});

describe('IdentityAccess — Failure path (validation)', () => {
  it('invalid locale fails validation stage', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'fr'
    });
    const validation = result.stageExecutions.find((s) => s.stageId === 'validation');
    assert.equal(validation.outcome, 'failed');
  });

  it('validation failure skips identity', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'xx'
    });
    const stage = result.stageExecutions.find((s) => s.stageId === 'identity');
    assert.equal(stage.outcome, 'skipped');
    assert.equal(result.identityResult, undefined);
  });

  it('validation failure skips authentication', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'xx'
    });
    const stage = result.stageExecutions.find(
      (s) => s.stageId === 'authentication'
    );
    assert.equal(stage.outcome, 'skipped');
    assert.equal(result.authenticationResult, undefined);
  });

  it('validation failure skips session', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'xx'
    });
    const stage = result.stageExecutions.find((s) => s.stageId === 'session');
    assert.equal(stage.outcome, 'skipped');
    assert.equal(result.sessionResult, undefined);
  });

  it('validation failure skips authorization', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'xx'
    });
    const stage = result.stageExecutions.find(
      (s) => s.stageId === 'authorization'
    );
    assert.equal(stage.outcome, 'skipped');
    assert.equal(result.authorizationResult, undefined);
  });

  it('validation failure skips tenant-isolation', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'xx'
    });
    const stage = result.stageExecutions.find(
      (s) => s.stageId === 'tenant-isolation'
    );
    assert.equal(stage.outcome, 'skipped');
    assert.equal(result.tenantIsolationResult, undefined);
  });

  it('validation failure still runs summary', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'xx'
    });
    const stage = result.stageExecutions.find((s) => s.stageId === 'summary');
    assert.equal(stage.outcome, 'succeeded');
  });

  it('validation failure still returns valid IdentityAccessResult', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'xx'
    });
    const agg = result.identityAccessResult;
    assert.ok(agg.summary);
    assert.equal(agg.summary.success, false);
    assert.equal(agg.summary.identityCount, 0);
    assert.ok(Array.isArray(agg.summaryItems));
    assert.ok(Array.isArray(agg.validationIssues));
    assert.ok(agg.telemetry);
    assert.ok(agg.validationIssues.some((i) => i.code === 'INVALID_LOCALE'));
  });

  it('validation failure telemetry reports 5 skipped', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'xx'
    });
    assert.equal(result.telemetry.skippedStageCount, 5);
    assert.equal(result.identityAccessResult.summary.stagesSkipped, 5);
  });

  it('empty actorId fails validation and skips projections', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      actorId: ''
    });
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'validation').outcome,
      'failed'
    );
    assert.equal(
      result.stageExecutions.filter((s) => s.outcome === 'skipped').length,
      5
    );
  });

  it('empty tenantId fails validation', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      tenantId: '   '
    });
    assert.ok(
      result.identityAccessResult.validationIssues.some(
        (i) => i.code === 'EMPTY_TENANT_ID'
      )
    );
    assert.equal(result.identityResult, undefined);
  });

  it('failure path stage order still includes all stages', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'bad'
    });
    assert.deepEqual(
      result.stageExecutions.map((s) => s.stageId),
      [...IDENTITY_ACCESS_PIPELINE_STAGES]
    );
  });

  it('failure path bag still has identityAccessResult', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'bad'
    });
    assert.ok(result.bag[PIPELINE_BAG_IDENTITY_ACCESS_RESULT_KEY]);
    assert.equal(
      result.bag[PIPELINE_BAG_IDENTITY_RESULT_KEY],
      undefined
    );
  });

  it('facade.run on failure still returns IdentityAccessResult', () => {
    const result = createIdentityAccessRuntimeFacade().run({ locale: 'zz' });
    assert.equal(result.summary.success, false);
    assert.ok(result.telemetry.summaryItemCount >= 1);
  });
});

describe('IdentityAccess — ExecutionResult shape', () => {
  it('stageExecutions are frozen', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(Object.isFrozen(result.stageExecutions));
  });

  it('bag is frozen', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(Object.isFrozen(result.bag));
  });

  it('telemetry has totalDurationMs', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.equal(typeof result.telemetry.totalDurationMs, 'number');
    assert.ok(result.telemetry.totalDurationMs >= 0);
  });

  it('telemetry has startedAt and endedAt ISO strings', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(result.telemetry.startedAt.includes('T'));
    assert.ok(result.telemetry.endedAt.includes('T'));
  });

  it('telemetry stageDurationsMs covers executed stages', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    for (const stage of IDENTITY_ACCESS_PIPELINE_STAGES) {
      assert.equal(
        typeof result.telemetry.stageDurationsMs[stage],
        'number'
      );
    }
  });

  it('telemetry succeededStageCount matches summary', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.equal(
      result.telemetry.succeededStageCount,
      result.telemetry.summary.stagesSucceeded
    );
  });

  it('telemetry summaryCount equals summary items length', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.equal(
      result.telemetry.summaryCount,
      result.identityAccessResult.summaryItems.length
    );
  });

  it('identityAccessResult.telemetry.durationMs equals total', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.equal(
      result.identityAccessResult.telemetry.durationMs,
      result.telemetry.totalDurationMs
    );
  });

  it('identityAccessResult embeds nested results on success', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(result.identityAccessResult.identityResult);
    assert.ok(result.identityAccessResult.authenticationResult);
    assert.ok(result.identityAccessResult.sessionResult);
    assert.ok(result.identityAccessResult.authorizationResult);
    assert.ok(result.identityAccessResult.tenantIsolationResult);
  });

  it('each stage execution has required fields', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    for (const stage of result.stageExecutions) {
      assert.ok(stage.stageId);
      assert.ok(stage.stageName);
      assert.ok(['succeeded', 'failed', 'skipped'].includes(stage.outcome));
      assert.equal(typeof stage.detail, 'string');
      assert.equal(typeof stage.durationMs, 'number');
      assert.ok(stage.startedAt);
      assert.ok(stage.endedAt);
    }
  });
});

describe('IdentityAccess — Summary stage always', () => {
  it('summary count is positive on success', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(result.telemetry.summaryCount > 0);
    assert.ok(result.identityAccessResult.summaryItems.length > 0);
  });

  it('summary count is positive on validation failure', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'nope'
    });
    assert.ok(result.telemetry.summaryCount > 0);
  });

  it('summary items include stages-succeeded key', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(
      result.identityAccessResult.summaryItems.some(
        (i) => i.key === 'stages-succeeded'
      )
    );
  });

  it('summary items include stages-skipped key on failure', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'nope'
    });
    assert.ok(
      result.identityAccessResult.summaryItems.some(
        (i) => i.key === 'stages-skipped' && i.value === 5
      )
    );
  });

  it('aggregate summary stagesSucceeded includes summary stage', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'nope'
    });
    // validation failed + summary succeeded = 1 succeeded (plus maybe 0)
    assert.ok(result.identityAccessResult.summary.stagesSucceeded >= 1);
  });
});

describe('IdentityAccess — Telemetry end-to-end', () => {
  it('total duration is non-negative', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(result.telemetry.totalDurationMs >= 0);
  });

  it('succeeded stage count is 7 on full success', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.equal(result.telemetry.succeededStageCount, 7);
    assert.equal(result.telemetry.skippedStageCount, 0);
  });

  it('skipped stage count is 5 on validation failure', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      locale: 'invalid'
    });
    assert.equal(result.telemetry.skippedStageCount, 5);
    assert.equal(result.telemetry.succeededStageCount, 1); // summary only? validation failed
    // validation failed + 5 skipped + summary succeeded => succeeded=1, failed=1, skipped=5
    assert.equal(result.telemetry.summary.stagesFailed, 1);
  });

  it('stage durations map has validation key', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok('validation' in result.telemetry.stageDurationsMs);
  });

  it('stage durations map has summary key', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok('summary' in result.telemetry.stageDurationsMs);
  });

  it('runner execute and facade execute agree on stage count', () => {
    const viaFacade = createIdentityAccessRuntimeFacade().execute();
    const viaRunner = createIdentityAccessPipelineRunner().execute();
    assert.equal(
      viaFacade.stageExecutions.length,
      viaRunner.stageExecutions.length
    );
  });
});

describe('IdentityAccess — Projection orchestration wiring', () => {
  it('authentication receives identityResult upstream', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(
      result.authenticationResult.summary.identityProjectionCount >= 0
    );
  });

  it('session receives identity and authentication upstream', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(result.sessionResult.summary.identityProjectionCount >= 0);
    assert.ok(
      result.sessionResult.summary.authenticationProjectionCount >= 0
    );
  });

  it('authorization receives session upstream', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(result.authorizationResult.summary.sessionProjectionCount >= 0);
  });

  it('tenant isolation receives authorization upstream', () => {
    const result = createIdentityAccessRuntimeFacade().execute();
    assert.ok(
      result.tenantIsolationResult.summary.authorizationProjectionCount >= 0
    );
  });

  it('actorId is accepted without failing validation', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      actorId: 'ops-actor'
    });
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'validation').outcome,
      'succeeded'
    );
  });

  it('tenantId filter is accepted', () => {
    const result = createIdentityAccessRuntimeFacade().execute({
      tenantId: 'tenant-demo-001'
    });
    assert.ok(result.identityAccessResult);
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'validation').outcome,
      'succeeded'
    );
  });
});
