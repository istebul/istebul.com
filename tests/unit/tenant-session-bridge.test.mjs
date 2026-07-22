/**
 * Tenant Session Bridge — EPIC-302C (en az 90 unit test)
 *
 * Coverage: initialization, context, tenant mapping, membership mapping,
 * refresh/validation flows, registry, error mapping, telemetry.
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
  createTenantSessionBridge,
  createTenantSessionBridgeContext,
  createTenantSessionBridgeRegistry,
  createTenantSessionBridgeRegistryRuntime,
  createTenantSessionBridgeResult,
  resolveTenantBridgeProviderContext,
  mapTenantBridgeOperationToProviderOperation,
  mapTenantProviderStatusToDecisionOutcome,
  resolveTenantBridgeIdentifiers,
  mapTenantProviderResultToIsolationModule,
  createBridgeBindingFromIsolationModule,
  mapTenantProviderIssuesToBridgeIssues,
  projectMappedIsolationModule,
  PIPELINE_BAG_TENANT_SESSION_BRIDGE_RESULT_KEY,
  TenantSessionBridge,
  TenantSessionBridgeRegistry,
  createTenantAdapterWithSupabaseProvider,
  createSupabaseTenantProvider,
  createSupabaseTenantContext,
  toTenantProviderContext,
  createTenantIsolationRegistry,
  createTenantIsolationRuntime,
  createTenantProviderResult,
  SUPABASE_TENANT_PROVIDER_ID
} = await import('../../src/identity/index.ts');

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

function createBridge(clientOverrides = {}) {
  const provider = createSupabaseTenantProvider({
    client: createMockClient(clientOverrides)
  });
  const adapter = createTenantAdapterWithSupabaseProvider(provider, {
    seedBuiltins: false
  });
  const isolationRegistry = createTenantIsolationRegistry(false);
  const isolationRuntime = createTenantIsolationRuntime(isolationRegistry);
  const bridgeRegistry = createTenantSessionBridgeRegistry();
  const bridge = createTenantSessionBridge({
    tenantAdapter: adapter,
    isolationRuntime,
    isolationRegistry,
    bridgeRegistry
  });
  return { bridge, adapter, isolationRegistry, isolationRuntime, bridgeRegistry };
}

function syncContext(overrides = {}) {
  return createTenantSessionBridgeContext({
    operation: 'synchronize',
    providerId: SUPABASE_TENANT_PROVIDER_ID,
    providerContext: toTenantProviderContext(
      createSupabaseTenantContext({
        tenantId: 'tenant-demo-001',
        identityId: 'identity-001',
        sessionId: 'session-001'
      })
    ),
    tenantId: 'tenant-demo-001',
    identityId: 'identity-001',
    sessionId: 'session-001',
    ...overrides
  });
}

function baseProviderResult(overrides = {}) {
  return createTenantProviderResult({
    success: true,
    status: 'resolved',
    operation: 'resolveTenant',
    providerId: SUPABASE_TENANT_PROVIDER_ID,
    tenant: {
      tenantId: 'tenant-demo-001',
      slug: 'demo',
      displayName: 'Demo Tenant'
    },
    memberships: [
      {
        membershipId: 'membership-001',
        identityId: 'identity-001',
        tenantId: 'tenant-demo-001',
        roleLabel: 'member',
        active: true
      }
    ],
    validationIssues: [],
    summaryItems: [],
    telemetry: {
      durationMs: 1,
      startedAt: '2026-07-22T00:00:00.000Z',
      endedAt: '2026-07-22T00:00:00.001Z',
      operation: 'resolveTenant',
      providerId: SUPABASE_TENANT_PROVIDER_ID
    },
    ...overrides
  });
}

describe('Bridge initialization', () => {
  it('creates bridge with injected adapter', () => {
    const { bridge, adapter } = createBridge();
    assert.equal(bridge.getTenantAdapter(), adapter);
    assert.ok(bridge.getBridgeRegistry());
    assert.ok(bridge.getIsolationRegistry());
    assert.ok(bridge.getIsolationRuntime());
  });

  it('throws when tenantAdapter missing', () => {
    assert.throws(() => createTenantSessionBridge({}), /tenantAdapter zorunludur/);
  });

  it('does not create singleton', () => {
    const a = createBridge().bridge;
    const b = createBridge().bridge;
    assert.notEqual(a, b);
    assert.notEqual(a.getBridgeRegistry(), b.getBridgeRegistry());
  });

  it('TenantSessionBridge is constructable', () => {
    const { adapter } = createBridge();
    const instance = new TenantSessionBridge({ tenantAdapter: adapter });
    assert.ok(instance instanceof TenantSessionBridge);
  });

  it('uses isolation runtime registry when registry omitted', () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient()
    });
    const adapter = createTenantAdapterWithSupabaseProvider(provider, {
      seedBuiltins: false
    });
    const isolationRegistry = createTenantIsolationRegistry(false);
    const isolationRuntime = createTenantIsolationRuntime(isolationRegistry);
    const bridge = createTenantSessionBridge({
      tenantAdapter: adapter,
      isolationRuntime
    });
    assert.equal(bridge.getIsolationRegistry(), isolationRegistry);
  });

  it('defaults to empty isolation registry when none provided', () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient()
    });
    const adapter = createTenantAdapterWithSupabaseProvider(provider, {
      seedBuiltins: false
    });
    const bridge = createTenantSessionBridge({ tenantAdapter: adapter });
    assert.equal(bridge.getIsolationRegistry().count(), 0);
  });
});

describe('Bridge context', () => {
  it('createTenantSessionBridgeContext defaults locale to tr', () => {
    const context = createTenantSessionBridgeContext({
      operation: 'synchronize',
      providerId: SUPABASE_TENANT_PROVIDER_ID
    });
    assert.equal(context.locale, 'tr');
  });

  it('resolveTenantBridgeProviderContext uses providerContext', () => {
    const providerContext = toTenantProviderContext(
      createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
    );
    const resolved = resolveTenantBridgeProviderContext(
      createTenantSessionBridgeContext({
        operation: 'synchronize',
        providerContext,
        identityId: 'identity-fallback'
      })
    );
    assert.equal(resolved.tenantId, 'tenant-demo-001');
    assert.equal(resolved.identityId, 'identity-fallback');
  });

  it('resolveTenantBridgeProviderContext builds from providerId', () => {
    const resolved = resolveTenantBridgeProviderContext(
      createTenantSessionBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantId: 'tenant-demo-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(resolved.providerId, SUPABASE_TENANT_PROVIDER_ID);
    assert.equal(resolved.sessionId, 'session-001');
  });

  it('resolveTenantBridgeProviderContext throws without providerId', () => {
    assert.throws(
      () =>
        resolveTenantBridgeProviderContext(
          createTenantSessionBridgeContext({ operation: 'synchronize' })
        ),
      /providerId veya providerContext zorunludur/
    );
  });

  it('maps bridge operations to provider operations', () => {
    assert.equal(
      mapTenantBridgeOperationToProviderOperation('synchronize'),
      'resolveTenant'
    );
    assert.equal(
      mapTenantBridgeOperationToProviderOperation('refresh'),
      'refreshTenant'
    );
    assert.equal(
      mapTenantBridgeOperationToProviderOperation('validate'),
      'validateAccess'
    );
    assert.equal(
      mapTenantBridgeOperationToProviderOperation('listMemberships'),
      'listMemberships'
    );
    assert.equal(
      mapTenantBridgeOperationToProviderOperation('getTenant'),
      'getTenant'
    );
  });
});

describe('Tenant mapping', () => {
  it('maps provider status to decision outcomes', () => {
    assert.equal(
      mapTenantProviderStatusToDecisionOutcome('resolved', 'synchronize'),
      'allow'
    );
    assert.equal(
      mapTenantProviderStatusToDecisionOutcome('denied', 'validate'),
      'deny'
    );
    assert.equal(
      mapTenantProviderStatusToDecisionOutcome('unresolved', 'synchronize'),
      'restrict'
    );
    assert.equal(
      mapTenantProviderStatusToDecisionOutcome('resolved', 'validate', 'restrict'),
      'restrict'
    );
  });

  it('resolveTenantBridgeIdentifiers prefers provider tenant', () => {
    const ids = resolveTenantBridgeIdentifiers(baseProviderResult(), {
      operation: 'synchronize',
      sessionId: 'session-001',
      identityId: 'identity-001'
    });
    assert.equal(ids.tenantId, 'tenant-demo-001');
    assert.equal(ids.slug, 'demo');
    assert.equal(ids.sessionId, 'session-001');
    assert.equal(ids.identityId, 'identity-001');
  });

  it('resolveTenantBridgeIdentifiers falls back to bag supabaseTenant', () => {
    const ids = resolveTenantBridgeIdentifiers(
      baseProviderResult({
        tenant: undefined,
        bag: {
          supabaseTenant: {
            id: 'tenant-bag-1',
            slug: 'bag',
            displayName: 'Bag Tenant'
          }
        }
      }),
      { operation: 'getTenant' }
    );
    assert.equal(ids.tenantId, 'tenant-bag-1');
    assert.equal(ids.displayName, 'Bag Tenant');
  });

  it('mapTenantProviderResultToIsolationModule maps tenant identity', () => {
    const module = mapTenantProviderResultToIsolationModule(
      baseProviderResult(),
      { operation: 'synchronize', sessionId: 'session-001' }
    );
    assert.equal(module.tenantIdentity.tenantId, 'tenant-demo-001');
    assert.equal(module.sessionId, 'session-001');
    assert.equal(module.memberships.length, 1);
    assert.equal(module.decisions[0].outcome, 'allow');
  });

  it('preserves existing boundary on remapping', () => {
    const first = mapTenantProviderResultToIsolationModule(
      baseProviderResult(),
      { operation: 'synchronize', nowIso: '2026-07-22T00:00:00.000Z' }
    );
    const second = mapTenantProviderResultToIsolationModule(
      baseProviderResult(),
      {
        operation: 'refresh',
        existingModule: first,
        nowIso: '2026-07-22T00:10:00.000Z'
      }
    );
    assert.equal(second.boundary.boundaryId, first.boundary.boundaryId);
    assert.equal(second.createdAt, first.createdAt);
    assert.equal(second.updatedAt, '2026-07-22T00:10:00.000Z');
  });

  it('projectMappedIsolationModule returns projected true', () => {
    const module = mapTenantProviderResultToIsolationModule(
      baseProviderResult(),
      { operation: 'synchronize' }
    );
    const projection = projectMappedIsolationModule(module);
    assert.equal(projection.projected, true);
    assert.equal(projection.membershipCount, 1);
  });

  it('createBridgeBindingFromIsolationModule links session', () => {
    const module = mapTenantProviderResultToIsolationModule(
      baseProviderResult(),
      { operation: 'synchronize', sessionId: 'session-001' }
    );
    const binding = createBridgeBindingFromIsolationModule(
      module,
      SUPABASE_TENANT_PROVIDER_ID,
      'synchronize'
    );
    assert.equal(binding.sessionId, 'session-001');
    assert.equal(binding.tenantId, 'tenant-demo-001');
    assert.equal(binding.membershipCount, 1);
    assert.equal(binding.lastOperation, 'synchronize');
  });

  it('mapTenantProviderIssuesToBridgeIssues copies severities', () => {
    const issues = mapTenantProviderIssuesToBridgeIssues(
      baseProviderResult({
        validationIssues: [
          { code: 'WARN', message: 'soft', severity: 'warning' },
          { code: 'ERR', message: 'hard', severity: 'error' }
        ]
      })
    );
    assert.equal(issues.length, 2);
    assert.equal(issues[1].code, 'ERR');
  });

  it('mapTenantProviderIssuesToBridgeIssues handles undefined', () => {
    assert.deepEqual(mapTenantProviderIssuesToBridgeIssues(undefined), []);
  });

  it('synthesize membership when provider has tenant but no memberships', () => {
    const module = mapTenantProviderResultToIsolationModule(
      baseProviderResult({ memberships: undefined }),
      { operation: 'getTenant', identityId: 'identity-001' }
    );
    assert.equal(module.memberships.length, 1);
    assert.equal(module.memberships[0].identityId, 'identity-001');
  });
});

describe('Membership mapping', () => {
  it('maps provider memberships into isolation module', () => {
    const module = mapTenantProviderResultToIsolationModule(
      baseProviderResult({
        memberships: [
          {
            membershipId: 'm1',
            identityId: 'i1',
            tenantId: 'tenant-demo-001',
            roleLabel: 'admin',
            active: true
          },
          {
            membershipId: 'm2',
            identityId: 'i2',
            tenantId: 'tenant-demo-001',
            roleLabel: 'viewer',
            active: false
          }
        ]
      }),
      { operation: 'listMemberships' }
    );
    assert.equal(module.memberships.length, 2);
    assert.equal(module.memberships[0].roleLabel, 'admin');
    assert.equal(module.memberships[1].active, false);
  });

  it('listMemberships bridge flow synchronizes memberships', async () => {
    const { bridge } = createBridge();
    const result = await bridge.listMemberships(
      createTenantSessionBridgeContext({
        operation: 'listMemberships',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({ identityId: 'identity-001' })
        ),
        identityId: 'identity-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(result.success, true);
    assert.ok(result.telemetry.membershipSynchronizationCount >= 1);
    assert.equal(result.isolationModule?.memberships.length, 1);
  });

  it('binding membershipCount mirrors module', () => {
    const module = mapTenantProviderResultToIsolationModule(
      baseProviderResult({
        memberships: [
          createMembershipRow(),
          createMembershipRow({ id: 'membership-002', identity_id: 'identity-002' })
        ].map((row) => ({
          membershipId: row.id,
          identityId: row.identity_id,
          tenantId: row.tenant_id,
          roleLabel: row.role_label,
          active: row.active
        }))
      }),
      { operation: 'listMemberships' }
    );
    const binding = createBridgeBindingFromIsolationModule(
      module,
      SUPABASE_TENANT_PROVIDER_ID,
      'listMemberships'
    );
    assert.equal(binding.membershipCount, 2);
  });
});

describe('Bridge registry', () => {
  let registry;

  beforeEach(() => {
    registry = createTenantSessionBridgeRegistry();
  });

  it('register and getById', () => {
    registry.register({
      id: 'bridge-1',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 'tenant-demo-001',
      isolationModuleId: 'isolation-1',
      sessionId: 'session-001',
      identityId: 'identity-001',
      membershipCount: 1,
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getById('bridge-1')?.tenantId, 'tenant-demo-001');
  });

  it('register throws on duplicate', () => {
    const binding = {
      id: 'bridge-1',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 'tenant-demo-001',
      isolationModuleId: 'isolation-1',
      membershipCount: 0,
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
          tenantId: 't',
          isolationModuleId: 'i',
          membershipCount: 0,
          order: 1,
          createdAt: 'x',
          updatedAt: 'x',
          lastOperation: 'synchronize'
        }),
      /id zorunludur/
    );
  });

  it('upsert updates lastOperation', () => {
    registry.upsert({
      id: 'bridge-1',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 'tenant-demo-001',
      isolationModuleId: 'isolation-1',
      membershipCount: 1,
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    registry.upsert({
      id: 'bridge-1',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 'tenant-demo-001',
      isolationModuleId: 'isolation-1',
      membershipCount: 1,
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:10:00.000Z',
      lastOperation: 'refresh'
    });
    assert.equal(registry.getById('bridge-1').lastOperation, 'refresh');
  });

  it('getBySessionId resolves binding', () => {
    registry.register({
      id: 'bridge-1',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 'tenant-demo-001',
      isolationModuleId: 'isolation-1',
      sessionId: 'session-xyz',
      membershipCount: 1,
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getBySessionId('session-xyz')?.id, 'bridge-1');
  });

  it('getByTenantId and getByIdentityId filter', () => {
    registry.register({
      id: 'bridge-1',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 'tenant-demo-001',
      isolationModuleId: 'isolation-1',
      identityId: 'identity-001',
      membershipCount: 1,
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getByTenantId('tenant-demo-001').length, 1);
    assert.equal(registry.getByIdentityId('identity-001').length, 1);
  });

  it('getByProviderId and getByIsolationModuleId', () => {
    registry.register({
      id: 'bridge-1',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 'tenant-demo-001',
      isolationModuleId: 'isolation-1',
      membershipCount: 0,
      order: 2,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'getTenant'
    });
    assert.equal(
      registry.getByProviderId(SUPABASE_TENANT_PROVIDER_ID).length,
      1
    );
    assert.equal(
      registry.getByIsolationModuleId('isolation-1')?.id,
      'bridge-1'
    );
  });

  it('unregister and clear', () => {
    registry.register({
      id: 'bridge-1',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 'tenant-demo-001',
      isolationModuleId: 'isolation-1',
      membershipCount: 0,
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.unregister('bridge-1'), true);
    assert.equal(registry.count(), 0);
    registry.upsert({
      id: 'bridge-2',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 't2',
      isolationModuleId: 'i2',
      membershipCount: 0,
      order: 1,
      createdAt: 'x',
      updatedAt: 'x',
      lastOperation: 'synchronize'
    });
    registry.clear();
    assert.equal(registry.count(), 0);
  });

  it('TenantSessionBridgeRegistryRuntime alias works', () => {
    const runtime = createTenantSessionBridgeRegistryRuntime();
    assert.ok(runtime instanceof TenantSessionBridgeRegistry);
  });

  it('register throws without tenantId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'bridge-x',
          providerId: 'p',
          tenantId: '',
          isolationModuleId: 'i',
          membershipCount: 0,
          order: 1,
          createdAt: 'x',
          updatedAt: 'x',
          lastOperation: 'synchronize'
        }),
      /tenantId zorunludur/
    );
  });
});

describe('Synchronize flow', () => {
  it('synchronize maps provider tenant into isolation runtime', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.success, true);
    assert.equal(result.operation, 'synchronize');
    assert.equal(
      result.isolationModule?.tenantIdentity.tenantId,
      'tenant-demo-001'
    );
    assert.equal(result.isolationProjection?.projected, true);
  });

  it('synchronize creates bridge binding with session', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.binding);
    assert.equal(result.binding.sessionId, 'session-001');
    assert.equal(
      bridge.getBridgeRegistry().getBySessionId('session-001')?.id,
      result.binding.id
    );
  });

  it('synchronize fails when tenant missing', async () => {
    const { bridge } = createBridge({
      tenants: {
        getById: async () => ({ data: null, error: null }),
        getBySlug: async () => ({ data: null, error: null }),
        getByDomain: async () => ({ data: null, error: null })
      }
    });
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'TenantNotFound')
    );
  });

  it('synchronize via execute() with operation', async () => {
    const { bridge } = createBridge();
    const result = await bridge.execute(syncContext());
    assert.equal(result.success, true);
  });

  it('synchronize produces isolationResult summary', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.isolationResult);
    assert.ok(result.isolationResult.summary);
  });

  it('getTenant flow maps tenant', async () => {
    const { bridge } = createBridge();
    const result = await bridge.getTenant(
      createTenantSessionBridgeContext({
        operation: 'getTenant',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
        ),
        tenantId: 'tenant-demo-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.telemetry.tenantSynchronizationCount, 1);
  });
});

describe('Refresh flow', () => {
  it('refresh reloads tenant and memberships', async () => {
    const { bridge } = createBridge();
    await bridge.synchronize(syncContext());
    const result = await bridge.refresh(
      createTenantSessionBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({
            tenantId: 'tenant-demo-001',
            identityId: 'identity-001'
          })
        ),
        tenantId: 'tenant-demo-001',
        identityId: 'identity-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.telemetry.refreshCount, 1);
    assert.equal(result.binding?.lastOperation, 'refresh');
  });

  it('refresh fails without tenantId', async () => {
    const { bridge } = createBridge();
    const result = await bridge.refresh(
      createTenantSessionBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({})
        )
      })
    );
    assert.equal(result.success, false);
  });

  it('refresh updates isolation module in registry', async () => {
    const { bridge, isolationRegistry } = createBridge();
    const first = await bridge.synchronize(syncContext());
    const beforeId = first.isolationModule.id;
    const refreshed = await bridge.refresh(
      createTenantSessionBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({
            tenantId: 'tenant-demo-001',
            identityId: 'identity-001'
          })
        ),
        tenantId: 'tenant-demo-001',
        identityId: 'identity-001',
        sessionId: 'session-001',
        bridgeBindingId: first.binding.id
      })
    );
    assert.equal(refreshed.isolationModule.id, beforeId);
    assert.ok(isolationRegistry.getById(beforeId));
  });
});

describe('Validation flow', () => {
  it('validate coordinates access validation', async () => {
    const { bridge } = createBridge();
    const result = await bridge.validate(
      createTenantSessionBridgeContext({
        operation: 'validate',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({
            identityId: 'identity-001',
            tenantId: 'tenant-demo-001',
            resourceId: 'resource-1'
          })
        ),
        identityId: 'identity-001',
        tenantId: 'tenant-demo-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.telemetry.validationCount, 1);
    assert.equal(result.isolationModule?.decisions[0].outcome, 'allow');
  });

  it('validate denies when provider denies', async () => {
    const { bridge } = createBridge({
      memberships: {
        listByIdentity: async () => ({ data: [], error: null }),
        listByTenant: async () => ({ data: [], error: null }),
        getById: async () => ({ data: null, error: null }),
        validateAccess: async () => ({
          data: { allowed: false, outcome: 'deny' },
          error: null
        })
      }
    });
    const result = await bridge.validate(
      createTenantSessionBridgeContext({
        operation: 'validate',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({
            identityId: 'identity-001',
            tenantId: 'tenant-demo-001'
          })
        ),
        identityId: 'identity-001',
        tenantId: 'tenant-demo-001'
      })
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'AccessDenied')
    );
    assert.equal(result.telemetry.validationCount, 1);
  });

  it('validate maps restrict outcome', async () => {
    const { bridge } = createBridge({
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
            outcome: 'restrict',
            allowedTenantIds: ['tenant-demo-001'],
            crossTenantAllowed: false
          },
          error: null
        })
      }
    });
    const result = await bridge.validate(
      createTenantSessionBridgeContext({
        operation: 'validate',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({
            identityId: 'identity-001',
            tenantId: 'tenant-demo-001'
          })
        ),
        identityId: 'identity-001',
        tenantId: 'tenant-demo-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.isolationModule?.decisions[0].outcome, 'restrict');
  });
});

describe('Error mapping', () => {
  it('maps provider TenantNotFound into bridge issues', async () => {
    const { bridge } = createBridge({
      tenants: {
        getById: async () => ({
          data: null,
          error: { message: 'tenant not found', status: 404 }
        }),
        getBySlug: async () => ({ data: null, error: null }),
        getByDomain: async () => ({ data: null, error: null })
      }
    });
    const result = await bridge.getTenant(
      createTenantSessionBridgeContext({
        operation: 'getTenant',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({ tenantId: 'missing' })
        ),
        tenantId: 'missing'
      })
    );
    assert.ok(
      result.validationIssues.some((item) => item.code === 'TenantNotFound')
    );
  });

  it('maps ProviderUnavailable network errors', async () => {
    const { bridge } = createBridge({
      tenants: {
        getById: async () => {
          throw new Error('failed to fetch');
        },
        getBySlug: async () => ({ data: null, error: null }),
        getByDomain: async () => ({ data: null, error: null })
      }
    });
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'ProviderUnavailable'
      )
    );
  });

  it('returns BRIDGE_EXECUTION_ERROR when providerId missing', async () => {
    const { bridge } = createBridge();
    const result = await bridge.execute(
      createTenantSessionBridgeContext({
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

  it('createTenantSessionBridgeResult freezes issues', () => {
    const result = createTenantSessionBridgeResult({
      success: false,
      operation: 'synchronize',
      validationIssues: [{ code: 'X', message: 'Y', severity: 'error' }],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        tenantSynchronizationCount: 0,
        membershipSynchronizationCount: 0,
        validationCount: 0,
        refreshCount: 0,
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
});

describe('Telemetry', () => {
  it('includes duration and summary count on synchronize', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.operation, 'synchronize');
    assert.equal(
      result.telemetry.summaryCount,
      result.summaryItems.length
    );
    assert.equal(result.telemetry.tenantSynchronizationCount, 1);
  });

  it('refresh telemetry increments refreshCount', async () => {
    const { bridge } = createBridge();
    const result = await bridge.refresh(
      createTenantSessionBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({
            tenantId: 'tenant-demo-001',
            identityId: 'identity-001'
          })
        ),
        tenantId: 'tenant-demo-001'
      })
    );
    assert.equal(result.telemetry.refreshCount, 1);
    assert.ok(result.telemetry.membershipSynchronizationCount >= 1);
  });

  it('validation telemetry increments validationCount', async () => {
    const { bridge } = createBridge();
    const result = await bridge.validate(
      createTenantSessionBridgeContext({
        operation: 'validate',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({
            identityId: 'identity-001',
            tenantId: 'tenant-demo-001'
          })
        ),
        identityId: 'identity-001',
        tenantId: 'tenant-demo-001'
      })
    );
    assert.equal(result.telemetry.validationCount, 1);
  });

  it('summary items include sync counters', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.ok(
      result.summaryItems.some(
        (item) => item.key === 'tenantSynchronizationCount'
      )
    );
    assert.ok(
      result.summaryItems.some(
        (item) => item.key === 'membershipSynchronizationCount'
      )
    );
  });

  it('PIPELINE_BAG key is stable', () => {
    assert.equal(
      PIPELINE_BAG_TENANT_SESSION_BRIDGE_RESULT_KEY,
      'tenantSessionBridgeResult'
    );
  });
});

describe('Session-tenant matching', () => {
  it('reuses binding by sessionId on subsequent sync', async () => {
    const { bridge } = createBridge();
    const first = await bridge.synchronize(syncContext());
    const second = await bridge.synchronize(syncContext());
    assert.equal(first.binding.id, second.binding.id);
    assert.equal(bridge.getBridgeRegistry().count(), 1);
  });

  it('resolves binding by bridgeBindingId', async () => {
    const { bridge } = createBridge();
    const first = await bridge.synchronize(syncContext());
    const refreshed = await bridge.refresh(
      createTenantSessionBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        providerContext: toTenantProviderContext(
          createSupabaseTenantContext({
            tenantId: 'tenant-demo-001',
            identityId: 'identity-001'
          })
        ),
        bridgeBindingId: first.binding.id,
        tenantId: 'tenant-demo-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(refreshed.binding.id, first.binding.id);
  });

  it('stores sessionId on isolation module', async () => {
    const { bridge } = createBridge();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.isolationModule.sessionId, 'session-001');
    assert.equal(result.bag?.sessionId, 'session-001');
  });
});

describe('Result factory coverage', () => {
  it('clones isolation module deeply enough', () => {
    const module = mapTenantProviderResultToIsolationModule(
      baseProviderResult(),
      { operation: 'synchronize' }
    );
    const result = createTenantSessionBridgeResult({
      success: true,
      operation: 'synchronize',
      isolationModule: module,
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        tenantSynchronizationCount: 1,
        membershipSynchronizationCount: 1,
        validationCount: 0,
        refreshCount: 0,
        summaryCount: 0,
        operation: 'synchronize'
      }
    });
    assert.notEqual(result.isolationModule, module);
    assert.equal(
      result.isolationModule.tenantIdentity.tenantId,
      module.tenantIdentity.tenantId
    );
  });

  it('getAll bindings sorted by order', () => {
    const registry = createTenantSessionBridgeRegistry();
    registry.register({
      id: 'b2',
      providerId: 'p',
      tenantId: 't2',
      isolationModuleId: 'i2',
      membershipCount: 0,
      order: 2,
      createdAt: 'x',
      updatedAt: 'x',
      lastOperation: 'synchronize'
    });
    registry.register({
      id: 'b1',
      providerId: 'p',
      tenantId: 't1',
      isolationModuleId: 'i1',
      membershipCount: 0,
      order: 1,
      createdAt: 'x',
      updatedAt: 'x',
      lastOperation: 'synchronize'
    });
    const all = registry.getAll();
    assert.equal(all[0].id, 'b1');
    assert.equal(all[1].id, 'b2');
  });
});
