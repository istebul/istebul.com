/**
 * Tenant End-to-End Runtime — EPIC-302E (en az 100 unit test)
 *
 * Coverage: validation, pipeline, ExecutionResult, telemetry,
 * failure path, integration orchestration.
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
  createTenantIntegrationFacade,
  createTenantIntegrationPipelineRunner,
  createTenantIntegrationExecutionContext,
  validateTenantIntegrationContext,
  createTenantIntegrationSkippedStageExecution,
  createTenantIntegrationStageExecution,
  buildTenantIntegrationExecutionTelemetry,
  buildTenantIntegrationPipelineExecutionSummary,
  createEmptyTenantIntegrationResult,
  createTenantIntegrationResult,
  buildTenantIntegrationE2ESummaryItems,
  TENANT_INTEGRATION_PIPELINE_STAGES,
  TENANT_INTEGRATION_SKIP_ON_VALIDATION_FAILURE,
  TENANT_INTEGRATION_STAGE_LABELS,
  PIPELINE_BAG_TENANT_INTEGRATION_RESULT_KEY,
  TenantIntegrationFacade,
  TenantIntegrationPipelineRunner,
  createTenantAdapterWithSupabaseProvider,
  createSupabaseTenantProvider,
  createSupabaseTenantContext,
  toTenantProviderContext,
  createTenantIsolationRegistry,
  createTenantIsolationRuntime,
  createTenantSessionBridge,
  createTenantSessionBridgeRegistry,
  createBusinessContextBridge,
  createBusinessContextBridgeRegistry,
  SUPABASE_TENANT_PROVIDER_ID
} = await import('../../src/identity/index.ts');

const {
  createBusinessAdminRuntime,
  createBusinessAdminRegistryRuntime
} = await import('../../src/business-admin/index.ts');

function createTenantRow(overrides = {}) {
  return {
    id: 'tenant-demo-001',
    slug: 'demo',
    display_name: 'Demo Tenant',
    domain: 'demo.example.com',
    status: 'active',
    ...overrides
  };
}

function createMembershipRow(overrides = {}) {
  return {
    id: 'membership-001',
    identity_id: 'identity-001',
    tenant_id: 'tenant-demo-001',
    role_label: 'member',
    active: true,
    ...overrides
  };
}

function createMockClient(overrides = {}) {
  return {
    tenants: {
      getById: async () => ({ data: createTenantRow(), error: null }),
      getBySlug: async () => ({ data: createTenantRow(), error: null }),
      getByDomain: async () => ({ data: createTenantRow(), error: null }),
      ...(overrides.tenants ?? {})
    },
    memberships: {
      listByIdentity: async () => ({
        data: [createMembershipRow()],
        error: null
      }),
      listByTenant: async () => ({
        data: [createMembershipRow()],
        error: null
      }),
      getById: async () => ({ data: createMembershipRow(), error: null }),
      validateAccess: async () => ({
        data: {
          allowed: true,
          outcome: 'allow',
          allowed_tenant_ids: ['tenant-demo-001'],
          cross_tenant_allowed: false
        },
        error: null
      }),
      ...(overrides.memberships ?? {})
    }
  };
}

function createStack(clientOverrides = {}) {
  const provider = createSupabaseTenantProvider({
    client: createMockClient(clientOverrides)
  });
  const adapter = createTenantAdapterWithSupabaseProvider(provider, {
    seedBuiltins: false
  });
  const isolationRegistry = createTenantIsolationRegistry(false);
  const isolationRuntime = createTenantIsolationRuntime(isolationRegistry);
  const tenantBridgeRegistry = createTenantSessionBridgeRegistry();
  const tenantSessionBridge = createTenantSessionBridge({
    tenantAdapter: adapter,
    isolationRuntime,
    isolationRegistry,
    bridgeRegistry: tenantBridgeRegistry
  });
  const businessRuntime = createBusinessAdminRuntime(
    createBusinessAdminRegistryRuntime(true)
  );
  const businessContextBridge = createBusinessContextBridge({
    tenantSessionBridge,
    businessRuntime,
    bridgeRegistry: createBusinessContextBridgeRegistry()
  });
  const runner = createTenantIntegrationPipelineRunner({
    tenantAdapter: adapter,
    tenantSessionBridge,
    businessContextBridge
  });
  const facade = createTenantIntegrationFacade({
    tenantAdapter: adapter,
    tenantSessionBridge,
    businessContextBridge
  });
  return {
    facade,
    runner,
    adapter,
    tenantSessionBridge,
    businessContextBridge,
    businessRuntime
  };
}

function syncExecution(overrides = {}) {
  return createTenantIntegrationExecutionContext({
    operation: 'synchronize',
    providerContext: toTenantProviderContext(
      createSupabaseTenantContext({
        tenantId: 'tenant-demo-001',
        identityId: 'identity-001',
        sessionId: 'session-001'
      })
    ),
    tenantId: 'tenant-demo-001',
    businessId: 'tenant-demo-001',
    identityId: 'identity-001',
    sessionId: 'session-001',
    ...overrides
  });
}

describe('Stages metadata', () => {
  it('defines 6 pipeline stages', () => {
    assert.equal(TENANT_INTEGRATION_PIPELINE_STAGES.length, 6);
  });

  it('starts with validation and ends with summary', () => {
    assert.equal(TENANT_INTEGRATION_PIPELINE_STAGES[0], 'validation');
    assert.equal(
      TENANT_INTEGRATION_PIPELINE_STAGES[
        TENANT_INTEGRATION_PIPELINE_STAGES.length - 1
      ],
      'summary'
    );
  });

  it('includes tenant-adapter and business-context-bridge', () => {
    assert.ok(TENANT_INTEGRATION_PIPELINE_STAGES.includes('tenant-adapter'));
    assert.ok(
      TENANT_INTEGRATION_PIPELINE_STAGES.includes('business-context-bridge')
    );
  });

  it('includes supabase-provider and session-bridge', () => {
    assert.ok(TENANT_INTEGRATION_PIPELINE_STAGES.includes('supabase-provider'));
    assert.ok(TENANT_INTEGRATION_PIPELINE_STAGES.includes('session-bridge'));
  });

  it('skip-on-validation list excludes summary', () => {
    assert.equal(
      TENANT_INTEGRATION_SKIP_ON_VALIDATION_FAILURE.includes('summary'),
      false
    );
    assert.equal(TENANT_INTEGRATION_SKIP_ON_VALIDATION_FAILURE.length, 4);
  });

  it('skip list includes adapter provider session and business', () => {
    assert.deepEqual([...TENANT_INTEGRATION_SKIP_ON_VALIDATION_FAILURE], [
      'tenant-adapter',
      'supabase-provider',
      'session-bridge',
      'business-context-bridge'
    ]);
  });

  it('stage labels cover all stages', () => {
    for (const stage of TENANT_INTEGRATION_PIPELINE_STAGES) {
      assert.ok(TENANT_INTEGRATION_STAGE_LABELS[stage]);
    }
  });

  it('exports pipeline bag key', () => {
    assert.equal(
      PIPELINE_BAG_TENANT_INTEGRATION_RESULT_KEY,
      'tenantIntegrationResult'
    );
  });

  it('stage labels are human readable', () => {
    assert.equal(TENANT_INTEGRATION_STAGE_LABELS.validation, 'Validation');
    assert.equal(
      TENANT_INTEGRATION_STAGE_LABELS['tenant-adapter'],
      'Tenant Adapter'
    );
    assert.equal(
      TENANT_INTEGRATION_STAGE_LABELS['business-context-bridge'],
      'Business Context Bridge'
    );
  });
});

describe('Validation', () => {
  it('passes for valid providerContext', () => {
    const issues = validateTenantIntegrationContext(syncExecution());
    assert.equal(issues.length, 0);
  });

  it('errors on invalid locale', () => {
    const issues = validateTenantIntegrationContext(
      syncExecution({ locale: 'de' })
    );
    assert.ok(issues.some((item) => item.code === 'INVALID_LOCALE'));
  });

  it('errors on invalid operation', () => {
    const issues = validateTenantIntegrationContext(
      syncExecution({ operation: 'nope' })
    );
    assert.ok(issues.some((item) => item.code === 'INVALID_OPERATION'));
  });

  it('errors on empty actorId', () => {
    const issues = validateTenantIntegrationContext(
      syncExecution({ actorId: '  ' })
    );
    assert.ok(issues.some((item) => item.code === 'EMPTY_ACTOR_ID'));
  });

  it('errors on empty tenantId', () => {
    const issues = validateTenantIntegrationContext(
      syncExecution({ tenantId: '' })
    );
    assert.ok(issues.some((item) => item.code === 'EMPTY_TENANT_ID'));
  });

  it('errors when providerContext and providerId missing', () => {
    const issues = validateTenantIntegrationContext({
      operation: 'synchronize'
    });
    assert.ok(
      issues.some((item) => item.code === 'PROVIDER_CONTEXT_REQUIRED')
    );
  });

  it('errors on empty providerId', () => {
    const issues = validateTenantIntegrationContext({
      providerId: ''
    });
    assert.ok(issues.some((item) => item.code === 'EMPTY_PROVIDER_ID'));
  });

  it('errors on empty providerContext.providerId', () => {
    const issues = validateTenantIntegrationContext({
      providerContext: { locale: 'tr', providerId: '' }
    });
    assert.ok(
      issues.some((item) => item.code === 'EMPTY_PROVIDER_CONTEXT_ID')
    );
  });

  it('allows providerId without providerContext', () => {
    const issues = validateTenantIntegrationContext({
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 'tenant-demo-001'
    });
    assert.equal(
      issues.some((item) => item.code === 'PROVIDER_CONTEXT_REQUIRED'),
      false
    );
  });

  it('defaults locale to tr when omitted', () => {
    const issues = validateTenantIntegrationContext({
      providerId: SUPABASE_TENANT_PROVIDER_ID
    });
    assert.equal(issues.some((item) => item.code === 'INVALID_LOCALE'), false);
  });

  it('accepts en locale', () => {
    const issues = validateTenantIntegrationContext(
      syncExecution({ locale: 'en' })
    );
    assert.equal(issues.some((item) => item.code === 'INVALID_LOCALE'), false);
  });

  it('accepts all valid operations', () => {
    for (const operation of [
      'synchronize',
      'refresh',
      'validate',
      'mapWorkspace'
    ]) {
      const issues = validateTenantIntegrationContext(
        syncExecution({ operation })
      );
      assert.equal(
        issues.some((item) => item.code === 'INVALID_OPERATION'),
        false,
        operation
      );
    }
  });

  it('createTenantIntegrationExecutionContext copies fields', () => {
    const context = createTenantIntegrationExecutionContext({
      operation: 'refresh',
      providerId: 'p',
      tenantId: 't1'
    });
    assert.equal(context.operation, 'refresh');
    assert.equal(context.providerId, 'p');
    assert.equal(context.tenantId, 't1');
  });

  it('validation issues are frozen', () => {
    const issues = validateTenantIntegrationContext({ locale: 'de' });
    assert.throws(() => {
      issues.push({ code: 'X', message: 'x', severity: 'error' });
    });
  });
});

describe('Helper factories', () => {
  it('createTenantIntegrationSkippedStageExecution marks skipped', () => {
    const stage = createTenantIntegrationSkippedStageExecution(
      'session-bridge',
      'skip'
    );
    assert.equal(stage.outcome, 'skipped');
    assert.equal(stage.stageId, 'session-bridge');
  });

  it('createTenantIntegrationStageExecution records outcome', () => {
    const stage = createTenantIntegrationStageExecution(
      'validation',
      'succeeded',
      'ok',
      {
        durationMs: 2,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.002Z'
      }
    );
    assert.equal(stage.durationMs, 2);
    assert.equal(stage.outcome, 'succeeded');
  });

  it('stage execution includes stage name', () => {
    const stage = createTenantIntegrationStageExecution(
      'tenant-adapter',
      'failed',
      'x'
    );
    assert.equal(stage.stageName, 'Tenant Adapter');
  });

  it('buildTenantIntegrationPipelineExecutionSummary counts outcomes', () => {
    const summary = buildTenantIntegrationPipelineExecutionSummary([
      createTenantIntegrationStageExecution('validation', 'succeeded', 'a'),
      createTenantIntegrationSkippedStageExecution('tenant-adapter', 'b'),
      createTenantIntegrationStageExecution(
        'supabase-provider',
        'failed',
        'c'
      )
    ]);
    assert.equal(summary.stagesSucceeded, 1);
    assert.equal(summary.stagesSkipped, 1);
    assert.equal(summary.stagesFailed, 1);
    assert.equal(summary.success, false);
  });

  it('pipeline summary success requires no failures', () => {
    const summary = buildTenantIntegrationPipelineExecutionSummary([
      createTenantIntegrationStageExecution('validation', 'succeeded', 'a'),
      createTenantIntegrationStageExecution('summary', 'succeeded', 'b')
    ]);
    assert.equal(summary.success, true);
  });

  it('buildTenantIntegrationExecutionTelemetry aggregates', () => {
    const stages = [
      createTenantIntegrationStageExecution('validation', 'succeeded', 'a'),
      createTenantIntegrationSkippedStageExecution('summary', 'b')
    ];
    const telemetry = buildTenantIntegrationExecutionTelemetry(
      stages,
      '2026-07-22T00:00:00.000Z',
      '2026-07-22T00:00:01.000Z',
      1000,
      3
    );
    assert.equal(telemetry.succeededStageCount, 1);
    assert.equal(telemetry.skippedStageCount, 1);
    assert.equal(telemetry.summaryCount, 3);
    assert.equal(telemetry.totalDurationMs, 1000);
  });

  it('createEmptyTenantIntegrationResult is unsuccessful', () => {
    const result = createEmptyTenantIntegrationResult(
      [{ code: 'X', message: 'Y', severity: 'error' }],
      {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        summaryItemCount: 0
      }
    );
    assert.equal(result.summary.success, false);
    assert.equal(result.validationIssues.length, 1);
    assert.equal(result.summary.adapterSucceeded, false);
    assert.equal(result.summary.businessContextBridgeSucceeded, false);
  });

  it('createTenantIntegrationResult freezes issues', () => {
    const result = createTenantIntegrationResult({
      success: true,
      adapterSucceeded: true,
      providerSucceeded: true,
      sessionBridgeSucceeded: true,
      businessContextBridgeSucceeded: true,
      stagesSucceeded: 5,
      stagesSkipped: 0,
      stagesFailed: 0,
      summaryItems: [],
      validationIssues: [{ code: 'W', message: 'w', severity: 'warning' }],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        summaryItemCount: 0
      }
    });
    assert.throws(() => {
      result.validationIssues.push({
        code: 'Z',
        message: 'z',
        severity: 'error'
      });
    });
  });

  it('buildTenantIntegrationE2ESummaryItems includes counters', () => {
    const integration = createTenantIntegrationResult({
      success: true,
      adapterSucceeded: true,
      providerSucceeded: true,
      sessionBridgeSucceeded: true,
      businessContextBridgeSucceeded: true,
      stagesSucceeded: 5,
      stagesSkipped: 0,
      stagesFailed: 0,
      summaryItems: [],
      validationIssues: [],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        summaryItemCount: 0
      }
    });
    const items = buildTenantIntegrationE2ESummaryItems(
      {
        stagesExecuted: 6,
        stagesSucceeded: 5,
        stagesFailed: 0,
        stagesSkipped: 0,
        success: true
      },
      integration
    );
    assert.ok(items.some((item) => item.key === 'adapterSucceeded'));
    assert.ok(
      items.some((item) => item.key === 'businessContextBridgeSucceeded')
    );
    assert.equal(items.length, 8);
  });
});

describe('Facade and runner initialization', () => {
  it('creates facade with DI stack', () => {
    const { facade, runner } = createStack();
    assert.ok(facade instanceof TenantIntegrationFacade);
    assert.ok(runner instanceof TenantIntegrationPipelineRunner);
  });

  it('facade getRunner returns pipeline runner', () => {
    const { facade } = createStack();
    assert.ok(facade.getRunner() instanceof TenantIntegrationPipelineRunner);
  });

  it('does not create singleton facades', () => {
    const a = createStack().facade;
    const b = createStack().facade;
    assert.notEqual(a, b);
  });

  it('runner exposes injected dependencies', () => {
    const { runner, adapter, tenantSessionBridge, businessContextBridge } =
      createStack();
    assert.equal(runner.getTenantAdapter(), adapter);
    assert.equal(runner.getTenantSessionBridge(), tenantSessionBridge);
    assert.equal(runner.getBusinessContextBridge(), businessContextBridge);
  });

  it('createTenantIntegrationFacade with businessRuntime constructs', () => {
    const { adapter, tenantSessionBridge, businessRuntime } = createStack();
    const facade = createTenantIntegrationFacade({
      tenantAdapter: adapter,
      tenantSessionBridge,
      businessRuntime
    });
    assert.ok(facade instanceof TenantIntegrationFacade);
  });

  it('throws when businessContextBridge and businessRuntime missing', () => {
    assert.throws(() => createTenantIntegrationFacade({}), /zorunludur/);
  });

  it('TenantIntegrationPipelineRunner is constructable', () => {
    const { adapter, tenantSessionBridge, businessContextBridge } =
      createStack();
    const runner = new TenantIntegrationPipelineRunner({
      tenantAdapter: adapter,
      tenantSessionBridge,
      businessContextBridge
    });
    assert.ok(runner instanceof TenantIntegrationPipelineRunner);
  });

  it('createTenantIntegrationPipelineRunner factory works', () => {
    const { businessRuntime } = createStack();
    const runner = createTenantIntegrationPipelineRunner({ businessRuntime });
    assert.ok(runner instanceof TenantIntegrationPipelineRunner);
  });
});

describe('Pipeline success path', () => {
  it('execute runs full pipeline and succeeds', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(result.tenantIntegrationResult.summary.success, true);
    assert.equal(result.stageExecutions.length, 6);
    assert.equal(result.pipelineSummary.stagesFailed, 0);
  });

  it('run returns TenantIntegrationResult shortcut', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.equal(result.summary.success, true);
    assert.ok(result.providerResult);
    assert.ok(result.sessionBridgeResult);
    assert.ok(result.businessContextBridgeResult);
  });

  it('all stages succeed on sync', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    for (const stage of result.stageExecutions) {
      assert.equal(stage.outcome, 'succeeded', stage.stageId);
    }
  });

  it('stores integration result in bag', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.ok(result.bag[PIPELINE_BAG_TENANT_INTEGRATION_RESULT_KEY]);
  });

  it('adapter and provider flags are true', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.equal(result.summary.adapterSucceeded, true);
    assert.equal(result.summary.providerSucceeded, true);
    assert.equal(result.summary.sessionBridgeSucceeded, true);
    assert.equal(result.summary.businessContextBridgeSucceeded, true);
  });

  it('refresh operation succeeds', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      syncExecution({ operation: 'refresh' })
    );
    assert.equal(result.tenantIntegrationResult.summary.success, true);
  });

  it('validate operation succeeds', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      syncExecution({ operation: 'validate' })
    );
    assert.equal(result.tenantIntegrationResult.summary.success, true);
  });

  it('mapWorkspace operation succeeds', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      syncExecution({
        operation: 'mapWorkspace',
        workspaceId: 'ws-1',
        workspaceLabel: 'Main'
      })
    );
    assert.equal(result.tenantIntegrationResult.summary.success, true);
  });

  it('defaults operation to synchronize', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      createTenantIntegrationExecutionContext({
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({
            tenantId: 'tenant-demo-001',
            identityId: 'identity-001'
          })
        ),
        tenantId: 'tenant-demo-001'
      })
    );
    assert.equal(result.tenantIntegrationResult.summary.success, true);
  });

  it('providerId-only context works', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      createTenantIntegrationExecutionContext({
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantId: 'tenant-demo-001',
        identityId: 'identity-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(result.tenantIntegrationResult.summary.success, true);
  });

  it('en locale succeeds', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution({ locale: 'en' }));
    assert.equal(result.tenantIntegrationResult.summary.success, true);
  });

  it('stage order matches pipeline definition', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.deepEqual(
      result.stageExecutions.map((s) => s.stageId),
      [...TENANT_INTEGRATION_PIPELINE_STAGES]
    );
  });

  it('ExecutionResult always has required fields', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.ok(result.tenantIntegrationResult);
    assert.ok(Array.isArray(result.stageExecutions));
    assert.ok(result.pipelineSummary);
    assert.ok(result.telemetry);
    assert.ok(result.bag);
  });

  it('summary items include success flag', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.ok(result.summaryItems.some((item) => item.key === 'success'));
  });
});

describe('Validation failure path', () => {
  it('skips adapter/provider/session/business on validation failure', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      createTenantIntegrationExecutionContext({
        locale: 'de',
        providerId: SUPABASE_TENANT_PROVIDER_ID
      })
    );
    assert.equal(result.tenantIntegrationResult.summary.success, false);
    const skipped = result.stageExecutions.filter((s) => s.outcome === 'skipped');
    assert.equal(skipped.length, 4);
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'summary')?.outcome,
      'succeeded'
    );
  });

  it('does not attach nested results when validation fails', async () => {
    const { facade } = createStack();
    const result = await facade.run(
      createTenantIntegrationExecutionContext({
        locale: 'xx',
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
        )
      })
    );
    assert.equal(result.providerResult, undefined);
    assert.equal(result.sessionBridgeResult, undefined);
    assert.equal(result.businessContextBridgeResult, undefined);
  });

  it('validation failure still returns valid ExecutionResult', async () => {
    const { facade } = createStack();
    const result = await facade.execute({ locale: 'bad' });
    assert.ok(result.tenantIntegrationResult);
    assert.ok(result.stageExecutions);
    assert.ok(result.pipelineSummary);
    assert.ok(result.telemetry);
    assert.ok(result.bag);
  });

  it('telemetry records skipped stages on validation failure', async () => {
    const { facade } = createStack();
    const result = await facade.execute({
      locale: 'fr',
      providerId: SUPABASE_TENANT_PROVIDER_ID
    });
    assert.equal(result.telemetry.skippedStageCount, 4);
    assert.ok(result.telemetry.succeededStageCount >= 1);
  });

  it('missing provider context fails validation and skips stages', async () => {
    const { facade } = createStack();
    const result = await facade.execute({ operation: 'synchronize' });
    assert.ok(
      result.tenantIntegrationResult.validationIssues.some(
        (item) => item.code === 'PROVIDER_CONTEXT_REQUIRED'
      )
    );
    assert.equal(
      result.stageExecutions.filter((s) => s.outcome === 'skipped').length,
      4
    );
  });

  it('invalid operation skips downstream stages', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      syncExecution({ operation: 'delete' })
    );
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'validation')?.outcome,
      'failed'
    );
    assert.equal(
      result.stageExecutions.filter((s) => s.outcome === 'skipped').length,
      4
    );
  });

  it('empty actorId fails validation', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution({ actorId: '' }));
    assert.ok(
      result.tenantIntegrationResult.validationIssues.some(
        (item) => item.code === 'EMPTY_ACTOR_ID'
      )
    );
  });

  it('empty tenantId fails validation', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution({ tenantId: '   ' }));
    assert.ok(
      result.tenantIntegrationResult.validationIssues.some(
        (item) => item.code === 'EMPTY_TENANT_ID'
      )
    );
  });

  it('summary always runs after validation failure', async () => {
    const { facade } = createStack();
    const result = await facade.execute({ locale: 'zz' });
    assert.equal(
      result.stageExecutions[result.stageExecutions.length - 1].stageId,
      'summary'
    );
  });
});

describe('Failure path — adapter/provider', () => {
  it('tenant not found fails adapter stage', async () => {
    const { facade } = createStack({
      tenants: {
        getById: async () => ({
          data: null,
          error: { message: 'Tenant not found', code: 'PGRST116' }
        }),
        getBySlug: async () => ({ data: null, error: null }),
        getByDomain: async () => ({ data: null, error: null })
      }
    });
    const result = await facade.execute(syncExecution());
    assert.equal(result.tenantIntegrationResult.summary.success, false);
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'tenant-adapter')
        ?.outcome,
      'failed'
    );
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'summary')?.outcome,
      'succeeded'
    );
  });

  it('access denied fails validate path', async () => {
    const { facade } = createStack({
      memberships: {
        listByIdentity: async () => ({
          data: [createMembershipRow()],
          error: null
        }),
        listByTenant: async () => ({
          data: [createMembershipRow()],
          error: null
        }),
        getById: async () => ({ data: createMembershipRow(), error: null }),
        validateAccess: async () => ({
          data: {
            allowed: false,
            outcome: 'deny',
            allowed_tenant_ids: [],
            cross_tenant_allowed: false
          },
          error: null
        })
      }
    });
    const result = await facade.execute(
      syncExecution({ operation: 'validate' })
    );
    assert.equal(result.tenantIntegrationResult.summary.success, false);
  });

  it('summary always runs after adapter failure', async () => {
    const { facade } = createStack({
      tenants: {
        getById: async () => {
          throw new Error('Failed to fetch');
        },
        getBySlug: async () => ({ data: null, error: null }),
        getByDomain: async () => ({ data: null, error: null })
      }
    });
    const result = await facade.execute(syncExecution());
    assert.equal(
      result.stageExecutions[result.stageExecutions.length - 1].stageId,
      'summary'
    );
    assert.equal(
      result.stageExecutions[result.stageExecutions.length - 1].outcome,
      'succeeded'
    );
  });

  it('provider stage fails when registered but adapter failed', async () => {
    const { facade } = createStack({
      tenants: {
        getById: async () => ({
          data: null,
          error: { message: 'not found' }
        }),
        getBySlug: async () => ({ data: null, error: null }),
        getByDomain: async () => ({ data: null, error: null })
      }
    });
    const result = await facade.execute(syncExecution());
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'supabase-provider')
        ?.outcome,
      'failed'
    );
  });

  it('collects validation issues from failed adapter', async () => {
    const { facade } = createStack({
      tenants: {
        getById: async () => ({
          data: null,
          error: { message: 'Tenant not found' }
        }),
        getBySlug: async () => ({ data: null, error: null }),
        getByDomain: async () => ({ data: null, error: null })
      }
    });
    const result = await facade.run(syncExecution());
    assert.ok(result.validationIssues.length > 0);
  });
});

describe('Telemetry', () => {
  it('includes total duration and stage durations', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.stageDurationsMs.validation !== undefined);
    assert.ok(result.telemetry.stageDurationsMs.summary !== undefined);
  });

  it('succeeded stage count matches succeeded outcomes', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    const succeeded = result.stageExecutions.filter(
      (s) => s.outcome === 'succeeded'
    ).length;
    assert.equal(result.telemetry.succeededStageCount, succeeded);
  });

  it('summary count matches summary items', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(
      result.telemetry.summaryCount,
      result.tenantIntegrationResult.summaryItems.length
    );
  });

  it('skipped stage count is zero on success', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(result.telemetry.skippedStageCount, 0);
  });

  it('stage outcomes map is populated', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(result.telemetry.stageOutcomes.validation, 'succeeded');
    assert.equal(
      result.telemetry.stageOutcomes['business-context-bridge'],
      'succeeded'
    );
  });

  it('result telemetry has duration and summaryItemCount', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.ok(result.telemetry.durationMs >= 0);
    assert.equal(
      result.telemetry.summaryItemCount,
      result.summaryItems.length
    );
  });

  it('each stage execution has duration fields', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    for (const stage of result.stageExecutions) {
      assert.ok(typeof stage.durationMs === 'number');
      assert.ok(stage.startedAt);
      assert.ok(stage.endedAt);
    }
  });

  it('pipelineSummary stagesExecuted equals stage count', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(
      result.pipelineSummary.stagesExecuted,
      result.stageExecutions.length
    );
  });
});

describe('Integration orchestration', () => {
  it('wires adapter session bridge and business bridge', async () => {
    const { facade, adapter, tenantSessionBridge, businessContextBridge } =
      createStack();
    const runner = facade.getRunner();
    assert.equal(runner.getTenantAdapter(), adapter);
    assert.equal(runner.getTenantSessionBridge(), tenantSessionBridge);
    assert.equal(runner.getBusinessContextBridge(), businessContextBridge);
  });

  it('business context bridge result has business context module', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.ok(result.businessContextBridgeResult?.businessContextModule);
  });

  it('session bridge result has isolation module', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.ok(result.sessionBridgeResult?.isolationModule);
  });

  it('provider result uses supabase tenant provider id', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.equal(result.providerResult?.providerId, SUPABASE_TENANT_PROVIDER_ID);
  });

  it('initialBag is preserved in execution bag', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      syncExecution({ initialBag: { custom: 'value' } })
    );
    assert.equal(result.bag.custom, 'value');
  });

  it('actorId flows through without validation error', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      syncExecution({ actorId: 'actor-001' })
    );
    assert.equal(result.tenantIntegrationResult.summary.success, true);
  });

  it('moduleIds can be requested', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      syncExecution({ moduleIds: ['dashboard'] })
    );
    assert.equal(result.tenantIntegrationResult.summary.success, true);
  });

  it('two sequential executes remain independent', async () => {
    const { facade } = createStack();
    const a = await facade.execute(syncExecution());
    const b = await facade.execute(syncExecution());
    assert.equal(a.tenantIntegrationResult.summary.success, true);
    assert.equal(b.tenantIntegrationResult.summary.success, true);
    assert.notEqual(a, b);
  });

  it('facade run and execute agree on success', async () => {
    const { facade } = createStack();
    const executed = await facade.execute(syncExecution());
    const ran = await facade.run(syncExecution());
    assert.equal(
      executed.tenantIntegrationResult.summary.success,
      ran.summary.success
    );
  });

  it('pipelineSummary.success true on happy path', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(result.pipelineSummary.success, true);
  });

  it('does not mutate prior stage executions array identity freeze', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.throws(() => {
      result.stageExecutions.push(
        createTenantIntegrationStageExecution('summary', 'succeeded', 'x')
      );
    });
  });

  it('tenant slug resolution path works', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      createTenantIntegrationExecutionContext({
        operation: 'synchronize',
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({
            tenantSlug: 'demo',
            identityId: 'identity-001'
          })
        ),
        tenantSlug: 'demo',
        tenantId: 'tenant-demo-001'
      })
    );
    assert.equal(result.tenantIntegrationResult.summary.success, true);
  });
});

describe('ExecutionResult contract', () => {
  it('always returns TenantIntegrationResult', async () => {
    const { facade } = createStack();
    const ok = await facade.execute(syncExecution());
    const fail = await facade.execute({ locale: 'de' });
    assert.ok(ok.tenantIntegrationResult.summary);
    assert.ok(fail.tenantIntegrationResult.summary);
  });

  it('summary counters align with pipelineSummary', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(
      result.tenantIntegrationResult.summary.stagesSucceeded,
      result.pipelineSummary.stagesSucceeded
    );
    assert.equal(
      result.tenantIntegrationResult.summary.stagesSkipped,
      result.pipelineSummary.stagesSkipped
    );
    assert.equal(
      result.tenantIntegrationResult.summary.stagesFailed,
      result.pipelineSummary.stagesFailed
    );
  });

  it('validation failure marks stagesFailed > 0', async () => {
    const { facade } = createStack();
    const result = await facade.execute({ locale: 'de', providerId: 'x' });
    assert.ok(result.tenantIntegrationResult.summary.stagesFailed >= 1);
  });

  it('success path has zero skipped stages in summary', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.equal(result.summary.stagesSkipped, 0);
  });

  it('bag key holds same success as result', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    const bagResult = result.bag[PIPELINE_BAG_TENANT_INTEGRATION_RESULT_KEY];
    assert.equal(
      bagResult.summary.success,
      result.tenantIntegrationResult.summary.success
    );
  });
});

describe('Stage labels and skip helpers', () => {
  it('skipped stage detail is preserved', () => {
    const stage = createTenantIntegrationSkippedStageExecution(
      'supabase-provider',
      'Skipped due to validation failure'
    );
    assert.equal(stage.detail, 'Skipped due to validation failure');
  });

  it('failed stage can be created without timing', () => {
    const stage = createTenantIntegrationStageExecution(
      'session-bridge',
      'failed',
      'boom'
    );
    assert.equal(stage.outcome, 'failed');
    assert.ok(stage.durationMs >= 0);
  });

  it('telemetry stageDurationsMs includes skipped stages', () => {
    const stages = [
      createTenantIntegrationStageExecution('validation', 'failed', 'x'),
      createTenantIntegrationSkippedStageExecution('tenant-adapter', 'skip')
    ];
    const telemetry = buildTenantIntegrationExecutionTelemetry(
      stages,
      'a',
      'b',
      10,
      0
    );
    assert.ok(telemetry.stageDurationsMs['tenant-adapter'] !== undefined);
  });
});

describe('DI isolation', () => {
  it('separate stacks do not share registries', () => {
    const a = createStack();
    const b = createStack();
    assert.notEqual(a.adapter, b.adapter);
    assert.notEqual(a.tenantSessionBridge, b.tenantSessionBridge);
    assert.notEqual(a.businessContextBridge, b.businessContextBridge);
  });

  it('businessRuntime-only DI creates bridge internally', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient()
    });
    const adapter = createTenantAdapterWithSupabaseProvider(provider, {
      seedBuiltins: false
    });
    const tenantSessionBridge = createTenantSessionBridge({
      tenantAdapter: adapter
    });
    const businessRuntime = createBusinessAdminRuntime(
      createBusinessAdminRegistryRuntime(true)
    );
    const facade = createTenantIntegrationFacade({
      tenantAdapter: adapter,
      tenantSessionBridge,
      businessRuntime
    });
    const result = await facade.execute(syncExecution());
    assert.equal(result.tenantIntegrationResult.summary.success, true);
  });

  it('runner created with only businessRuntime uses default adapter', () => {
    const businessRuntime = createBusinessAdminRuntime(
      createBusinessAdminRegistryRuntime(true)
    );
    const runner = createTenantIntegrationPipelineRunner({ businessRuntime });
    assert.ok(runner.getTenantAdapter());
    assert.ok(runner.getTenantSessionBridge());
    assert.ok(runner.getBusinessContextBridge());
  });
});

describe('Pipeline stage details', () => {
  it('validation stage detail says passed on success', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    const validation = result.stageExecutions.find(
      (s) => s.stageId === 'validation'
    );
    assert.match(validation.detail, /passed/i);
  });

  it('adapter stage detail mentions operation', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      syncExecution({ operation: 'refresh' })
    );
    const adapter = result.stageExecutions.find(
      (s) => s.stageId === 'tenant-adapter'
    );
    assert.match(adapter.detail, /refresh/);
  });

  it('supabase provider stage succeeds when registered', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    const provider = result.stageExecutions.find(
      (s) => s.stageId === 'supabase-provider'
    );
    assert.equal(provider.outcome, 'succeeded');
    assert.match(provider.detail, /available/i);
  });

  it('empty createTenantIntegrationExecutionContext returns object', () => {
    const context = createTenantIntegrationExecutionContext();
    assert.equal(typeof context, 'object');
  });
});
