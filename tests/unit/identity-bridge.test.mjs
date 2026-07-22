/**
 * Identity Bridge — EPIC-301D (en az 85 unit test)
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
  createIdentityBridge,
  createIdentityBridgeContext,
  createIdentityBridgeRegistry,
  createIdentityBridgeRegistryRuntime,
  createIdentityBridgeResult,
  resolveIdentityBridgeProviderContext,
  mapIdentityBridgeOperationToSessionBridgeOperation,
  toAuthenticationSessionBridgeContextFromIdentity,
  mapAuthenticationStatusToIdentityStatus,
  resolveIdentityIdentifiers,
  mapIntegrationResultsToIdentityModule,
  createIdentityBridgeBindingFromModule,
  mapIntegrationIssuesToIdentityBridgeIssues,
  projectMappedIdentityModule,
  PIPELINE_BAG_IDENTITY_BRIDGE_RESULT_KEY,
  IdentityBridge,
  IdentityBridgeRegistry,
  createAuthenticationAdapterWithSupabaseProvider,
  createSupabaseAuthenticationProvider,
  createSupabaseAuthenticationContext,
  toAuthenticationProviderContext,
  createAuthenticationSessionBridge,
  createAuthenticationSessionBridgeRegistry,
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

function createStack(clientOverrides = {}) {
  const provider = createSupabaseAuthenticationProvider({
    client: createMockClient(clientOverrides)
  });
  const adapter = createAuthenticationAdapterWithSupabaseProvider(provider);
  const sessionRegistry = createSessionRegistry(false);
  const sessionRuntime = createSessionRuntime(sessionRegistry);
  const sessionBridgeRegistry = createAuthenticationSessionBridgeRegistry();
  const sessionBridge = createAuthenticationSessionBridge({
    authenticationAdapter: adapter,
    sessionRuntime,
    sessionRegistry,
    bridgeRegistry: sessionBridgeRegistry
  });
  const identityRegistry = createIdentityRegistry(false);
  const identityRuntime = createIdentityRuntime(identityRegistry);
  const bridgeRegistry = createIdentityBridgeRegistry();
  const bridge = createIdentityBridge({
    authenticationAdapter: adapter,
    authenticationSessionBridge: sessionBridge,
    identityRuntime,
    identityRegistry,
    bridgeRegistry
  });
  return {
    bridge,
    adapter,
    sessionBridge,
    identityRegistry,
    identityRuntime,
    bridgeRegistry
  };
}

function syncContext(overrides = {}) {
  return createIdentityBridgeContext({
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

const baseProviderResult = {
  success: true,
  status: 'authenticated',
  operation: 'authenticate',
  providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID,
  principal: {
    principalId: 'principal-supabase-user-001',
    identityId: 'user-001',
    displayName: 'Demo User',
    tenantId: 'tenant-1'
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
    supabaseUser: {
      id: 'user-001',
      email: 'user@example.com',
      displayName: 'Demo User',
      tenantId: 'tenant-1'
    },
    supabaseSession: {
      sessionId: 'sess-access',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: 1700003600
    }
  }
};

describe('IdentityBridge initialization', () => {
  it('creates bridge with DI dependencies', () => {
    const { bridge, adapter, sessionBridge, identityRegistry } = createStack();
    assert.equal(bridge.getAuthenticationAdapter(), adapter);
    assert.equal(bridge.getAuthenticationSessionBridge(), sessionBridge);
    assert.equal(bridge.getIdentityRegistry(), identityRegistry);
  });

  it('throws when authenticationAdapter missing', () => {
    assert.throws(
      () =>
        createIdentityBridge({
          authenticationSessionBridge: createStack().sessionBridge
        }),
      /authenticationAdapter zorunludur/
    );
  });

  it('throws when authenticationSessionBridge missing', () => {
    assert.throws(
      () =>
        createIdentityBridge({
          authenticationAdapter: createStack().adapter
        }),
      /authenticationSessionBridge zorunludur/
    );
  });

  it('does not create singleton instances', () => {
    const a = createStack().bridge;
    const b = createStack().bridge;
    assert.notEqual(a, b);
    assert.notEqual(a.getBridgeRegistry(), b.getBridgeRegistry());
  });

  it('IdentityBridge is constructable', () => {
    const { adapter, sessionBridge, identityRegistry } = createStack();
    const instance = new IdentityBridge({
      authenticationAdapter: adapter,
      authenticationSessionBridge: sessionBridge,
      identityRegistry
    });
    assert.ok(instance instanceof IdentityBridge);
  });

  it('uses identityRuntime registry when identityRegistry omitted', () => {
    const { adapter, sessionBridge } = createStack();
    const identityRuntime = createIdentityRuntime(createIdentityRegistry(false));
    const bridge = createIdentityBridge({
      authenticationAdapter: adapter,
      authenticationSessionBridge: sessionBridge,
      identityRuntime
    });
    assert.equal(bridge.getIdentityRegistry(), identityRuntime.getRegistry());
  });
});

describe('IdentityBridge context', () => {
  it('defaults locale to tr', () => {
    const context = createIdentityBridgeContext({
      operation: 'synchronize',
      providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID
    });
    assert.equal(context.locale, 'tr');
  });

  it('resolveIdentityBridgeProviderContext uses providerContext', () => {
    const resolved = resolveIdentityBridgeProviderContext(
      createIdentityBridgeContext({
        operation: 'synchronize',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            email: 'a@b.com',
            password: 'x'
          })
        ),
        identityId: 'override-id'
      })
    );
    assert.equal(resolved.providerId, SUPABASE_AUTHENTICATION_PROVIDER_ID);
    assert.equal(resolved.identityId, 'override-id');
  });

  it('resolveIdentityBridgeProviderContext builds from providerId', () => {
    const resolved = resolveIdentityBridgeProviderContext(
      createIdentityBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID,
        sessionId: 'sess-1'
      })
    );
    assert.equal(resolved.sessionId, 'sess-1');
  });

  it('resolveIdentityBridgeProviderContext throws without providerId', () => {
    assert.throws(
      () =>
        resolveIdentityBridgeProviderContext(
          createIdentityBridgeContext({ operation: 'synchronize' })
        ),
      /providerId veya providerContext zorunludur/
    );
  });

  it('mapIdentityBridgeOperationToSessionBridgeOperation maps all ops', () => {
    assert.equal(
      mapIdentityBridgeOperationToSessionBridgeOperation('synchronize'),
      'synchronize'
    );
    assert.equal(
      mapIdentityBridgeOperationToSessionBridgeOperation('refresh'),
      'refresh'
    );
    assert.equal(
      mapIdentityBridgeOperationToSessionBridgeOperation('logout'),
      'logout'
    );
    assert.equal(
      mapIdentityBridgeOperationToSessionBridgeOperation('validate'),
      'validate'
    );
  });

  it('toAuthenticationSessionBridgeContextFromIdentity builds session context', () => {
    const sessionContext = toAuthenticationSessionBridgeContextFromIdentity(
      syncContext({ sessionBridgeBindingId: 'sb-1' })
    );
    assert.equal(sessionContext.operation, 'synchronize');
    assert.equal(sessionContext.bridgeBindingId, 'sb-1');
    assert.ok(sessionContext.providerContext);
  });
});

describe('Identity mapping', () => {
  it('maps authenticated status to active', () => {
    assert.equal(
      mapAuthenticationStatusToIdentityStatus('authenticated', 'synchronize'),
      'active'
    );
  });

  it('maps expired status to inactive', () => {
    assert.equal(
      mapAuthenticationStatusToIdentityStatus('expired', 'validate'),
      'inactive'
    );
  });

  it('maps logout operation to inactive', () => {
    assert.equal(
      mapAuthenticationStatusToIdentityStatus('authenticated', 'logout'),
      'inactive'
    );
  });

  it('maps revoked status to suspended', () => {
    assert.equal(
      mapAuthenticationStatusToIdentityStatus('revoked', 'validate'),
      'suspended'
    );
  });

  it('maps pending status to pending', () => {
    assert.equal(
      mapAuthenticationStatusToIdentityStatus('pending', 'synchronize'),
      'pending'
    );
  });

  it('maps unauthenticated validate to inactive', () => {
    assert.equal(
      mapAuthenticationStatusToIdentityStatus('unauthenticated', 'validate'),
      'inactive'
    );
  });

  it('resolveIdentityIdentifiers prefers principal and bag user', () => {
    const ids = resolveIdentityIdentifiers(baseProviderResult);
    assert.equal(ids.identityId, 'user-001');
    assert.equal(ids.email, 'user@example.com');
    assert.equal(ids.tenantId, 'tenant-1');
    assert.equal(ids.identityModuleId, 'identity-bridge-user-001');
  });

  it('resolveIdentityIdentifiers falls back to existing module', () => {
    const existing = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'synchronize'
    });
    const ids = resolveIdentityIdentifiers(
      {
        ...baseProviderResult,
        principal: undefined,
        bag: {}
      },
      undefined,
      existing
    );
    assert.equal(ids.identityId, existing.user.id);
    assert.equal(ids.identityModuleId, existing.id);
  });

  it('mapIntegrationResultsToIdentityModule builds active identity', () => {
    const module = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'synchronize',
      nowIso: '2026-07-22T00:30:00.000Z'
    });
    assert.equal(module.status, 'active');
    assert.equal(module.user.id, 'user-001');
    assert.equal(module.tenant.id, 'tenant-1');
    assert.equal(module.claims.providerId, SUPABASE_AUTHENTICATION_PROVIDER_ID);
  });

  it('maps session reference from provider credential', () => {
    const module = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'synchronize'
    });
    assert.equal(module.sessionReference.sessionId, 'sess-access');
    assert.ok(module.sessionReference.expiresAt);
  });

  it('projectMappedIdentityModule sets projected true', () => {
    const module = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'synchronize'
    });
    const projection = projectMappedIdentityModule(module);
    assert.equal(projection.projected, true);
    assert.equal(projection.identityId, module.id);
  });

  it('createIdentityBridgeBindingFromModule links ids', () => {
    const module = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'synchronize'
    });
    const binding = createIdentityBridgeBindingFromModule(
      module,
      SUPABASE_AUTHENTICATION_PROVIDER_ID,
      'synchronize'
    );
    assert.equal(binding.identityModuleId, module.id);
    assert.equal(binding.identityId, 'user-001');
    assert.equal(binding.lastOperation, 'synchronize');
  });

  it('logout mapping sets inactive status', () => {
    const first = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'synchronize'
    });
    const loggedOut = mapIntegrationResultsToIdentityModule(
      { ...baseProviderResult, status: 'unauthenticated', success: true },
      { operation: 'logout', existingModule: first }
    );
    assert.equal(loggedOut.status, 'inactive');
  });
});

describe('Authentication and session mapping helpers', () => {
  it('mapIntegrationIssuesToIdentityBridgeIssues copies provider issues', () => {
    const issues = mapIntegrationIssuesToIdentityBridgeIssues({
      ...baseProviderResult,
      validationIssues: [
        { code: 'InvalidCredentials', message: 'bad', severity: 'error' }
      ]
    });
    assert.equal(issues[0].code, 'InvalidCredentials');
  });

  it('mapIntegrationIssuesToIdentityBridgeIssues prefixes session issues', () => {
    const issues = mapIntegrationIssuesToIdentityBridgeIssues(undefined, {
      success: false,
      operation: 'validate',
      validationIssues: [
        { code: 'SessionExpired', message: 'expired', severity: 'error' }
      ],
      summaryItems: [],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        sessionSynchronizationCount: 0,
        refreshCount: 0,
        validationCount: 1,
        summaryCount: 0,
        operation: 'validate'
      }
    });
    assert.equal(issues[0].code, 'SESSION_SessionExpired');
  });

  it('mapIntegrationIssuesToIdentityBridgeIssues handles empty inputs', () => {
    assert.deepEqual(mapIntegrationIssuesToIdentityBridgeIssues(), []);
  });

  it('resolveIdentityIdentifiers uses default tenant when missing', () => {
    const ids = resolveIdentityIdentifiers({
      ...baseProviderResult,
      principal: {
        principalId: 'p',
        identityId: 'i',
        displayName: 'N'
      },
      bag: {}
    });
    assert.equal(ids.tenantId, 'tenant-bridge-default');
  });

  it('binding reuses existing id on refresh', () => {
    const module = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'synchronize'
    });
    const existing = createIdentityBridgeBindingFromModule(
      module,
      SUPABASE_AUTHENTICATION_PROVIDER_ID,
      'synchronize'
    );
    const updated = createIdentityBridgeBindingFromModule(
      module,
      SUPABASE_AUTHENTICATION_PROVIDER_ID,
      'refresh',
      undefined,
      existing
    );
    assert.equal(updated.id, existing.id);
    assert.equal(updated.lastOperation, 'refresh');
  });
});

describe('IdentityBridgeRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createIdentityBridgeRegistry();
  });

  it('register and getById', () => {
    registry.register({
      id: 'ib-1',
      providerId: 'p',
      identityModuleId: 'im',
      identityId: 'i',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getById('ib-1'));
  });

  it('register throws on duplicate', () => {
    const binding = {
      id: 'ib-1',
      providerId: 'p',
      identityModuleId: 'im',
      identityId: 'i',
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
          identityModuleId: 'im',
          identityId: 'i',
          order: 1,
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
          lastOperation: 'synchronize'
        }),
      /id zorunludur/
    );
  });

  it('register throws without identityModuleId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'ib-1',
          providerId: 'p',
          identityModuleId: '',
          identityId: 'i',
          order: 1,
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
          lastOperation: 'synchronize'
        }),
      /identityModuleId zorunludur/
    );
  });

  it('register throws without identityId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'ib-1',
          providerId: 'p',
          identityModuleId: 'im',
          identityId: '',
          order: 1,
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
          lastOperation: 'synchronize'
        }),
      /identityId zorunludur/
    );
  });

  it('register throws without providerId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'ib-1',
          providerId: '',
          identityModuleId: 'im',
          identityId: 'i',
          order: 1,
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
          lastOperation: 'synchronize'
        }),
      /providerId zorunludur/
    );
  });

  it('upsert updates existing binding', () => {
    registry.upsert({
      id: 'ib-1',
      providerId: 'p',
      identityModuleId: 'im',
      identityId: 'i',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    registry.upsert({
      id: 'ib-1',
      providerId: 'p',
      identityModuleId: 'im',
      identityId: 'i',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:01:00.000Z',
      lastOperation: 'refresh'
    });
    assert.equal(registry.count(), 1);
    assert.equal(registry.getById('ib-1').lastOperation, 'refresh');
  });

  it('getByIdentityId and getBySessionId', () => {
    registry.register({
      id: 'ib-1',
      providerId: 'p',
      identityModuleId: 'im',
      identityId: 'id-9',
      sessionId: 'sess-9',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getByIdentityId('id-9').length, 1);
    assert.equal(registry.getBySessionId('sess-9')?.id, 'ib-1');
  });

  it('getByIdentityModuleId and getByProviderId', () => {
    registry.register({
      id: 'ib-1',
      providerId: 'provider-a',
      identityModuleId: 'module-42',
      identityId: 'i',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getByIdentityModuleId('module-42')?.id, 'ib-1');
    assert.equal(registry.getByProviderId('provider-a').length, 1);
  });

  it('getAll returns bindings sorted by order', () => {
    registry.register({
      id: 'b2',
      providerId: 'p',
      identityModuleId: 'im2',
      identityId: 'i',
      order: 2,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    registry.register({
      id: 'b1',
      providerId: 'p',
      identityModuleId: 'im1',
      identityId: 'i',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    const all = registry.getAll();
    assert.equal(all[0].id, 'b1');
    assert.equal(all[1].id, 'b2');
  });

  it('unregister and clear', () => {
    registry.register({
      id: 'ib-1',
      providerId: 'p',
      identityModuleId: 'im',
      identityId: 'i',
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.unregister('ib-1'), true);
    registry.upsert({
      id: 'ib-2',
      providerId: 'p',
      identityModuleId: 'im2',
      identityId: 'i',
      order: 2,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    registry.clear();
    assert.equal(registry.count(), 0);
  });

  it('runtime alias works', () => {
    const runtime = createIdentityBridgeRegistryRuntime();
    assert.ok(runtime instanceof IdentityBridgeRegistry);
  });
});

describe('Synchronize pipeline', () => {
  it('synchronize maps auth+session into identity runtime', async () => {
    const { bridge, identityRegistry } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.success, true);
    assert.equal(result.operation, 'synchronize');
    assert.ok(result.identityModule);
    assert.equal(result.identityModule.status, 'active');
    assert.equal(result.identityProjection.projected, true);
    assert.equal(identityRegistry.count(), 1);
    assert.equal(result.telemetry.identitySynchronizationCount, 1);
  });

  it('synchronize creates identity bridge binding', async () => {
    const { bridge, bridgeRegistry } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.binding);
    assert.equal(bridgeRegistry.count(), 1);
    assert.equal(result.binding.providerId, SUPABASE_AUTHENTICATION_PROVIDER_ID);
  });

  it('synchronize attaches provider and session bridge results', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.providerResult.success, true);
    assert.equal(result.sessionBridgeResult.success, true);
    assert.ok(result.sessionBridgeResult.sessionModule);
  });

  it('synchronize fails on invalid credentials', async () => {
    const { bridge } = createStack({
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
    assert.equal(result.telemetry.identitySynchronizationCount, 0);
  });

  it('synchronize via execute() with operation', async () => {
    const { bridge } = createStack();
    const result = await bridge.execute(syncContext());
    assert.equal(result.success, true);
  });

  it('synchronize produces identityResult summary', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.identityResult);
    assert.equal(result.identityResult.identities.length, 1);
  });

  it('telemetry counts authentication and session mappings', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.telemetry.authenticationMappingCount, 1);
    assert.equal(result.telemetry.sessionMappingCount, 1);
  });
});

describe('Refresh / logout / validate flows', () => {
  it('refresh updates existing bridged identity', async () => {
    const { bridge } = createStack();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.refresh(
      createIdentityBridgeContext({
        operation: 'refresh',
        bridgeBindingId: synced.binding.id,
        sessionBridgeBindingId: synced.binding.sessionBridgeBindingId,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            refreshToken: 'refresh-token-xyz'
          })
        )
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'refresh');
    assert.equal(result.identityModule.id, synced.identityModule.id);
    assert.equal(result.identityModule.status, 'active');
  });

  it('logout deactivates bridged identity', async () => {
    const { bridge, identityRegistry } = createStack();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.logout(
      createIdentityBridgeContext({
        operation: 'logout',
        bridgeBindingId: synced.binding.id,
        sessionBridgeBindingId: synced.binding.sessionBridgeBindingId,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.identityModule.status, 'inactive');
    assert.equal(
      identityRegistry.getById(synced.identityModule.id).status,
      'inactive'
    );
  });

  it('validate synchronizes active identity', async () => {
    const { bridge } = createStack();
    const result = await bridge.validate(
      createIdentityBridgeContext({
        operation: 'validate',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'access' })
        )
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.identityModule.status, 'active');
  });

  it('validate maps expired token errors', async () => {
    const { bridge } = createStack({
      getUser: async () => ({
        data: { user: null },
        error: { message: 'token has expired' }
      })
    });
    const result = await bridge.validate(
      createIdentityBridgeContext({
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

  it('full lifecycle: sync → refresh → validate → logout', async () => {
    const { bridge, identityRegistry, bridgeRegistry } = createStack();
    const synced = await bridge.synchronize(syncContext());
    assert.equal(synced.success, true);

    const refreshed = await bridge.refresh(
      createIdentityBridgeContext({
        operation: 'refresh',
        bridgeBindingId: synced.binding.id,
        sessionBridgeBindingId: synced.binding.sessionBridgeBindingId,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({
            refreshToken: 'refresh-token-xyz'
          })
        )
      })
    );
    assert.equal(refreshed.success, true);

    const validated = await bridge.validate(
      createIdentityBridgeContext({
        operation: 'validate',
        bridgeBindingId: synced.binding.id,
        sessionBridgeBindingId: synced.binding.sessionBridgeBindingId,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'a' })
        )
      })
    );
    assert.equal(validated.success, true);

    const loggedOut = await bridge.logout(
      createIdentityBridgeContext({
        operation: 'logout',
        bridgeBindingId: synced.binding.id,
        sessionBridgeBindingId: synced.binding.sessionBridgeBindingId,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(loggedOut.success, true);
    assert.equal(loggedOut.identityModule.status, 'inactive');
    assert.equal(identityRegistry.count(), 1);
    assert.equal(bridgeRegistry.count(), 1);
  });
});

describe('Error mapping and telemetry', () => {
  it('returns IDENTITY_BRIDGE_EXECUTION_ERROR when provider context missing', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(
      createIdentityBridgeContext({ operation: 'synchronize' })
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'IDENTITY_BRIDGE_EXECUTION_ERROR'
      )
    );
  });

  it('createIdentityBridgeResult freezes issues', () => {
    const result = createIdentityBridgeResult({
      success: false,
      operation: 'synchronize',
      validationIssues: [{ code: 'X', message: 'Y', severity: 'error' }],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        identitySynchronizationCount: 0,
        sessionMappingCount: 0,
        authenticationMappingCount: 0,
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
      PIPELINE_BAG_IDENTITY_BRIDGE_RESULT_KEY,
      'identityBridgeResult'
    );
  });

  it('includes duration and summary count on synchronize', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.summaryCount >= 5);
    assert.equal(result.telemetry.operation, 'synchronize');
  });

  it('failed sync keeps identity sync count at zero', async () => {
    const { bridge } = createStack({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })
    });
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.telemetry.identitySynchronizationCount, 0);
  });

  it('summary items include telemetry counters', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(
      result.summaryItems.some(
        (item) => item.key === 'identitySynchronizationCount'
      )
    );
    assert.ok(
      result.summaryItems.some((item) => item.key === 'sessionMappingCount')
    );
    assert.ok(
      result.summaryItems.some(
        (item) => item.key === 'authenticationMappingCount'
      )
    );
  });

  it('preserves bag on successful synchronize', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(
      syncContext({ bag: { requestId: 'req-9' } })
    );
    assert.equal(result.bag.requestId, 'req-9');
    assert.equal(result.bag.providerSuccess, true);
    assert.equal(result.bag.sessionBridgeSuccess, true);
  });

  it('identity projection user matches principal identity', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.equal(
      result.identityProjection.user.id,
      result.providerResult.principal.identityId
    );
  });

  it('getIdentityRuntime returns injected runtime', () => {
    const { bridge, identityRuntime } = createStack();
    assert.equal(bridge.getIdentityRuntime(), identityRuntime);
  });

  it('createIdentityBridgeResult copies identity module deeply', () => {
    const module = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'synchronize'
    });
    const result = createIdentityBridgeResult({
      success: true,
      operation: 'synchronize',
      identityModule: module,
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        identitySynchronizationCount: 1,
        sessionMappingCount: 1,
        authenticationMappingCount: 1,
        summaryCount: 1,
        operation: 'synchronize'
      }
    });
    assert.equal(result.identityModule.id, module.id);
    assert.notEqual(result.identityModule.user, module.user);
  });

  it('logout without prior binding still succeeds when provider succeeds', async () => {
    const { bridge } = createStack();
    const result = await bridge.logout(
      createIdentityBridgeContext({
        operation: 'logout',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(result.success, true);
  });

  it('synchronize with providerId-only context via bag credentials', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(
      createIdentityBridgeContext({
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
});

describe('Additional coverage', () => {
  it('maps unauthenticated synchronize to pending', () => {
    assert.equal(
      mapAuthenticationStatusToIdentityStatus('unauthenticated', 'synchronize'),
      'pending'
    );
  });

  it('resolveIdentityIdentifiers uses credential session fallback', () => {
    const ids = resolveIdentityIdentifiers({
      ...baseProviderResult,
      bag: {
        supabaseUser: {
          id: 'user-001',
          email: 'user@example.com'
        }
      }
    });
    assert.equal(ids.sessionId, 'sess-access');
  });

  it('resolveIdentityIdentifiers uses provider fallback identity', () => {
    const ids = resolveIdentityIdentifiers({
      success: true,
      status: 'authenticated',
      operation: 'authenticate',
      providerId: 'provider-z',
      validationIssues: [],
      summaryItems: [],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        operation: 'authenticate',
        providerId: 'provider-z'
      }
    });
    assert.equal(ids.identityId, 'identity-unknown');
    assert.equal(ids.identityModuleId, 'identity-bridge-identity-unknown');
  });

  it('mapping includes bridgeOperation claim', () => {
    const module = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'validate'
    });
    assert.equal(module.claims.bridgeOperation, 'validate');
  });

  it('mapping preserves existing roles and permissions', () => {
    const existing = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'synchronize'
    });
    const withRoles = {
      ...existing,
      roles: Object.freeze([{ id: 'viewer', name: 'Viewer', scope: 'tenant' }]),
      permissions: Object.freeze([
        { id: 'read', action: 'read', resource: 'doc' }
      ])
    };
    const refreshed = mapIntegrationResultsToIdentityModule(baseProviderResult, {
      operation: 'refresh',
      existingModule: withRoles
    });
    assert.equal(refreshed.roles.length, 1);
    assert.equal(refreshed.permissions.length, 1);
  });

  it('refresh maps session expired errors through identity bridge', async () => {
    const { bridge } = createStack({
      refreshSession: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid Refresh Token: Refresh Token Not Found' }
      })
    });
    const result = await bridge.refresh(
      createIdentityBridgeContext({
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

  it('logout maps provider unavailable', async () => {
    const { bridge } = createStack({
      signOut: async () => ({
        error: { message: 'service unavailable', status: 503 }
      })
    });
    const result = await bridge.logout(
      createIdentityBridgeContext({
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

  it('validate updates previously synced identity', async () => {
    const { bridge } = createStack();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.validate(
      createIdentityBridgeContext({
        operation: 'validate',
        bridgeBindingId: synced.binding.id,
        sessionBridgeBindingId: synced.binding.sessionBridgeBindingId,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'access' })
        )
      })
    );
    assert.equal(result.identityModule.id, synced.identityModule.id);
  });

  it('resolve binding by identityId on refresh', async () => {
    const { bridge } = createStack();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.refresh(
      createIdentityBridgeContext({
        operation: 'refresh',
        identityId: synced.binding.identityId,
        sessionBridgeBindingId: synced.binding.sessionBridgeBindingId,
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

  it('session bridge binding id is stored on identity binding', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.binding.sessionBridgeBindingId);
    assert.ok(result.binding.sessionModuleId);
  });

  it('identity result identityId matches module id', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.equal(
      result.identityResult.identities[0].identityId,
      result.identityModule.id
    );
  });

  it('claims include authenticationStatus', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.identityModule.claims.authenticationStatus, 'authenticated');
  });

  it('upsert replaces identity module on second synchronize', async () => {
    const { bridge, identityRegistry } = createStack();
    await bridge.synchronize(syncContext());
    await bridge.synchronize(syncContext());
    assert.equal(identityRegistry.count(), 1);
  });

  it('failed validate does not sync identity without principal', async () => {
    const { bridge, identityRegistry } = createStack({
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
      createIdentityBridgeContext({
        operation: 'validate',
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({ accessToken: 'bad' })
        )
      })
    );
    assert.equal(result.success, false);
    assert.equal(identityRegistry.count(), 0);
  });

  it('logout updates binding lastOperation', async () => {
    const { bridge } = createStack();
    const synced = await bridge.synchronize(syncContext());
    const result = await bridge.logout(
      createIdentityBridgeContext({
        operation: 'logout',
        bridgeBindingId: synced.binding.id,
        sessionBridgeBindingId: synced.binding.sessionBridgeBindingId,
        providerContext: toAuthenticationProviderContext(
          createSupabaseAuthenticationContext({})
        )
      })
    );
    assert.equal(result.binding.lastOperation, 'logout');
  });

  it('default device/session reference exists after sync', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.identityModule.sessionReference.sessionId);
    assert.ok(result.sessionBridgeResult.sessionModule.session.deviceReference);
  });

  it('authentication mapping count is one even on failure', async () => {
    const { bridge } = createStack({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })
    });
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.telemetry.authenticationMappingCount, 1);
  });

  it('registry upsert throws without binding id', () => {
    const registry = createIdentityBridgeRegistry();
    assert.throws(
      () =>
        registry.upsert({
          id: '',
          providerId: 'p',
          identityModuleId: 'im',
          identityId: 'i',
          order: 1,
          createdAt: '2026-07-22T00:00:00.000Z',
          updatedAt: '2026-07-22T00:00:00.000Z',
          lastOperation: 'synchronize'
        }),
      /id zorunludur/
    );
  });

  it('displayName falls back to email from bag user', () => {
    const module = mapIntegrationResultsToIdentityModule(
      {
        ...baseProviderResult,
        principal: {
          principalId: 'p',
          identityId: 'user-x',
          displayName: 'user-x'
        },
        bag: {
          supabaseUser: {
            id: 'user-x',
            email: 'x@example.com'
          }
        }
      },
      { operation: 'synchronize' }
    );
    assert.equal(module.user.email, 'x@example.com');
  });
});
