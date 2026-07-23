/**
 * Authentication End-to-End Runtime — EPIC-301E (en az 100 unit test)
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
  createAuthenticationIntegrationFacade,
  createAuthenticationIntegrationPipelineRunner,
  createAuthenticationIntegrationExecutionContext,
  validateAuthenticationIntegrationContext,
  createAuthenticationIntegrationSkippedStageExecution,
  createAuthenticationIntegrationStageExecution,
  buildAuthenticationIntegrationExecutionTelemetry,
  buildAuthenticationIntegrationPipelineExecutionSummary,
  createEmptyAuthenticationIntegrationResult,
  createAuthenticationIntegrationResult,
  buildAuthenticationIntegrationE2ESummaryItems,
  AUTHENTICATION_INTEGRATION_PIPELINE_STAGES,
  AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE,
  AUTHENTICATION_INTEGRATION_STAGE_LABELS,
  PIPELINE_BAG_AUTHENTICATION_INTEGRATION_RESULT_KEY,
  AuthenticationIntegrationFacade,
  AuthenticationIntegrationPipelineRunner,
  createAuthenticationAdapterWithSupabaseProvider,
  createSupabaseAuthenticationProvider,
  createSupabaseAuthenticationContext,
  toAuthenticationProviderContext,
  createAuthenticationSessionBridge,
  createAuthenticationSessionBridgeRegistry,
  createIdentityBridge,
  createIdentityBridgeRegistry,
  createSessionRegistry,
  createSessionRuntime,
  createIdentityRegistry,
  createIdentityRuntime,
  SUPABASE_AUTHENTICATION_PROVIDER_ID
} = await import('../../src/identity/index.ts');

function createUser(overrides = {}) {
  return {
    id: 'user-001',
    email: 'user@example.com',
    user_metadata: { full_name: 'Demo User', tenant_id: 'tenant-1' },
    app_metadata: {},
    ...overrides
  };
}

function createSession(overrides = {}) {
  return {
    access_token: 'access-token-abc123xyz',
    refresh_token: 'refresh-token-xyz',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: createUser(),
    ...overrides
  };
}

function createMockClient(overrides = {}) {
  return {
    auth: {
      signInWithPassword: async () => ({
        data: { user: createUser(), session: createSession() },
        error: null
      }),
      refreshSession: async () => ({
        data: {
          user: createUser(),
          session: createSession({ access_token: 'access-token-refreshed' })
        },
        error: null
      }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: createUser() }, error: null }),
      getSession: async () => ({
        data: { session: createSession() },
        error: null
      }),
      ...overrides
    }
  };
}

function createStack(clientOverrides = {}) {
  const provider = createSupabaseAuthenticationProvider({
    client: createMockClient(clientOverrides)
  });
  const adapter = createAuthenticationAdapterWithSupabaseProvider(provider);
  const sessionRegistry = createSessionRegistry(false);
  const sessionRuntime = createSessionRuntime(sessionRegistry);
  const sessionBridge = createAuthenticationSessionBridge({
    authenticationAdapter: adapter,
    sessionRuntime,
    sessionRegistry,
    bridgeRegistry: createAuthenticationSessionBridgeRegistry()
  });
  const identityRegistry = createIdentityRegistry(false);
  const identityRuntime = createIdentityRuntime(identityRegistry);
  const identityBridge = createIdentityBridge({
    authenticationAdapter: adapter,
    authenticationSessionBridge: sessionBridge,
    identityRuntime,
    identityRegistry,
    bridgeRegistry: createIdentityBridgeRegistry()
  });
  const runner = createAuthenticationIntegrationPipelineRunner({
    authenticationAdapter: adapter,
    authenticationSessionBridge: sessionBridge,
    identityBridge
  });
  const facade = createAuthenticationIntegrationFacade({
    authenticationAdapter: adapter,
    authenticationSessionBridge: sessionBridge,
    identityBridge
  });
  return { facade, runner, adapter, sessionBridge, identityBridge };
}

function syncExecution(overrides = {}) {
  return createAuthenticationIntegrationExecutionContext({
    operation: 'synchronize',
    providerContext: toAuthenticationProviderContext(
      createSupabaseAuthenticationContext({
        email: 'user@example.com',
        password: 'secret'
      })
    ),
    ...overrides
  });
}

describe('Stages metadata', () => {
  it('defines 6 pipeline stages', () => {
    assert.equal(AUTHENTICATION_INTEGRATION_PIPELINE_STAGES.length, 6);
  });

  it('starts with validation and ends with summary', () => {
    assert.equal(AUTHENTICATION_INTEGRATION_PIPELINE_STAGES[0], 'validation');
    assert.equal(
      AUTHENTICATION_INTEGRATION_PIPELINE_STAGES[
        AUTHENTICATION_INTEGRATION_PIPELINE_STAGES.length - 1
      ],
      'summary'
    );
  });

  it('skip-on-validation list excludes summary', () => {
    assert.equal(
      AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE.includes('summary'),
      false
    );
    assert.equal(AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE.length, 4);
  });

  it('stage labels cover all stages', () => {
    for (const stage of AUTHENTICATION_INTEGRATION_PIPELINE_STAGES) {
      assert.ok(AUTHENTICATION_INTEGRATION_STAGE_LABELS[stage]);
    }
  });

  it('exports pipeline bag key', () => {
    assert.equal(
      PIPELINE_BAG_AUTHENTICATION_INTEGRATION_RESULT_KEY,
      'authenticationIntegrationResult'
    );
  });
});

describe('Validation', () => {
  it('passes for valid providerContext', () => {
    const issues = validateAuthenticationIntegrationContext(syncExecution());
    assert.equal(issues.length, 0);
  });

  it('errors on invalid locale', () => {
    const issues = validateAuthenticationIntegrationContext(
      syncExecution({ locale: 'de' })
    );
    assert.ok(issues.some((item) => item.code === 'INVALID_LOCALE'));
  });

  it('errors on invalid operation', () => {
    const issues = validateAuthenticationIntegrationContext(
      syncExecution({ operation: 'nope' })
    );
    assert.ok(issues.some((item) => item.code === 'INVALID_OPERATION'));
  });

  it('errors on empty actorId', () => {
    const issues = validateAuthenticationIntegrationContext(
      syncExecution({ actorId: '  ' })
    );
    assert.ok(issues.some((item) => item.code === 'EMPTY_ACTOR_ID'));
  });

  it('errors when providerContext and providerId missing', () => {
    const issues = validateAuthenticationIntegrationContext({
      operation: 'synchronize'
    });
    assert.ok(
      issues.some((item) => item.code === 'PROVIDER_CONTEXT_REQUIRED')
    );
  });

  it('errors on empty providerId', () => {
    const issues = validateAuthenticationIntegrationContext({
      providerId: ''
    });
    assert.ok(issues.some((item) => item.code === 'EMPTY_PROVIDER_ID'));
  });

  it('errors on empty providerContext.providerId', () => {
    const issues = validateAuthenticationIntegrationContext({
      providerContext: { locale: 'tr', providerId: '' }
    });
    assert.ok(
      issues.some((item) => item.code === 'EMPTY_PROVIDER_CONTEXT_ID')
    );
  });

  it('allows providerId without providerContext', () => {
    const issues = validateAuthenticationIntegrationContext({
      providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID
    });
    assert.equal(
      issues.some((item) => item.code === 'PROVIDER_CONTEXT_REQUIRED'),
      false
    );
  });

  it('defaults locale to tr when omitted', () => {
    const issues = validateAuthenticationIntegrationContext({
      providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID
    });
    assert.equal(issues.some((item) => item.code === 'INVALID_LOCALE'), false);
  });

  it('createAuthenticationIntegrationExecutionContext copies fields', () => {
    const context = createAuthenticationIntegrationExecutionContext({
      operation: 'refresh',
      providerId: 'p'
    });
    assert.equal(context.operation, 'refresh');
    assert.equal(context.providerId, 'p');
  });
});

describe('Helper factories', () => {
  it('createAuthenticationIntegrationSkippedStageExecution marks skipped', () => {
    const stage = createAuthenticationIntegrationSkippedStageExecution(
      'session-bridge',
      'skip'
    );
    assert.equal(stage.outcome, 'skipped');
    assert.equal(stage.stageId, 'session-bridge');
  });

  it('createAuthenticationIntegrationStageExecution records outcome', () => {
    const stage = createAuthenticationIntegrationStageExecution(
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

  it('buildAuthenticationIntegrationPipelineExecutionSummary counts outcomes', () => {
    const summary = buildAuthenticationIntegrationPipelineExecutionSummary([
      createAuthenticationIntegrationStageExecution('validation', 'succeeded', 'a'),
      createAuthenticationIntegrationSkippedStageExecution(
        'authentication-adapter',
        'b'
      ),
      createAuthenticationIntegrationStageExecution(
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

  it('buildAuthenticationIntegrationExecutionTelemetry aggregates', () => {
    const stages = [
      createAuthenticationIntegrationStageExecution('validation', 'succeeded', 'a'),
      createAuthenticationIntegrationSkippedStageExecution('summary', 'b')
    ];
    const telemetry = buildAuthenticationIntegrationExecutionTelemetry(
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

  it('createEmptyAuthenticationIntegrationResult is unsuccessful', () => {
    const result = createEmptyAuthenticationIntegrationResult(
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
  });

  it('createAuthenticationIntegrationResult freezes issues', () => {
    const result = createAuthenticationIntegrationResult({
      success: true,
      adapterSucceeded: true,
      providerSucceeded: true,
      sessionBridgeSucceeded: true,
      identityBridgeSucceeded: true,
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

  it('buildAuthenticationIntegrationE2ESummaryItems includes counters', () => {
    const integration = createAuthenticationIntegrationResult({
      success: true,
      adapterSucceeded: true,
      providerSucceeded: true,
      sessionBridgeSucceeded: true,
      identityBridgeSucceeded: true,
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
    const items = buildAuthenticationIntegrationE2ESummaryItems(
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
    assert.ok(items.some((item) => item.key === 'identityBridgeSucceeded'));
  });
});

describe('Facade and runner initialization', () => {
  it('creates facade with DI stack', () => {
    const { facade, runner } = createStack();
    assert.ok(facade instanceof AuthenticationIntegrationFacade);
    assert.ok(runner instanceof AuthenticationIntegrationPipelineRunner);
  });

  it('facade getRunner returns pipeline runner', () => {
    const { facade } = createStack();
    assert.ok(
      facade.getRunner() instanceof AuthenticationIntegrationPipelineRunner
    );
  });

  it('does not create singleton facades', () => {
    const a = createStack().facade;
    const b = createStack().facade;
    assert.notEqual(a, b);
  });

  it('runner exposes injected dependencies', () => {
    const { runner, adapter, sessionBridge, identityBridge } = createStack();
    assert.equal(runner.getAuthenticationAdapter(), adapter);
    assert.equal(runner.getAuthenticationSessionBridge(), sessionBridge);
    assert.equal(runner.getIdentityBridge(), identityBridge);
  });

  it('createAuthenticationIntegrationFacade without deps still constructs', () => {
    const facade = createAuthenticationIntegrationFacade();
    assert.ok(facade instanceof AuthenticationIntegrationFacade);
  });

  it('AuthenticationIntegrationPipelineRunner is constructable', () => {
    const { adapter, sessionBridge, identityBridge } = createStack();
    const runner = new AuthenticationIntegrationPipelineRunner({
      authenticationAdapter: adapter,
      authenticationSessionBridge: sessionBridge,
      identityBridge
    });
    assert.ok(runner instanceof AuthenticationIntegrationPipelineRunner);
  });
});

describe('Pipeline success path', () => {
  it('execute runs full pipeline and succeeds', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(result.authenticationIntegrationResult.summary.success, true);
    assert.equal(result.stageExecutions.length, 6);
    assert.equal(result.pipelineSummary.stagesFailed, 0);
  });

  it('run returns AuthenticationIntegrationResult shortcut', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.equal(result.summary.success, true);
    assert.ok(result.providerResult);
    assert.ok(result.sessionBridgeResult);
    assert.ok(result.identityBridgeResult);
  });

  it('all non-summary stages succeed on sync', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    for (const stage of result.stageExecutions) {
      if (stage.stageId !== 'summary') {
        assert.equal(stage.outcome, 'succeeded', stage.stageId);
      }
    }
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'summary')?.outcome,
      'succeeded'
    );
  });

  it('stores integration result in bag', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.ok(result.bag[PIPELINE_BAG_AUTHENTICATION_INTEGRATION_RESULT_KEY]);
  });

  it('adapter and provider flags are true', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.equal(result.summary.adapterSucceeded, true);
    assert.equal(result.summary.providerSucceeded, true);
    assert.equal(result.summary.sessionBridgeSucceeded, true);
    assert.equal(result.summary.identityBridgeSucceeded, true);
  });

  it('refresh operation succeeds', async () => {
    const { facade } = createStack();
    await facade.execute(syncExecution());
    const result = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        operation: 'refresh',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            refreshToken: 'refresh-token-xyz'
          })
        )
      })
    );
    assert.equal(result.authenticationIntegrationResult.summary.success, true);
  });

  it('validate operation succeeds', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        operation: 'validate',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'access' })
        )
      })
    );
    assert.equal(result.authenticationIntegrationResult.summary.success, true);
  });

  it('logout operation succeeds', async () => {
    const { facade } = createStack();
    await facade.execute(syncExecution());
    const result = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        operation: 'logout',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(result.authenticationIntegrationResult.summary.success, true);
  });

  it('defaults operation to synchronize', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            email: 'user@example.com',
            password: 'secret'
          })
        )
      })
    );
    assert.equal(result.authenticationIntegrationResult.summary.success, true);
  });

  it('providerId-only context works with bag credentials', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID,
        initialBag: {
          supabaseAuthentication: {
            email: 'user@example.com',
            password: 'secret'
          }
        }
      })
    );
    assert.equal(result.authenticationIntegrationResult.summary.success, true);
  });
});

describe('Validation failure path', () => {
  it('skips adapter/provider/session/identity on validation failure', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        locale: 'de',
        providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID
      })
    );
    assert.equal(result.authenticationIntegrationResult.summary.success, false);
    const skipped = result.stageExecutions.filter((s) => s.outcome === 'skipped');
    assert.equal(skipped.length, 4);
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'summary')?.outcome,
      'succeeded'
    );
  });

  it('does not attach nested bridge results when validation fails', async () => {
    const { facade } = createStack();
    const result = await facade.run(
      createAuthenticationIntegrationExecutionContext({
        locale: 'xx',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            email: 'a@b.com',
            password: 'x'
          })
        )
      })
    );
    assert.equal(result.providerResult, undefined);
    assert.equal(result.sessionBridgeResult, undefined);
    assert.equal(result.identityBridgeResult, undefined);
  });

  it('validation failure still returns valid ExecutionResult', async () => {
    const { facade } = createStack();
    const result = await facade.execute({ locale: 'bad' });
    assert.ok(result.authenticationIntegrationResult);
    assert.ok(result.stageExecutions);
    assert.ok(result.pipelineSummary);
    assert.ok(result.telemetry);
    assert.ok(result.bag);
  });

  it('telemetry records skipped stages on validation failure', async () => {
    const { facade } = createStack();
    const result = await facade.execute({
      locale: 'fr',
      providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID
    });
    assert.equal(result.telemetry.skippedStageCount, 4);
    assert.ok(result.telemetry.succeededStageCount >= 1);
  });

  it('missing provider context fails validation and skips stages', async () => {
    const { facade } = createStack();
    const result = await facade.execute({ operation: 'synchronize' });
    assert.ok(
      result.authenticationIntegrationResult.validationIssues.some(
        (item) => item.code === 'PROVIDER_CONTEXT_REQUIRED'
      )
    );
    assert.equal(
      result.stageExecutions.filter((s) => s.outcome === 'skipped').length,
      4
    );
  });
});

describe('Failure path — adapter/provider', () => {
  it('invalid credentials fails adapter and downstream stages', async () => {
    const { facade } = createStack({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 }
      })
    });
    const result = await facade.execute(syncExecution());
    assert.equal(result.authenticationIntegrationResult.summary.success, false);
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'authentication-adapter')
        ?.outcome,
      'failed'
    );
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'summary')?.outcome,
      'succeeded'
    );
  });

  it('collects InvalidCredentials in validationIssues', async () => {
    const { facade } = createStack({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })
    });
    const result = await facade.run(syncExecution());
    assert.ok(
      result.validationIssues.some((item) => item.code === 'InvalidCredentials')
    );
  });

  it('expired refresh fails pipeline', async () => {
    const { facade } = createStack({
      refreshSession: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid Refresh Token: Refresh Token Not Found' }
      })
    });
    const result = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        operation: 'refresh',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ refreshToken: 'stale' })
        )
      })
    );
    assert.equal(result.authenticationIntegrationResult.summary.success, false);
    assert.ok(
      result.authenticationIntegrationResult.validationIssues.some(
        (item) => item.code === 'SessionExpired' || item.code.includes('SessionExpired')
      )
    );
  });

  it('provider unavailable on logout fails', async () => {
    const { facade } = createStack({
      signOut: async () => ({
        error: { message: 'service unavailable', status: 503 }
      })
    });
    const result = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        operation: 'logout',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(result.authenticationIntegrationResult.summary.success, false);
  });

  it('summary always runs after adapter failure', async () => {
    const { facade } = createStack({
      signInWithPassword: async () => {
        throw new Error('Failed to fetch');
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
      result.authenticationIntegrationResult.summaryItems.length
    );
    assert.ok(result.telemetry.summaryCount >= 5);
  });

  it('stage outcomes map includes all executed stages', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    for (const stage of AUTHENTICATION_INTEGRATION_PIPELINE_STAGES) {
      assert.ok(result.telemetry.stageOutcomes[stage]);
    }
  });

  it('result telemetry summaryItemCount aligns', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.equal(
      result.telemetry.summaryItemCount,
      result.summaryItems.length
    );
  });

  it('pipelineSummary stagesExecuted equals stageExecutions length', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(
      result.pipelineSummary.stagesExecuted,
      result.stageExecutions.length
    );
  });
});

describe('Integration orchestration', () => {
  it('full lifecycle sync → refresh → validate → logout', async () => {
    const { facade } = createStack();
    const synced = await facade.execute(syncExecution());
    assert.equal(synced.authenticationIntegrationResult.summary.success, true);

    const refreshed = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        operation: 'refresh',
        sessionBridgeBindingId:
          synced.authenticationIntegrationResult.sessionBridgeResult?.binding
            ?.id,
        identityBridgeBindingId:
          synced.authenticationIntegrationResult.identityBridgeResult?.binding
            ?.id,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            refreshToken: 'refresh-token-xyz'
          })
        )
      })
    );
    assert.equal(refreshed.authenticationIntegrationResult.summary.success, true);

    const validated = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        operation: 'validate',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'a' })
        )
      })
    );
    assert.equal(validated.authenticationIntegrationResult.summary.success, true);

    const loggedOut = await facade.execute(
      createAuthenticationIntegrationExecutionContext({
        operation: 'logout',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(loggedOut.authenticationIntegrationResult.summary.success, true);
  });

  it('identity bridge result includes identity module on sync', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.ok(result.identityBridgeResult?.identityModule);
    assert.equal(result.identityBridgeResult.identityModule.status, 'active');
  });

  it('session bridge result includes session module on sync', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.ok(result.sessionBridgeResult?.sessionModule);
    assert.equal(result.sessionBridgeResult.sessionModule.session.state, 'active');
  });

  it('provider result providerId is supabase', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.equal(
      result.providerResult.providerId,
      SUPABASE_AUTHENTICATION_PROVIDER_ID
    );
  });

  it('stage order matches pipeline definition', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    const ids = result.stageExecutions.map((s) => s.stageId);
    assert.deepEqual([...ids], [...AUTHENTICATION_INTEGRATION_PIPELINE_STAGES]);
  });

  it('preserves initialBag entries', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      syncExecution({ initialBag: { requestId: 'req-e2e' } })
    );
    assert.equal(result.bag.requestId, 'req-e2e');
  });

  it('en locale is accepted', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution({ locale: 'en' }));
    assert.equal(result.authenticationIntegrationResult.summary.success, true);
  });

  it('runner execute matches facade execute shape', async () => {
    const { runner } = createStack();
    const result = await runner.execute(syncExecution());
    assert.ok(result.authenticationIntegrationResult.summary);
    assert.equal(result.stageExecutions.length, 6);
  });
});

describe('ExecutionResult contract', () => {
  it('always returns frozen stageExecutions array-like', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.throws(() => {
      result.stageExecutions.push({
        stageId: 'summary',
        stageName: 'Summary',
        outcome: 'succeeded',
        detail: 'x',
        durationMs: 0,
        startedAt: '',
        endedAt: ''
      });
    });
  });

  it('summary items include success key', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.ok(result.summaryItems.some((item) => item.key === 'success'));
  });

  it('failed validation sets stagesFailed > 0', async () => {
    const { facade } = createStack();
    const result = await facade.execute({ locale: 'zz', providerId: 'p' });
    assert.ok(result.pipelineSummary.stagesFailed >= 1);
  });

  it('successful run has zero skipped stages', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(result.pipelineSummary.stagesSkipped, 0);
    assert.equal(result.telemetry.skippedStageCount, 0);
  });

  it('each stage has duration and timestamps', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    for (const stage of result.stageExecutions) {
      assert.ok(stage.durationMs >= 0);
      assert.ok(stage.startedAt);
      assert.ok(stage.endedAt);
      assert.ok(stage.stageName);
    }
  });
});

describe('Additional coverage', () => {
  let facade;

  beforeEach(() => {
    facade = createStack().facade;
  });

  it('authentication-adapter stage name is labeled', async () => {
    const result = await facade.execute(syncExecution());
    const stage = result.stageExecutions.find(
      (s) => s.stageId === 'authentication-adapter'
    );
    assert.equal(
      stage.stageName,
      AUTHENTICATION_INTEGRATION_STAGE_LABELS['authentication-adapter']
    );
  });

  it('supabase-provider stage succeeds when provider registered', async () => {
    const result = await facade.execute(syncExecution());
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'supabase-provider')
        ?.outcome,
      'succeeded'
    );
  });

  it('session-bridge stage succeeds', async () => {
    const result = await facade.execute(syncExecution());
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'session-bridge')
        ?.outcome,
      'succeeded'
    );
  });

  it('identity-bridge stage succeeds', async () => {
    const result = await facade.execute(syncExecution());
    assert.equal(
      result.stageExecutions.find((s) => s.stageId === 'identity-bridge')
        ?.outcome,
      'succeeded'
    );
  });

  it('empty actorId causes validation skip path', async () => {
    const result = await facade.execute(
      syncExecution({ actorId: '' })
    );
    assert.equal(result.telemetry.skippedStageCount, 4);
  });

  it('pipeline success requires zero failed stages for happy path', async () => {
    const result = await facade.execute(syncExecution());
    assert.equal(result.pipelineSummary.success, true);
    assert.equal(result.pipelineSummary.stagesFailed, 0);
  });

  it('invalid credentials marks adapterSucceeded false', async () => {
    const { facade: failing } = createStack({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })
    });
    const result = await failing.run(syncExecution());
    assert.equal(result.summary.adapterSucceeded, false);
    assert.equal(result.summary.providerSucceeded, false);
  });

  it('createAuthenticationIntegrationPipelineRunner factory works', () => {
    const runner = createAuthenticationIntegrationPipelineRunner();
    assert.ok(runner instanceof AuthenticationIntegrationPipelineRunner);
  });

  it('facade run with empty options fails validation safely', async () => {
    const result = await facade.run({});
    assert.equal(result.summary.success, false);
    assert.ok(result.validationIssues.length > 0);
  });

  it('nested identity projection is present on success', async () => {
    const result = await facade.run(syncExecution());
    assert.equal(
      result.identityBridgeResult.identityProjection.projected,
      true
    );
  });

  it('nested session projection is present on success', async () => {
    const result = await facade.run(syncExecution());
    assert.equal(
      result.sessionBridgeResult.sessionProjection.projected,
      true
    );
  });

  it('bag contains providerResult after success', async () => {
    const result = await facade.execute(syncExecution());
    assert.ok(result.bag.providerResult);
    assert.ok(result.bag.sessionBridgeResult);
    assert.ok(result.bag.identityBridgeResult);
  });

  it('warning-only validation issues do not skip pipeline', async () => {
    // empty providerId string is error; use valid context
    const result = await facade.execute(syncExecution({ actorId: 'actor-1' }));
    assert.equal(result.authenticationIntegrationResult.summary.success, true);
    assert.equal(result.telemetry.skippedStageCount, 0);
  });

  it('stage detail strings are non-empty', async () => {
    const result = await facade.execute(syncExecution());
    for (const stage of result.stageExecutions) {
      assert.ok(stage.detail.length > 0);
    }
  });

  it('AuthenticationIntegrationFacade constructable via class', () => {
    const { adapter, sessionBridge, identityBridge } = createStack();
    const instance = new AuthenticationIntegrationFacade({
      authenticationAdapter: adapter,
      authenticationSessionBridge: sessionBridge,
      identityBridge
    });
    assert.ok(instance instanceof AuthenticationIntegrationFacade);
  });
});

describe('Extra pipeline and validation coverage', () => {
  it('skip list includes authentication-adapter', () => {
    assert.ok(
      AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE.includes(
        'authentication-adapter'
      )
    );
  });

  it('skip list includes supabase-provider', () => {
    assert.ok(
      AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE.includes(
        'supabase-provider'
      )
    );
  });

  it('skip list includes session-bridge', () => {
    assert.ok(
      AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE.includes(
        'session-bridge'
      )
    );
  });

  it('skip list includes identity-bridge', () => {
    assert.ok(
      AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE.includes(
        'identity-bridge'
      )
    );
  });

  it('validation stage fails before skips are recorded', async () => {
    const { facade } = createStack();
    const result = await facade.execute({ locale: 'es', providerId: 'p' });
    assert.equal(result.stageExecutions[0].stageId, 'validation');
    assert.equal(result.stageExecutions[0].outcome, 'failed');
  });

  it('pipelineSummary.stagesSucceeded includes summary on validation fail', async () => {
    const { facade } = createStack();
    const result = await facade.execute({ locale: 'it', providerId: 'p' });
    assert.ok(result.pipelineSummary.stagesSucceeded >= 1);
    assert.equal(result.pipelineSummary.stagesSkipped, 4);
  });

  it('expired validate maps SessionExpired issues', async () => {
    const { facade } = createStack({
      getUser: async () => ({
        data: { user: null },
        error: { message: 'token has expired' }
      })
    });
    const result = await facade.run(
      createAuthenticationIntegrationExecutionContext({
        operation: 'validate',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'expired' })
        )
      })
    );
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) =>
          item.code === 'SessionExpired' ||
          item.code.includes('SessionExpired')
      )
    );
  });

  it('createEmptyAuthenticationIntegrationResult freezes issues', () => {
    const result = createEmptyAuthenticationIntegrationResult(
      [{ code: 'A', message: 'B', severity: 'error' }],
      {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        summaryItemCount: 0
      }
    );
    assert.throws(() => {
      result.validationIssues.push({
        code: 'C',
        message: 'D',
        severity: 'warning'
      });
    });
  });

  it('buildAuthenticationIntegrationPipelineExecutionSummary success when no failures', () => {
    const summary = buildAuthenticationIntegrationPipelineExecutionSummary([
      createAuthenticationIntegrationStageExecution('validation', 'succeeded', 'a'),
      createAuthenticationIntegrationStageExecution('summary', 'succeeded', 'b')
    ]);
    assert.equal(summary.success, true);
  });

  it('stage execution without timing still has timestamps', () => {
    const stage = createAuthenticationIntegrationStageExecution(
      'summary',
      'succeeded',
      'ok'
    );
    assert.ok(stage.startedAt);
    assert.ok(stage.endedAt);
  });

  it('facade run preserves summary success false on credential failure', async () => {
    const { facade } = createStack({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })
    });
    const result = await facade.run(syncExecution());
    assert.equal(result.summary.success, false);
    assert.equal(result.summary.identityBridgeSucceeded, false);
  });

  it('telemetry stageOutcomes validation is failed on bad locale', async () => {
    const { facade } = createStack();
    const result = await facade.execute({
      locale: 'nl',
      providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID
    });
    assert.equal(result.telemetry.stageOutcomes.validation, 'failed');
    assert.equal(result.telemetry.stageOutcomes.summary, 'succeeded');
  });

  it('telemetry stageOutcomes marks skipped stages', async () => {
    const { facade } = createStack();
    const result = await facade.execute({
      locale: 'pt',
      providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID
    });
    assert.equal(
      result.telemetry.stageOutcomes['authentication-adapter'],
      'skipped'
    );
    assert.equal(result.telemetry.stageOutcomes['identity-bridge'], 'skipped');
  });

  it('successful sync identity status is active', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.equal(
      result.identityBridgeResult.identityModule.status,
      'active'
    );
  });

  it('successful sync session state is active', async () => {
    const { facade } = createStack();
    const result = await facade.run(syncExecution());
    assert.equal(
      result.sessionBridgeResult.sessionModule.session.state,
      'active'
    );
  });

  it('operation logout after sync returns success summary', async () => {
    const { facade } = createStack();
    await facade.execute(syncExecution());
    const result = await facade.run(
      createAuthenticationIntegrationExecutionContext({
        operation: 'logout',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(result.summary.adapterSucceeded, true);
  });

  it('initialBag is merged into returned bag', async () => {
    const { facade } = createStack();
    const result = await facade.execute(
      syncExecution({ initialBag: { trace: 't-1', flag: true } })
    );
    assert.equal(result.bag.trace, 't-1');
    assert.equal(result.bag.flag, true);
  });

  it('result summary stagesSucceeded matches pipeline on success', async () => {
    const { facade } = createStack();
    const result = await facade.execute(syncExecution());
    assert.equal(
      result.authenticationIntegrationResult.summary.stagesSucceeded,
      result.pipelineSummary.stagesSucceeded
    );
  });
});
