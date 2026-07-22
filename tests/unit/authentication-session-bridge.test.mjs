/**
 * Authentication Session Bridge — EPIC-301C (en az 80 unit test)
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
  createAuthenticationSessionBridge,
  createAuthenticationSessionBridgeContext,
  createAuthenticationSessionBridgeRegistry,
  createAuthenticationSessionBridgeRegistryRuntime,
  createAuthenticationSessionBridgeResult,
  resolveBridgeProviderContext,
  mapBridgeOperationToProviderOperation,
  mapAuthenticationStatusToSessionState,
  resolveSessionIdentifiers,
  mapAuthenticationProviderResultToSessionModule,
  createBridgeBindingFromSessionModule,
  mapProviderIssuesToBridgeIssues,
  projectMappedSessionModule,
  PIPELINE_BAG_AUTHENTICATION_SESSION_BRIDGE_RESULT_KEY,
  AuthenticationSessionBridge,
  AuthenticationSessionBridgeRegistry,
  createAuthenticationAdapterWithSupabaseProvider,
  createSupabaseAuthenticationProvider,
  createSupabaseAuthenticationContext,
  toAuthenticationProviderContext,
  createSessionRegistry,
  createSessionRuntime,
  SUPABASE_AUTHENTICATION_PROVIDER_ID
} = await import('../../src/identity/index.ts');

function createUser(overrides = {}) {
  return {
    id: 'user-001',
    email: 'user@example.com',
    user_metadata: { full_name: 'Demo User' },
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
          session: createSession({
            access_token: 'access-token-refreshed',
            expires_at: Math.floor(Date.now() / 1000) + 7200
          })
        },
        error: null
      }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({
        data: { user: createUser() },
        error: null
      }),
      getSession: async () => ({
        data: { session: createSession() },
        error: null
      }),
      ...overrides
    }
  };
}

function createBridge(clientOverrides = {}) {
  const provider = createSupabaseAuthenticationProvider({
    client: createMockClient(clientOverrides)
  });
  const adapter = createAuthenticationAdapterWithSupabaseProvider(provider, {
    seedBuiltins: true
  });
  const sessionRegistry = createSessionRegistry(false);
  const sessionRuntime = createSessionRuntime(sessionRegistry);
  const bridgeRegistry = createAuthenticationSessionBridgeRegistry();
  const bridge = createAuthenticationSessionBridge({
    authenticationAdapter: adapter,
    sessionRuntime,
    sessionRegistry,
    bridgeRegistry
  });
  return { bridge, adapter, sessionRegistry, sessionRuntime, bridgeRegistry };
}

function syncContext(overrides = {}) {
  return createAuthenticationSessionBridgeContext({
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

describe('Bridge initialization', () => {
  it('creates bridge with DI dependencies', () => {
    const { bridge, adapter, sessionRegistry } = createBridge();
    assert.equal(bridge.getAuthenticationAdapter(), adapter);
    assert.equal(bridge.getSessionRegistry(), sessionRegistry);
    assert.ok(bridge.getBridgeRegistry());
  });

  it('throws when authenticationAdapter missing', () => {
    assert.throws(
      () => createAuthenticationSessionBridge({}),
      /authenticationAdapter zorunludur/
    );
  });

  it('does not create singleton instances', () => {
    const a = createBridge().bridge;
    const b = createBridge().bridge;
    assert.notEqual(a, b);
    assert.notEqual(a.getBridgeRegistry(), b.getBridgeRegistry());
  });

  it('AuthenticationSessionBridge is constructable', () => {
    const { adapter, sessionRegistry } = createBridge();
    const instance = new AuthenticationSessionBridge({
      authenticationAdapter: adapter,
      sessionRegistry
    });
    assert.ok(instance instanceof AuthenticationSessionBridge);
  });

  it('uses sessionRuntime registry when sessionRegistry omitted', () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const adapter = createAuthenticationAdapterWithSupabaseProvider(provider);
    const sessionRuntime = createSessionRuntime(createSessionRegistry(false));
    const bridge = createAuthenticationSessionBridge({
      authenticationAdapter: adapter,
      sessionRuntime
    });
    assert.equal(bridge.getSessionRegistry(), sessionRuntime.getRegistry());
  });
});

describe('Bridge context', () => {
  it('defaults locale to tr', () => {
    const context = createAuthenticationSessionBridgeContext({
      operation: 'synchronize',
      providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID
    });
    assert.equal(context.locale, 'tr');
  });

  it('resolveBridgeProviderContext uses providerContext', () => {
    const providerContext = toAuthenticationProviderContext(
      createSupabaseAuthenticationContext({
        email: 'a@b.com',
        password: 'x'
      })
    );
    const resolved = resolveBridgeProviderContext(
      createAuthenticationSessionBridgeContext({
        operation: 'synchronize',
        providerContext,
        identityId: 'override-id'
      })
    );
    assert.equal(resolved.providerId, SUPABASE_AUTHENTICATION_PROVIDER_ID);
    assert.equal(resolved.identityId, 'override-id');
  });

  it('resolveBridgeProviderContext builds from providerId', () => {
    const resolved = resolveBridgeProviderContext(
      createAuthenticationSessionBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID,
        sessionId: 'sess-1'
      })
    );
    assert.equal(resolved.sessionId, 'sess-1');
  });

  it('resolveBridgeProviderContext throws without providerId', () => {
    assert.throws(
      () =>
        resolveBridgeProviderContext(
          createAuthenticationSessionBridgeContext({
            operation: 'synchronize'
          })
        ),
      /providerId veya providerContext zorunludur/
    );
  });

  it('mapBridgeOperationToProviderOperation maps all ops', () => {
    assert.equal(mapBridgeOperationToProviderOperation('synchronize'), 'authenticate');
    assert.equal(mapBridgeOperationToProviderOperation('refresh'), 'refresh');
    assert.equal(mapBridgeOperationToProviderOperation('logout'), 'logout');
    assert.equal(mapBridgeOperationToProviderOperation('validate'), 'validateSession');
  });
});

describe('Session mapping', () => {
  const baseResult = {
    success: true,
    status: 'authenticated',
    operation: 'authenticate',
    providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID,
    principal: {
      principalId: 'principal-supabase-user-001',
      identityId: 'user-001',
      displayName: 'Demo User'
    },
    credentialReference: {
      credentialId: 'sess-access',
      method: 'password',
      issuedAt: '2026-07-22T00:00:00.000Z',
      expiresAt: '2026-07-22T01:00:00.000Z'
    },
    validationIssues: [],
    summaryItems: [],
    telemetry: {
      durationMs: 1,
      startedAt: '2026-07-22T00:00:00.000Z',
      endedAt: '2026-07-22T00:00:00.001Z',
      operation: 'authenticate',
      providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID
    },
    bag: {
      supabaseSession: {
        sessionId: 'sess-access',
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: 1700003600
      }
    }
  };

  it('maps authenticated status to active', () => {
    assert.equal(
      mapAuthenticationStatusToSessionState('authenticated', 'synchronize'),
      'active'
    );
  });

  it('maps expired status to expired', () => {
    assert.equal(
      mapAuthenticationStatusToSessionState('expired', 'validate'),
      'expired'
    );
  });

  it('maps logout operation to revoked', () => {
    assert.equal(
      mapAuthenticationStatusToSessionState('authenticated', 'logout'),
      'revoked'
    );
  });

  it('maps unauthenticated validate to expired', () => {
    assert.equal(
      mapAuthenticationStatusToSessionState('unauthenticated', 'validate'),
      'expired'
    );
  });

  it('resolveSessionIdentifiers prefers supabase session id', () => {
    const ids = resolveSessionIdentifiers(baseResult);
    assert.equal(ids.sessionId, 'sess-access');
    assert.equal(ids.identityId, 'user-001');
    assert.equal(ids.sessionModuleId, 'session-bridge-sess-access');
  });

  it('resolveSessionIdentifiers falls back to existing module', () => {
    const existing = mapAuthenticationProviderResultToSessionModule(baseResult, {
      operation: 'synchronize'
    });
    const ids = resolveSessionIdentifiers(
      { ...baseResult, credentialReference: undefined, bag: {} },
      existing
    );
    assert.equal(ids.sessionId, existing.session.sessionId);
  });

  it('mapAuthenticationProviderResultToSessionModule builds active session', () => {
    const module = mapAuthenticationProviderResultToSessionModule(baseResult, {
      operation: 'synchronize',
      nowIso: '2026-07-22T00:30:00.000Z'
    });
    assert.equal(module.session.state, 'active');
    assert.equal(module.session.identityId, 'user-001');
    assert.equal(module.session.activity.lastAction, 'authenticate');
    assert.equal(module.session.activity.activityCount, 1);
  });

  it('does not copy refresh tokens into session model', () => {
    const module = mapAuthenticationProviderResultToSessionModule(baseResult, {
      operation: 'synchronize'
    });
    assert.equal(module.session.renewalReference.renewalId.startsWith('renew-'), true);
    assert.equal(
      JSON.stringify(module).includes('refresh-token'),
      false
    );
  });

  it('refresh mapping updates lastRenewedAt and activity', () => {
    const first = mapAuthenticationProviderResultToSessionModule(baseResult, {
      operation: 'synchronize',
      nowIso: '2026-07-22T00:00:00.000Z'
    });
    const refreshed = mapAuthenticationProviderResultToSessionModule(baseResult, {
      operation: 'refresh',
      existingModule: first,
      nowIso: '2026-07-22T00:10:00.000Z'
    });
    assert.equal(refreshed.session.renewalReference.lastRenewedAt, '2026-07-22T00:10:00.000Z');
    assert.equal(refreshed.session.activity.activityCount, 2);
    assert.equal(refreshed.session.activity.lastAction, 'refresh');
  });

  it('logout mapping sets revoked state', () => {
    const first = mapAuthenticationProviderResultToSessionModule(baseResult, {
      operation: 'synchronize'
    });
    const loggedOut = mapAuthenticationProviderResultToSessionModule(
      { ...baseResult, status: 'unauthenticated', success: true },
      { operation: 'logout', existingModule: first }
    );
    assert.equal(loggedOut.session.state, 'revoked');
    assert.equal(loggedOut.session.expiration.reason, 'logout');
  });

  it('projectMappedSessionModule sets projected true', () => {
    const module = mapAuthenticationProviderResultToSessionModule(baseResult, {
      operation: 'synchronize'
    });
    const projection = projectMappedSessionModule(module);
    assert.equal(projection.projected, true);
    assert.equal(projection.sessionId, module.session.sessionId);
  });

  it('createBridgeBindingFromSessionModule links ids', () => {
    const module = mapAuthenticationProviderResultToSessionModule(baseResult, {
      operation: 'synchronize'
    });
    const binding = createBridgeBindingFromSessionModule(
      module,
      SUPABASE_AUTHENTICATION_PROVIDER_ID,
      'synchronize'
    );
    assert.equal(binding.sessionModuleId, module.id);
    assert.equal(binding.providerId, SUPABASE_AUTHENTICATION_PROVIDER_ID);
    assert.equal(binding.lastOperation, 'synchronize');
  });

  it('mapProviderIssuesToBridgeIssues copies codes', () => {
    const issues = mapProviderIssuesToBridgeIssues({
      ...baseResult,
      validationIssues: [
        { code: 'InvalidCredentials', message: 'bad', severity: 'error' }
      ]
    });
    assert.equal(issues[0].code, 'InvalidCredentials');
  });
});

describe('Bridge registry', () => {
  let registry;

  beforeEach(() => {
    registry = createAuthenticationSessionBridgeRegistry();
  });

  it('register and getById', () => {
    registry.register({
      id: 'bridge-1',
      providerId: 'p',
      authenticationId: 'a',
      sessionModuleId: 'sm',
      sessionId: 's',
      identityId: 'i',
      principalId: 'pr',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getById('bridge-1'));
  });

  it('register throws on duplicate', () => {
    const binding = {
      id: 'bridge-1',
      providerId: 'p',
      authenticationId: 'a',
      sessionModuleId: 'sm',
      sessionId: 's',
      identityId: 'i',
      principalId: 'pr',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    };
    registry.register(binding);
    assert.throws(() => registry.register(binding), /zaten kayıtlı/);
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          id: '',
          providerId: 'p',
          authenticationId: 'a',
          sessionModuleId: 'sm',
          sessionId: 's',
          identityId: 'i',
          principalId: 'pr',
          order: 1,
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
          lastOperation: 'synchronize'
        }),
      /id zorunludur/
    );
  });

  it('upsert updates existing binding', () => {
    registry.upsert({
      id: 'bridge-1',
      providerId: 'p',
      authenticationId: 'a',
      sessionModuleId: 'sm',
      sessionId: 's',
      identityId: 'i',
      principalId: 'pr',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    registry.upsert({
      id: 'bridge-1',
      providerId: 'p',
      authenticationId: 'a',
      sessionModuleId: 'sm',
      sessionId: 's',
      identityId: 'i',
      principalId: 'pr',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:01:00.000Z',
      lastOperation: 'refresh'
    });
    assert.equal(registry.count(), 1);
    assert.equal(registry.getById('bridge-1').lastOperation, 'refresh');
  });

  it('getBySessionId and getByIdentityId', () => {
    registry.register({
      id: 'bridge-1',
      providerId: 'p',
      authenticationId: 'a',
      sessionModuleId: 'sm',
      sessionId: 'sess-9',
      identityId: 'id-9',
      principalId: 'pr',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getBySessionId('sess-9')?.id, 'bridge-1');
    assert.equal(registry.getByIdentityId('id-9').length, 1);
  });

  it('getByProviderId filters', () => {
    registry.register({
      id: 'bridge-1',
      providerId: 'provider-a',
      authenticationId: 'a',
      sessionModuleId: 'sm',
      sessionId: 's',
      identityId: 'i',
      principalId: 'pr',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getByProviderId('provider-a').length, 1);
    assert.equal(registry.getByProviderId('other').length, 0);
  });

  it('unregister and clear', () => {
    registry.register({
      id: 'bridge-1',
      providerId: 'p',
      authenticationId: 'a',
      sessionModuleId: 'sm',
      sessionId: 's',
      identityId: 'i',
      principalId: 'pr',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.unregister('bridge-1'), true);
    registry.upsert({
      id: 'bridge-2',
      providerId: 'p',
      authenticationId: 'a',
      sessionModuleId: 'sm2',
      sessionId: 's2',
      identityId: 'i',
      principalId: 'pr',
      order: 2,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    registry.clear();
    assert.equal(registry.count(), 0);
  });

  it('runtime alias works', () => {
    const runtime = createAuthenticationSessionBridgeRegistryRuntime();
    assert.ok(runtime instanceof AuthenticationSessionBridgeRegistry);
  });
});

describe('Synchronize flow', () => {
  it('synchronize maps provider session into session runtime', async () => {
    const { bridge, sessionRegistry } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.success, true);
    assert.equal(result.operation, 'synchronize');
    assert.ok(result.sessionModule);
    assert.equal(result.sessionModule.session.state, 'active');
    assert.equal(result.sessionProjection.projected, true);
    assert.equal(sessionRegistry.count(), 1);
    assert.equal(result.telemetry.sessionSynchronizationCount, 1);
  });

  it('synchronize creates bridge binding', async () => {
    const { bridge, bridgeRegistry } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.binding);
    assert.equal(bridgeRegistry.count(), 1);
    assert.equal(result.binding.providerId, SUPABASE_AUTHENTICATION_PROVIDER_ID);
  });

  it('synchronize fails on invalid credentials', async () => {
    const { bridge } = createBridge({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 }
      })
    });
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'InvalidCredentials')
    );
    assert.equal(result.telemetry.sessionSynchronizationCount, 0);
  });

  it('synchronize via execute() with operation', async () => {
    const { bridge } = createBridge();
    const result = await bridge.execute(syncContext());
    assert.equal(result.success, true);
  });

  it('synchronize produces sessionResult summary', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.sessionResult);
    assert.equal(result.sessionResult.sessions.length, 1);
    assert.equal(result.sessionResult.summary.sessionCount, 1);
  });
});

describe('Refresh flow', () => {
  it('refresh updates existing bridged session', async () => {
    const { bridge } = createBridge();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.refresh(
      createAuthenticationSessionBridgeContext({
        operation: 'refresh',
        bridgeBindingId: synced.binding.id,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            refreshToken: 'refresh-token-xyz'
          })
        )
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'refresh');
    assert.equal(result.telemetry.refreshCount, 1);
    assert.equal(result.sessionModule.session.activity.lastAction, 'refresh');
    assert.ok(result.sessionModule.session.renewalReference.lastRenewedAt);
  });

  it('refresh maps session expired errors', async () => {
    const { bridge } = createBridge({
      refreshSession: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid Refresh Token: Refresh Token Not Found' }
      })
    });
    const result = await bridge.refresh(
      createAuthenticationSessionBridgeContext({
        operation: 'refresh',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ refreshToken: 'stale' })
        )
      })
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'SessionExpired')
    );
  });

  it('refresh reuses same session module id', async () => {
    const { bridge } = createBridge();
    const synced = await bridge.synchronize(syncContext());
    const refreshed = await bridge.refresh(
      createAuthenticationSessionBridgeContext({
        operation: 'refresh',
        bridgeBindingId: synced.binding.id,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            refreshToken: 'refresh-token-xyz'
          })
        )
      })
    );
    assert.equal(refreshed.sessionModule.id, synced.sessionModule.id);
  });
});

describe('Logout flow', () => {
  it('logout revokes bridged session', async () => {
    const { bridge, sessionRegistry } = createBridge();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.logout(
      createAuthenticationSessionBridgeContext({
        operation: 'logout',
        bridgeBindingId: synced.binding.id,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.sessionModule.session.state, 'revoked');
    assert.equal(
      sessionRegistry.getById(synced.sessionModule.id).session.state,
      'revoked'
    );
  });

  it('logout succeeds even without prior binding when provider succeeds', async () => {
    const { bridge } = createBridge();
    const result = await bridge.logout(
      createAuthenticationSessionBridgeContext({
        operation: 'logout',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'logout');
  });

  it('logout maps provider unavailable', async () => {
    const { bridge } = createBridge({
      signOut: async () => ({
        error: { message: 'service unavailable', status: 503 }
      })
    });
    const result = await bridge.logout(
      createAuthenticationSessionBridgeContext({
        operation: 'logout',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'ProviderUnavailable'
      )
    );
  });

  it('logout updates binding lastOperation', async () => {
    const { bridge } = createBridge();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.logout(
      createAuthenticationSessionBridgeContext({
        operation: 'logout',
        bridgeBindingId: synced.binding.id,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(result.binding.lastOperation, 'logout');
  });
});

describe('Validation flow', () => {
  it('validate synchronizes active session', async () => {
    const { bridge } = createBridge();
    const result = await bridge.validate(
      createAuthenticationSessionBridgeContext({
        operation: 'validate',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'access' })
        )
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.telemetry.validationCount, 1);
    assert.equal(result.sessionModule.session.state, 'active');
  });

  it('validate maps expired token', async () => {
    const { bridge } = createBridge({
      getUser: async () => ({
        data: { user: null },
        error: { message: 'token has expired' }
      })
    });
    const result = await bridge.validate(
      createAuthenticationSessionBridgeContext({
        operation: 'validate',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'expired' })
        )
      })
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'SessionExpired')
    );
  });

  it('validate updates previously synced session', async () => {
    const { bridge } = createBridge();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.validate(
      createAuthenticationSessionBridgeContext({
        operation: 'validate',
        bridgeBindingId: synced.binding.id,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'access' })
        )
      })
    );
    assert.equal(result.sessionModule.id, synced.sessionModule.id);
    assert.equal(result.sessionModule.session.activity.lastAction, 'validate');
  });
});

describe('Error mapping and bridge failures', () => {
  it('returns BRIDGE_EXECUTION_ERROR when provider context missing', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(
      createAuthenticationSessionBridgeContext({
        operation: 'synchronize'
      })
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'BRIDGE_EXECUTION_ERROR'
      )
    );
  });

  it('createAuthenticationSessionBridgeResult freezes issues', () => {
    const result = createAuthenticationSessionBridgeResult({
      success: false,
      operation: 'synchronize',
      validationIssues: [{ code: 'X', message: 'Y', severity: 'error' }],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        sessionSynchronizationCount: 0,
        refreshCount: 0,
        validationCount: 0,
        summaryCount: 0,
        operation: 'synchronize'
      }
    });
    assert.throws(() => {
      result.validationIssues.push({
        code: 'Z',
        message: 'W',
        severity: 'warning'
      });
    });
  });

  it('exports pipeline bag key', () => {
    assert.equal(
      PIPELINE_BAG_AUTHENTICATION_SESSION_BRIDGE_RESULT_KEY,
      'authenticationSessionBridgeResult'
    );
  });
});

describe('Telemetry', () => {
  it('includes duration and summary count on synchronize', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.summaryCount >= 5);
    assert.equal(result.telemetry.operation, 'synchronize');
  });

  it('refresh telemetry increments refreshCount only', async () => {
    const { bridge } = createBridge();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.refresh(
      createAuthenticationSessionBridgeContext({
        operation: 'refresh',
        bridgeBindingId: synced.binding.id,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            refreshToken: 'refresh-token-xyz'
          })
        )
      })
    );
    assert.equal(result.telemetry.refreshCount, 1);
    assert.equal(result.telemetry.sessionSynchronizationCount, 1);
    assert.equal(result.telemetry.validationCount, 0);
  });

  it('validate telemetry increments validationCount', async () => {
    const { bridge } = createBridge();
    const result = await bridge.validate(
      createAuthenticationSessionBridgeContext({
        operation: 'validate',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'a' })
        )
      })
    );
    assert.equal(result.telemetry.validationCount, 1);
  });

  it('failed sync keeps sync count at zero', async () => {
    const { bridge } = createBridge({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })
    });
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.telemetry.sessionSynchronizationCount, 0);
    assert.equal(result.telemetry.refreshCount, 0);
  });

  it('summary items include telemetry counters', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.ok(
      result.summaryItems.some(
        (item) => item.key === 'sessionSynchronizationCount'
      )
    );
  });
});

describe('End-to-end orchestration', () => {
  it('full lifecycle: sync → refresh → validate → logout', async () => {
    const { bridge, sessionRegistry, bridgeRegistry } = createBridge();
    const synced = await bridge.synchronize(syncContext());
    assert.equal(synced.success, true);

    const refreshed = await bridge.refresh(
      createAuthenticationSessionBridgeContext({
        operation: 'refresh',
        bridgeBindingId: synced.binding.id,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            refreshToken: 'refresh-token-xyz'
          })
        )
      })
    );
    assert.equal(refreshed.success, true);

    const validated = await bridge.validate(
      createAuthenticationSessionBridgeContext({
        operation: 'validate',
        bridgeBindingId: synced.binding.id,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'a' })
        )
      })
    );
    assert.equal(validated.success, true);

    const loggedOut = await bridge.logout(
      createAuthenticationSessionBridgeContext({
        operation: 'logout',
        bridgeBindingId: synced.binding.id,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(loggedOut.success, true);
    assert.equal(loggedOut.sessionModule.session.state, 'revoked');
    assert.equal(sessionRegistry.count(), 1);
    assert.equal(bridgeRegistry.count(), 1);
  });

  it('providerResult is attached on success', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.providerResult.success, true);
    assert.equal(result.providerResult.providerId, SUPABASE_AUTHENTICATION_PROVIDER_ID);
  });

  it('session projection identity matches principal', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.equal(
      result.sessionProjection.identityId,
      result.providerResult.principal.identityId
    );
  });
});

describe('Additional mapping and registry coverage', () => {
  it('maps pending status to pending state', () => {
    assert.equal(
      mapAuthenticationStatusToSessionState('pending', 'synchronize'),
      'pending'
    );
  });

  it('maps revoked status to revoked state', () => {
    assert.equal(
      mapAuthenticationStatusToSessionState('revoked', 'validate'),
      'revoked'
    );
  });

  it('maps unauthenticated synchronize to pending', () => {
    assert.equal(
      mapAuthenticationStatusToSessionState('unauthenticated', 'synchronize'),
      'pending'
    );
  });

  it('resolveSessionIdentifiers uses credential fallback', () => {
    const ids = resolveSessionIdentifiers({
      success: true,
      status: 'authenticated',
      operation: 'authenticate',
      providerId: 'provider-x',
      principal: {
        principalId: 'p1',
        identityId: 'i1',
        displayName: 'N'
      },
      credentialReference: {
        credentialId: 'cred-99',
        method: 'password'
      },
      validationIssues: [],
      summaryItems: [],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        operation: 'authenticate',
        providerId: 'provider-x'
      }
    });
    assert.equal(ids.sessionId, 'cred-99');
    assert.equal(ids.authenticationId, 'auth-bridge-provider-x-i1');
  });

  it('resolveSessionIdentifiers uses provider fallback session id', () => {
    const ids = resolveSessionIdentifiers({
      success: true,
      status: 'authenticated',
      operation: 'authenticate',
      providerId: 'provider-y',
      validationIssues: [],
      summaryItems: [],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        operation: 'authenticate',
        providerId: 'provider-y'
      }
    });
    assert.equal(ids.sessionId, 'sess-bridge-provider-y');
    assert.equal(ids.identityId, 'identity-unknown');
  });

  it('mapping marks expired when expiresAt in the past', () => {
    const module = mapAuthenticationProviderResultToSessionModule(
      {
        success: true,
        status: 'authenticated',
        operation: 'authenticate',
        providerId: 'p',
        principal: {
          principalId: 'p1',
          identityId: 'i1',
          displayName: 'N'
        },
        credentialReference: {
          credentialId: 'c1',
          method: 'password',
          expiresAt: '2020-01-01T00:00:00.000Z'
        },
        validationIssues: [],
        summaryItems: [],
        telemetry: {
          durationMs: 1,
          startedAt: '2026-07-22T00:00:00.000Z',
          endedAt: '2026-07-22T00:00:00.001Z',
          operation: 'authenticate',
          providerId: 'p'
        }
      },
      { operation: 'synchronize', nowIso: '2026-07-22T00:00:00.000Z' }
    );
    assert.equal(module.session.expiration.isExpired, true);
  });

  it('validate mapping sets lastAction validate', () => {
    const module = mapAuthenticationProviderResultToSessionModule(
      {
        success: true,
        status: 'authenticated',
        operation: 'validateSession',
        providerId: 'p',
        principal: {
          principalId: 'p1',
          identityId: 'i1',
          displayName: 'N'
        },
        credentialReference: {
          credentialId: 'c1',
          method: 'password',
          expiresAt: '2099-01-01T00:00:00.000Z'
        },
        validationIssues: [],
        summaryItems: [],
        telemetry: {
          durationMs: 1,
          startedAt: '2026-07-22T00:00:00.000Z',
          endedAt: '2026-07-22T00:00:00.001Z',
          operation: 'validateSession',
          providerId: 'p'
        }
      },
      { operation: 'validate' }
    );
    assert.equal(module.session.activity.lastAction, 'validate');
  });

  it('mapProviderIssuesToBridgeIssues returns empty for undefined', () => {
    assert.deepEqual(mapProviderIssuesToBridgeIssues(undefined), []);
  });

  it('createBridgeBindingFromSessionModule reuses existing binding id', () => {
    const module = mapAuthenticationProviderResultToSessionModule(
      {
        success: true,
        status: 'authenticated',
        operation: 'authenticate',
        providerId: 'p',
        principal: {
          principalId: 'p1',
          identityId: 'i1',
          displayName: 'N'
        },
        credentialReference: {
          credentialId: 'c1',
          method: 'password'
        },
        validationIssues: [],
        summaryItems: [],
        telemetry: {
          durationMs: 1,
          startedAt: '2026-07-22T00:00:00.000Z',
          endedAt: '2026-07-22T00:00:00.001Z',
          operation: 'authenticate',
          providerId: 'p'
        }
      },
      { operation: 'synchronize' }
    );
    const existing = createBridgeBindingFromSessionModule(
      module,
      'p',
      'synchronize'
    );
    const updated = createBridgeBindingFromSessionModule(
      module,
      'p',
      'refresh',
      existing
    );
    assert.equal(updated.id, existing.id);
    assert.equal(updated.lastOperation, 'refresh');
  });

  it('registry getBySessionModuleId resolves binding', () => {
    const registry = createAuthenticationSessionBridgeRegistry();
    registry.register({
      id: 'bridge-sm',
      providerId: 'p',
      authenticationId: 'a',
      sessionModuleId: 'module-42',
      sessionId: 's',
      identityId: 'i',
      principalId: 'pr',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(
      registry.getBySessionModuleId('module-42')?.id,
      'bridge-sm'
    );
  });

  it('registry register throws without sessionModuleId', () => {
    const registry = createAuthenticationSessionBridgeRegistry();
    assert.throws(
      () =>
        registry.register({
          id: 'bridge-x',
          providerId: 'p',
          authenticationId: 'a',
          sessionModuleId: '',
          sessionId: 's',
          identityId: 'i',
          principalId: 'pr',
          order: 1,
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
          lastOperation: 'synchronize'
        }),
      /sessionModuleId zorunludur/
    );
  });

  it('registry register throws without sessionId', () => {
    const registry = createAuthenticationSessionBridgeRegistry();
    assert.throws(
      () =>
        registry.register({
          id: 'bridge-x',
          providerId: 'p',
          authenticationId: 'a',
          sessionModuleId: 'sm',
          sessionId: '',
          identityId: 'i',
          principalId: 'pr',
          order: 1,
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
          lastOperation: 'synchronize'
        }),
      /sessionId zorunludur/
    );
  });

  it('registry register throws without providerId', () => {
    const registry = createAuthenticationSessionBridgeRegistry();
    assert.throws(
      () =>
        registry.register({
          id: 'bridge-x',
          providerId: '',
          authenticationId: 'a',
          sessionModuleId: 'sm',
          sessionId: 's',
          identityId: 'i',
          principalId: 'pr',
          order: 1,
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
          lastOperation: 'synchronize'
        }),
      /providerId zorunludur/
    );
  });

  it('getAll returns bindings sorted by order', () => {
    const registry = createAuthenticationSessionBridgeRegistry();
    registry.register({
      id: 'b2',
      providerId: 'p',
      authenticationId: 'a',
      sessionModuleId: 'sm2',
      sessionId: 's2',
      identityId: 'i',
      principalId: 'pr',
      order: 2,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    registry.register({
      id: 'b1',
      providerId: 'p',
      authenticationId: 'a',
      sessionModuleId: 'sm1',
      sessionId: 's1',
      identityId: 'i',
      principalId: 'pr',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    const all = registry.getAll();
    assert.equal(all[0].id, 'b1');
    assert.equal(all[1].id, 'b2');
  });
});

describe('Additional bridge orchestration coverage', () => {
  it('synchronize with providerId-only context', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(
      createAuthenticationSessionBridgeContext({
        operation: 'synchronize',
        providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID,
        bag: {
          supabaseAuthentication: {
            email: 'user@example.com',
            password: 'secret'
          }
        }
      })
    );
    assert.equal(result.success, true);
  });

  it('resolve binding by sessionId on refresh', async () => {
    const { bridge } = createBridge();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.refresh(
      createAuthenticationSessionBridgeContext({
        operation: 'refresh',
        sessionId: synced.binding.sessionId,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            refreshToken: 'refresh-token-xyz'
          })
        )
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.binding.id, synced.binding.id);
  });

  it('preserves bag on successful synchronize', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(
      syncContext({ bag: { requestId: 'req-7' } })
    );
    assert.equal(result.bag.requestId, 'req-7');
    assert.equal(result.bag.providerSuccess, true);
  });

  it('device reference defaults to web platform', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.sessionModule.session.deviceReference.platform, 'web');
  });

  it('sessionResult active count is one after sync', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.sessionResult.summary.activeSessionCount, 1);
  });

  it('failed validate does not create session module when no principal', async () => {
    const { bridge, sessionRegistry } = createBridge({
      getUser: async () => ({
        data: { user: null },
        error: { message: 'JWT expired' }
      }),
      getSession: async () => ({
        data: { session: null },
        error: { message: 'JWT expired' }
      })
    });
    const result = await bridge.validate(
      createAuthenticationSessionBridgeContext({
        operation: 'validate',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'bad' })
        )
      })
    );
    assert.equal(result.success, false);
    assert.equal(sessionRegistry.count(), 0);
  });

  it('getSessionRuntime returns injected runtime', () => {
    const { bridge, sessionRuntime } = createBridge();
    assert.equal(bridge.getSessionRuntime(), sessionRuntime);
  });

  it('createAuthenticationSessionBridgeResult copies session module deeply', () => {
    const module = mapAuthenticationProviderResultToSessionModule(
      {
        success: true,
        status: 'authenticated',
        operation: 'authenticate',
        providerId: 'p',
        principal: {
          principalId: 'p1',
          identityId: 'i1',
          displayName: 'N'
        },
        credentialReference: {
          credentialId: 'c1',
          method: 'password',
          expiresAt: '2099-01-01T00:00:00.000Z'
        },
        validationIssues: [],
        summaryItems: [],
        telemetry: {
          durationMs: 1,
          startedAt: '2026-07-22T00:00:00.000Z',
          endedAt: '2026-07-22T00:00:00.001Z',
          operation: 'authenticate',
          providerId: 'p'
        }
      },
      { operation: 'synchronize' }
    );
    const result = createAuthenticationSessionBridgeResult({
      success: true,
      operation: 'synchronize',
      sessionModule: module,
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        sessionSynchronizationCount: 1,
        refreshCount: 0,
        validationCount: 0,
        summaryCount: 1,
        operation: 'synchronize'
      }
    });
    assert.equal(result.sessionModule.id, module.id);
    assert.notEqual(result.sessionModule.session, module.session);
  });

  it('logout without binding still returns summary items', async () => {
    const { bridge } = createBridge();
    const result = await bridge.logout(
      createAuthenticationSessionBridgeContext({
        operation: 'logout',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.ok(result.summaryItems.some((item) => item.key === 'operation'));
  });
});
