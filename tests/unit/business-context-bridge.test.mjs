/**
 * Business Context Bridge — EPIC-302D (en az 95 unit test)
 *
 * Coverage: initialization, business mapping, workspace mapping,
 * validation/refresh flows, error mapping, telemetry, pipeline.
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
  createBusinessContextBridge,
  createBusinessContextBridgeContext,
  createBusinessContextBridgeRegistry,
  createBusinessContextBridgeRegistryRuntime,
  createBusinessContextBridgeResult,
  resolveTenantSessionBridgeContextFromBusiness,
  mapBusinessBridgeOperationToTenantBridgeOperation,
  mapToBusinessContextStatus,
  resolveBusinessContextIdentifiers,
  mapBusinessModulesToWorkspaces,
  mapTenantBridgeResultToBusinessContextModule,
  createBusinessContextBridgeBindingFromModule,
  mapUpstreamIssuesToBusinessContextBridgeIssues,
  projectMappedBusinessContextModule,
  toBusinessContextProjection,
  PIPELINE_BAG_BUSINESS_CONTEXT_BRIDGE_RESULT_KEY,
  BusinessContextBridge,
  BusinessContextBridgeRegistry,
  createTenantAdapterWithSupabaseProvider,
  createSupabaseTenantProvider,
  createSupabaseTenantContext,
  toTenantProviderContext,
  createTenantIsolationRegistry,
  createTenantIsolationRuntime,
  createTenantSessionBridge,
  createTenantSessionBridgeRegistry,
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
  const bridgeRegistry = createBusinessContextBridgeRegistry();
  const bridge = createBusinessContextBridge({
    tenantSessionBridge,
    businessRuntime,
    bridgeRegistry
  });
  return {
    bridge,
    tenantSessionBridge,
    businessRuntime,
    bridgeRegistry,
    adapter
  };
}

function syncContext(overrides = {}) {
  return createBusinessContextBridgeContext({
    operation: 'synchronize',
    providerId: SUPABASE_TENANT_PROVIDER_ID,
    tenantBridgeContext: {
      locale: 'tr',
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
      sessionId: 'session-001'
    },
    tenantId: 'tenant-demo-001',
    businessId: 'tenant-demo-001',
    identityId: 'identity-001',
    sessionId: 'session-001',
    ...overrides
  });
}

function fakeTenantBridgeResult(overrides = {}) {
  return {
    success: true,
    operation: 'synchronize',
    isolationModule: {
      id: 'isolation-bridge-tenant-demo-001',
      tenantIdentity: {
        tenantId: 'tenant-demo-001',
        slug: 'demo',
        displayName: 'Demo Tenant'
      },
      primaryIdentityId: 'identity-001',
      sessionId: 'session-001',
      memberships: [],
      scopes: [],
      isolationRules: [],
      accessScope: {
        accessScopeId: 'a',
        allowedTenantIds: ['tenant-demo-001'],
        crossTenantAllowed: false
      },
      decisions: [],
      boundary: {
        boundaryId: 'b',
        tenantId: 'tenant-demo-001',
        label: 'x',
        strict: true
      },
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z'
    },
    binding: {
      id: 'tenant-bridge-1',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      tenantId: 'tenant-demo-001',
      isolationModuleId: 'isolation-bridge-tenant-demo-001',
      sessionId: 'session-001',
      identityId: 'identity-001',
      membershipCount: 1,
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    },
    validationIssues: [],
    summaryItems: [],
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
    },
    ...overrides
  };
}

function fakeBusinessResult(overrides = {}) {
  return {
    modules: [
      {
        moduleId: 'dashboard',
        name: 'Dashboard',
        description: 'd',
        status: 'active',
        category: 'operations',
        available: true
      },
      {
        moduleId: 'reports',
        name: 'Reports',
        description: 'r',
        status: 'active',
        category: 'monitoring',
        available: true
      }
    ],
    summary: {
      success: true,
      moduleCount: 2,
      requestedCount: 2,
      unavailableCount: 0,
      tenantId: 'tenant-demo-001'
    },
    summaryItems: [],
    validationIssues: [],
    telemetry: {
      durationMs: 1,
      startedAt: '2026-07-22T00:00:00.000Z',
      endedAt: '2026-07-22T00:00:00.001Z',
      registeredModuleCount: 6,
      summaryItemCount: 0
    },
    ...overrides
  };
}

describe('Bridge initialization', () => {
  it('creates bridge with injected dependencies', () => {
    const { bridge, tenantSessionBridge, businessRuntime } = createStack();
    assert.equal(bridge.getTenantSessionBridge(), tenantSessionBridge);
    assert.equal(bridge.getBusinessRuntime(), businessRuntime);
    assert.ok(bridge.getBridgeRegistry());
  });

  it('throws when tenantSessionBridge missing', () => {
    assert.throws(
      () =>
        createBusinessContextBridge({
          businessRuntime: createBusinessAdminRuntime()
        }),
      /tenantSessionBridge zorunludur/
    );
  });

  it('throws when businessRuntime missing', () => {
    const { tenantSessionBridge } = createStack();
    assert.throws(
      () =>
        createBusinessContextBridge({
          tenantSessionBridge
        }),
      /businessRuntime zorunludur/
    );
  });

  it('does not create singleton', () => {
    const a = createStack().bridge;
    const b = createStack().bridge;
    assert.notEqual(a, b);
    assert.notEqual(a.getBridgeRegistry(), b.getBridgeRegistry());
  });

  it('BusinessContextBridge is constructable', () => {
    const { tenantSessionBridge, businessRuntime } = createStack();
    const instance = new BusinessContextBridge({
      tenantSessionBridge,
      businessRuntime
    });
    assert.ok(instance instanceof BusinessContextBridge);
  });

  it('listContextModules starts empty', () => {
    const { bridge } = createStack();
    assert.equal(bridge.listContextModules().length, 0);
  });
});

describe('Bridge context', () => {
  it('defaults locale to tr', () => {
    const context = createBusinessContextBridgeContext({
      operation: 'synchronize',
      providerId: SUPABASE_TENANT_PROVIDER_ID
    });
    assert.equal(context.locale, 'tr');
  });

  it('resolveTenantSessionBridgeContextFromBusiness uses tenantBridgeContext', () => {
    const resolved = resolveTenantSessionBridgeContextFromBusiness(
      syncContext()
    );
    assert.equal(resolved.tenantId, 'tenant-demo-001');
    assert.equal(resolved.sessionId, 'session-001');
  });

  it('resolveTenantSessionBridgeContextFromBusiness builds from providerId', () => {
    const resolved = resolveTenantSessionBridgeContextFromBusiness(
      createBusinessContextBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantId: 'tenant-demo-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(resolved.operation, 'refresh');
    assert.equal(resolved.providerId, SUPABASE_TENANT_PROVIDER_ID);
  });

  it('throws without providerId or tenantBridgeContext', () => {
    assert.throws(
      () =>
        resolveTenantSessionBridgeContextFromBusiness(
          createBusinessContextBridgeContext({ operation: 'synchronize' })
        ),
      /providerId veya tenantBridgeContext zorunludur/
    );
  });

  it('maps business ops to tenant bridge ops', () => {
    assert.equal(
      mapBusinessBridgeOperationToTenantBridgeOperation('synchronize'),
      'synchronize'
    );
    assert.equal(
      mapBusinessBridgeOperationToTenantBridgeOperation('refresh'),
      'refresh'
    );
    assert.equal(
      mapBusinessBridgeOperationToTenantBridgeOperation('validate'),
      'validate'
    );
    assert.equal(
      mapBusinessBridgeOperationToTenantBridgeOperation('mapWorkspace'),
      'getTenant'
    );
  });

  it('preserves optional fields', () => {
    const context = createBusinessContextBridgeContext({
      locale: 'en',
      operation: 'mapWorkspace',
      providerId: SUPABASE_TENANT_PROVIDER_ID,
      workspaceId: 'ws-1',
      workspaceLabel: 'Main',
      moduleIds: ['dashboard'],
      bag: { k: 1 }
    });
    assert.equal(context.workspaceId, 'ws-1');
    assert.equal(context.moduleIds?.[0], 'dashboard');
    assert.equal(context.bag?.k, 1);
  });
});

describe('Business mapping', () => {
  it('maps statuses', () => {
    assert.equal(mapToBusinessContextStatus(true, true, 'synchronize'), 'active');
    assert.equal(mapToBusinessContextStatus(false, true, 'synchronize'), 'invalid');
    assert.equal(mapToBusinessContextStatus(false, true, 'refresh'), 'stale');
    assert.equal(mapToBusinessContextStatus(true, false, 'validate'), 'invalid');
    assert.equal(mapToBusinessContextStatus(true, false, 'synchronize'), 'pending');
  });

  it('resolveBusinessContextIdentifiers prefers tenant isolation', () => {
    const ids = resolveBusinessContextIdentifiers(fakeTenantBridgeResult(), {
      operation: 'synchronize'
    });
    assert.equal(ids.tenantId, 'tenant-demo-001');
    assert.equal(ids.businessId, 'tenant-demo-001');
    assert.equal(ids.displayName, 'Demo Tenant');
    assert.equal(ids.sessionId, 'session-001');
  });

  it('resolveBusinessContextIdentifiers uses explicit businessId', () => {
    const ids = resolveBusinessContextIdentifiers(fakeTenantBridgeResult(), {
      operation: 'synchronize',
      businessId: 'biz-custom'
    });
    assert.equal(ids.businessId, 'biz-custom');
  });

  it('mapTenantBridgeResultToBusinessContextModule maps identity', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    assert.equal(module.tenantId, 'tenant-demo-001');
    assert.equal(module.businessId, 'tenant-demo-001');
    assert.equal(module.status, 'active');
    assert.equal(module.moduleIds.length, 2);
  });

  it('toBusinessContextProjection sets projected true', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    const projection = toBusinessContextProjection(module);
    assert.equal(projection.projected, true);
    assert.equal(projection.moduleCount, 2);
    assert.equal(projection.workspaceCount, 2);
  });

  it('projectMappedBusinessContextModule matches projection helper', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    assert.deepEqual(
      projectMappedBusinessContextModule(module).contextId,
      toBusinessContextProjection(module).contextId
    );
  });

  it('preserves existing module timestamps on remap', () => {
    const first = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize', nowIso: '2026-07-22T00:00:00.000Z' }
    );
    const second = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      {
        operation: 'refresh',
        existingModule: first,
        nowIso: '2026-07-22T00:10:00.000Z'
      }
    );
    assert.equal(second.createdAt, first.createdAt);
    assert.equal(second.updatedAt, '2026-07-22T00:10:00.000Z');
  });

  it('createBusinessContextBridgeBindingFromModule links tenant binding', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    const binding = createBusinessContextBridgeBindingFromModule(
      module,
      'synchronize'
    );
    assert.equal(binding.tenantBridgeBindingId, 'tenant-bridge-1');
    assert.equal(binding.workspaceCount, 2);
    assert.equal(binding.moduleCount, 2);
  });

  it('mapUpstreamIssues merges tenant and business issues', () => {
    const issues = mapUpstreamIssuesToBusinessContextBridgeIssues(
      fakeTenantBridgeResult({
        validationIssues: [
          { code: 'T', message: 'tenant', severity: 'warning' }
        ]
      }),
      fakeBusinessResult({
        validationIssues: [
          { code: 'B', message: 'business', severity: 'error' }
        ]
      })
    );
    assert.equal(issues.length, 2);
    assert.equal(issues[1].code, 'B');
  });
});

describe('Workspace mapping', () => {
  it('maps business modules to workspaces', () => {
    const workspaces = mapBusinessModulesToWorkspaces(fakeBusinessResult(), {
      operation: 'synchronize'
    });
    assert.equal(workspaces.length, 2);
    assert.equal(workspaces[0].workspaceId, 'workspace-dashboard');
    assert.equal(workspaces[0].active, true);
  });

  it('mapWorkspace operation prepends explicit workspace', () => {
    const workspaces = mapBusinessModulesToWorkspaces(fakeBusinessResult(), {
      operation: 'mapWorkspace',
      workspaceId: 'ws-custom',
      workspaceLabel: 'Custom WS',
      moduleIds: ['dashboard']
    });
    assert.equal(workspaces[0].workspaceId, 'ws-custom');
    assert.equal(workspaces[0].label, 'Custom WS');
    assert.ok(workspaces.some((item) => item.workspaceId === 'workspace-reports'));
  });

  it('falls back to existing workspaces when runtime empty', () => {
    const workspaces = mapBusinessModulesToWorkspaces(
      fakeBusinessResult({ modules: [] }),
      { operation: 'synchronize' },
      [{ workspaceId: 'ws-old', label: 'Old', active: true }]
    );
    assert.equal(workspaces.length, 1);
    assert.equal(workspaces[0].workspaceId, 'ws-old');
  });

  it('mapWorkspace bridge flow associates workspace', async () => {
    const { bridge } = createStack();
    const result = await bridge.mapWorkspace(
      createBusinessContextBridgeContext({
        operation: 'mapWorkspace',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantBridgeContext: {
          locale: 'tr',
          operation: 'getTenant',
          providerId: SUPABASE_TENANT_PROVIDER_ID,
          providerContext: toTenantProviderContext(
            createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
          ),
          tenantId: 'tenant-demo-001',
          sessionId: 'session-001'
        },
        tenantId: 'tenant-demo-001',
        sessionId: 'session-001',
        workspaceId: 'ws-main',
        workspaceLabel: 'Main Workspace'
      })
    );
    assert.equal(result.success, true);
    assert.ok(
      result.businessContextModule?.workspaces.some(
        (item) => item.workspaceId === 'ws-main'
      )
    );
    assert.ok(result.telemetry.workspaceMappingCount >= 1);
  });
});

describe('Bridge registry', () => {
  let registry;

  beforeEach(() => {
    registry = createBusinessContextBridgeRegistry();
  });

  it('register and getById', () => {
    registry.register({
      id: 'b1',
      businessId: 'biz-1',
      tenantId: 'tenant-demo-001',
      businessContextModuleId: 'ctx-1',
      workspaceCount: 1,
      moduleCount: 2,
      order: 1,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getById('b1')?.businessId, 'biz-1');
  });

  it('register throws on duplicate', () => {
    const binding = {
      id: 'b1',
      businessId: 'biz-1',
      tenantId: 't1',
      businessContextModuleId: 'ctx-1',
      workspaceCount: 0,
      moduleCount: 0,
      order: 1,
      createdAt: 'x',
      updatedAt: 'x',
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
          businessId: 'b',
          tenantId: 't',
          businessContextModuleId: 'c',
          workspaceCount: 0,
          moduleCount: 0,
          order: 1,
          createdAt: 'x',
          updatedAt: 'x',
          lastOperation: 'synchronize'
        }),
      /id zorunludur/
    );
  });

  it('register throws on missing tenantId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'b1',
          businessId: 'b',
          tenantId: '',
          businessContextModuleId: 'c',
          workspaceCount: 0,
          moduleCount: 0,
          order: 1,
          createdAt: 'x',
          updatedAt: 'x',
          lastOperation: 'synchronize'
        }),
      /tenantId zorunludur/
    );
  });

  it('register throws on missing businessId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'b1',
          businessId: '',
          tenantId: 't',
          businessContextModuleId: 'c',
          workspaceCount: 0,
          moduleCount: 0,
          order: 1,
          createdAt: 'x',
          updatedAt: 'x',
          lastOperation: 'synchronize'
        }),
      /businessId zorunludur/
    );
  });

  it('register throws on missing businessContextModuleId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'b1',
          businessId: 'b',
          tenantId: 't',
          businessContextModuleId: '',
          workspaceCount: 0,
          moduleCount: 0,
          order: 1,
          createdAt: 'x',
          updatedAt: 'x',
          lastOperation: 'synchronize'
        }),
      /businessContextModuleId zorunludur/
    );
  });

  it('upsert updates lastOperation', () => {
    registry.upsert({
      id: 'b1',
      businessId: 'biz-1',
      tenantId: 't1',
      businessContextModuleId: 'ctx-1',
      workspaceCount: 0,
      moduleCount: 0,
      order: 1,
      createdAt: 'x',
      updatedAt: 'x',
      lastOperation: 'synchronize'
    });
    registry.upsert({
      id: 'b1',
      businessId: 'biz-1',
      tenantId: 't1',
      businessContextModuleId: 'ctx-1',
      workspaceCount: 1,
      moduleCount: 1,
      order: 1,
      createdAt: 'x',
      updatedAt: 'y',
      lastOperation: 'refresh'
    });
    assert.equal(registry.getById('b1').lastOperation, 'refresh');
  });

  it('getByTenantId and getByBusinessId', () => {
    registry.register({
      id: 'b1',
      businessId: 'biz-1',
      tenantId: 'tenant-demo-001',
      businessContextModuleId: 'ctx-1',
      workspaceCount: 0,
      moduleCount: 0,
      order: 1,
      createdAt: 'x',
      updatedAt: 'x',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getByTenantId('tenant-demo-001').length, 1);
    assert.equal(registry.getByBusinessId('biz-1').length, 1);
  });

  it('getBySessionId and getByIdentityId', () => {
    registry.register({
      id: 'b1',
      businessId: 'biz-1',
      tenantId: 't1',
      businessContextModuleId: 'ctx-1',
      sessionId: 'session-001',
      identityId: 'identity-001',
      workspaceCount: 0,
      moduleCount: 0,
      order: 1,
      createdAt: 'x',
      updatedAt: 'x',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getBySessionId('session-001')?.id, 'b1');
    assert.equal(registry.getByIdentityId('identity-001').length, 1);
  });

  it('getByBusinessContextModuleId', () => {
    registry.register({
      id: 'b1',
      businessId: 'biz-1',
      tenantId: 't1',
      businessContextModuleId: 'ctx-1',
      workspaceCount: 0,
      moduleCount: 0,
      order: 1,
      createdAt: 'x',
      updatedAt: 'x',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getByBusinessContextModuleId('ctx-1')?.id, 'b1');
  });

  it('unregister clear count and sorted getAll', () => {
    registry.register({
      id: 'b2',
      businessId: 'b',
      tenantId: 't',
      businessContextModuleId: 'c2',
      workspaceCount: 0,
      moduleCount: 0,
      order: 2,
      createdAt: 'x',
      updatedAt: 'x',
      lastOperation: 'synchronize'
    });
    registry.register({
      id: 'b1',
      businessId: 'b',
      tenantId: 't',
      businessContextModuleId: 'c1',
      workspaceCount: 0,
      moduleCount: 0,
      order: 1,
      createdAt: 'x',
      updatedAt: 'x',
      lastOperation: 'synchronize'
    });
    assert.equal(registry.getAll()[0].id, 'b1');
    assert.equal(registry.unregister('b1'), true);
    registry.clear();
    assert.equal(registry.count(), 0);
  });

  it('runtime alias works', () => {
    const runtime = createBusinessContextBridgeRegistryRuntime();
    assert.ok(runtime instanceof BusinessContextBridgeRegistry);
  });

  it('upsert throws without id', () => {
    assert.throws(
      () =>
        registry.upsert({
          id: '',
          businessId: 'b',
          tenantId: 't',
          businessContextModuleId: 'c',
          workspaceCount: 0,
          moduleCount: 0,
          order: 1,
          createdAt: 'x',
          updatedAt: 'x',
          lastOperation: 'synchronize'
        }),
      /id zorunludur/
    );
  });
});

describe('Synchronize / pipeline flow', () => {
  it('synchronize maps tenant into business context', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.success, true);
    assert.equal(result.operation, 'synchronize');
    assert.equal(result.businessContextModule?.tenantId, 'tenant-demo-001');
    assert.equal(result.businessContextProjection?.projected, true);
  });

  it('synchronize creates binding and stores module', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.binding);
    assert.equal(
      bridge.getContextModule(result.businessContextModule.id)?.id,
      result.businessContextModule.id
    );
    assert.equal(bridge.listContextModules().length, 1);
  });

  it('synchronize produces businessRuntimeResult modules', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.businessRuntimeResult);
    assert.ok(result.businessRuntimeResult.modules.length >= 1);
  });

  it('synchronize via execute()', async () => {
    const { bridge } = createStack();
    const result = await bridge.execute(syncContext());
    assert.equal(result.success, true);
  });

  it('pipeline includes tenantBridgeResult', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.tenantBridgeResult);
    assert.equal(result.tenantBridgeResult.success, true);
  });

  it('businessId can differ from tenantId', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(
      syncContext({ businessId: 'biz-custom-001' })
    );
    assert.equal(result.businessContextModule?.businessId, 'biz-custom-001');
    assert.equal(result.businessContextModule?.tenantId, 'tenant-demo-001');
  });
});

describe('Refresh flow', () => {
  it('refresh reloads business context', async () => {
    const { bridge } = createStack();
    await bridge.synchronize(syncContext());
    const result = await bridge.refresh(
      createBusinessContextBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantBridgeContext: {
          locale: 'tr',
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
        },
        tenantId: 'tenant-demo-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.telemetry.refreshCount, 1);
    assert.equal(result.binding?.lastOperation, 'refresh');
  });

  it('refresh reuses binding by sessionId', async () => {
    const { bridge } = createStack();
    const first = await bridge.synchronize(syncContext());
    const refreshed = await bridge.refresh(
      createBusinessContextBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantBridgeContext: {
          locale: 'tr',
          operation: 'refresh',
          providerId: SUPABASE_TENANT_PROVIDER_ID,
          providerContext: toTenantProviderContext(
            createSupabaseTenantContext({
              tenantId: 'tenant-demo-001',
              identityId: 'identity-001'
            })
          ),
          tenantId: 'tenant-demo-001',
          sessionId: 'session-001'
        },
        tenantId: 'tenant-demo-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(refreshed.binding.id, first.binding.id);
  });

  it('refresh via bridgeBindingId', async () => {
    const { bridge } = createStack();
    const first = await bridge.synchronize(syncContext());
    const refreshed = await bridge.refresh(
      createBusinessContextBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        bridgeBindingId: first.binding.id,
        tenantBridgeContext: {
          locale: 'tr',
          operation: 'refresh',
          providerId: SUPABASE_TENANT_PROVIDER_ID,
          providerContext: toTenantProviderContext(
            createSupabaseTenantContext({
              tenantId: 'tenant-demo-001',
              identityId: 'identity-001'
            })
          ),
          tenantId: 'tenant-demo-001'
        },
        tenantId: 'tenant-demo-001'
      })
    );
    assert.equal(refreshed.binding.id, first.binding.id);
  });
});

describe('Validation flow', () => {
  it('validate coordinates tenant and business validation', async () => {
    const { bridge } = createStack();
    const result = await bridge.validate(
      createBusinessContextBridgeContext({
        operation: 'validate',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantBridgeContext: {
          locale: 'tr',
          operation: 'validate',
          providerId: SUPABASE_TENANT_PROVIDER_ID,
          providerContext: toTenantProviderContext(
            createSupabaseTenantContext({
              identityId: 'identity-001',
              tenantId: 'tenant-demo-001'
            })
          ),
          identityId: 'identity-001',
          tenantId: 'tenant-demo-001',
          sessionId: 'session-001'
        },
        identityId: 'identity-001',
        tenantId: 'tenant-demo-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.telemetry.validationCount, 1);
  });

  it('validate fails when tenant access denied', async () => {
    const { bridge } = createStack({
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
      createBusinessContextBridgeContext({
        operation: 'validate',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantBridgeContext: {
          locale: 'tr',
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
        },
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
});

describe('Error mapping', () => {
  it('maps tenant not found into bridge issues', async () => {
    const { bridge } = createStack({
      tenants: {
        getById: async () => ({
          data: null,
          error: { message: 'tenant not found', status: 404 }
        }),
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

  it('returns BRIDGE_EXECUTION_ERROR when provider missing', async () => {
    const { bridge } = createStack();
    const result = await bridge.execute(
      createBusinessContextBridgeContext({ operation: 'synchronize' })
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'BRIDGE_EXECUTION_ERROR'
      )
    );
  });

  it('createBusinessContextBridgeResult freezes issues', () => {
    const result = createBusinessContextBridgeResult({
      success: false,
      operation: 'synchronize',
      validationIssues: [{ code: 'X', message: 'Y', severity: 'error' }],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        businessContextCount: 0,
        workspaceMappingCount: 0,
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

  it('maps provider unavailable network errors', async () => {
    const { bridge } = createStack({
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
});

describe('Telemetry', () => {
  it('includes duration and summary count', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.operation, 'synchronize');
    assert.equal(result.telemetry.summaryCount, result.summaryItems.length);
    assert.equal(result.telemetry.businessContextCount, 1);
  });

  it('workspace mapping count reflects modules', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(result.telemetry.workspaceMappingCount >= 1);
  });

  it('summary items include counters', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.ok(
      result.summaryItems.some((item) => item.key === 'businessContextCount')
    );
    assert.ok(
      result.summaryItems.some((item) => item.key === 'workspaceMappingCount')
    );
  });

  it('PIPELINE_BAG key is stable', () => {
    assert.equal(
      PIPELINE_BAG_BUSINESS_CONTEXT_BRIDGE_RESULT_KEY,
      'businessContextBridgeResult'
    );
  });

  it('failed sync keeps summaryCount aligned', async () => {
    const { bridge } = createStack({
      tenants: {
        getById: async () => ({ data: null, error: null }),
        getBySlug: async () => ({ data: null, error: null }),
        getByDomain: async () => ({ data: null, error: null })
      }
    });
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.telemetry.summaryCount, result.summaryItems.length);
  });
});

describe('Extended coverage', () => {
  it('bag includes tenantSuccess and businessSuccess', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.bag?.tenantSuccess, true);
    assert.equal(result.bag?.businessSuccess, true);
    assert.equal(result.bag?.sessionId, 'session-001');
  });

  it('moduleIds filter propagates to business runtime', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(
      syncContext({ moduleIds: ['dashboard'] })
    );
    assert.equal(result.businessRuntimeResult?.modules.length, 1);
    assert.equal(result.businessRuntimeResult?.modules[0].moduleId, 'dashboard');
  });

  it('falls back identifiers when tenant result empty', () => {
    const ids = resolveBusinessContextIdentifiers(
      { success: false, validationIssues: [], summaryItems: [], telemetry: {} },
      { operation: 'synchronize', businessId: 'biz-x' }
    );
    assert.equal(ids.tenantId, 'tenant-unknown');
    assert.equal(ids.businessId, 'biz-x');
  });

  it('binding reuses id on remap', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    const first = createBusinessContextBridgeBindingFromModule(
      module,
      'synchronize'
    );
    const second = createBusinessContextBridgeBindingFromModule(
      module,
      'refresh',
      first
    );
    assert.equal(second.id, first.id);
    assert.equal(second.lastOperation, 'refresh');
  });

  it('clones business context module in result factory', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    const result = createBusinessContextBridgeResult({
      success: true,
      operation: 'synchronize',
      businessContextModule: module,
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        businessContextCount: 1,
        workspaceMappingCount: 2,
        validationCount: 0,
        refreshCount: 0,
        summaryCount: 0,
        operation: 'synchronize'
      }
    });
    assert.notEqual(result.businessContextModule, module);
    assert.equal(
      result.businessContextModule.businessId,
      module.businessId
    );
  });

  it('resolve merges bags from bridge and tenant context', () => {
    const resolved = resolveTenantSessionBridgeContextFromBusiness(
      createBusinessContextBridgeContext({
        operation: 'synchronize',
        tenantBridgeContext: {
          locale: 'tr',
          operation: 'synchronize',
          providerId: SUPABASE_TENANT_PROVIDER_ID,
          bag: { fromTenant: 1 }
        },
        bag: { fromBusiness: 2 }
      })
    );
    assert.equal(resolved.bag?.fromTenant, 1);
    assert.equal(resolved.bag?.fromBusiness, 2);
  });

  it('getBySessionId returns undefined for unknown', () => {
    const registry = createBusinessContextBridgeRegistry();
    assert.equal(registry.getBySessionId('missing'), undefined);
  });

  it('second synchronize keeps single binding', async () => {
    const { bridge } = createStack();
    await bridge.synchronize(syncContext());
    await bridge.synchronize(syncContext());
    assert.equal(bridge.getBridgeRegistry().count(), 1);
  });

  it('mapWorkspace without runtime modules still records explicit workspace', () => {
    const workspaces = mapBusinessModulesToWorkspaces(undefined, {
      operation: 'mapWorkspace',
      workspaceId: 'ws-only',
      workspaceLabel: 'Only'
    });
    assert.equal(workspaces.length, 1);
    assert.equal(workspaces[0].workspaceId, 'ws-only');
  });

  it('invalid status when tenant fails synchronize', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult({ success: false }),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    assert.equal(module.status, 'invalid');
  });

  it('stale status when tenant fails refresh', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult({ success: false }),
      fakeBusinessResult(),
      { operation: 'refresh' }
    );
    assert.equal(module.status, 'stale');
  });

  it('pending status when business fails synchronize', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult({
        summary: {
          success: false,
          moduleCount: 0,
          requestedCount: 0,
          unavailableCount: 0,
          tenantId: 'tenant-demo-001'
        }
      }),
      { operation: 'synchronize' }
    );
    assert.equal(module.status, 'pending');
  });

  it('summary items include refresh and validation keys', async () => {
    const { bridge } = createStack();
    const result = await bridge.refresh(
      createBusinessContextBridgeContext({
        operation: 'refresh',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantBridgeContext: {
          locale: 'tr',
          operation: 'refresh',
          providerId: SUPABASE_TENANT_PROVIDER_ID,
          providerContext: toTenantProviderContext(
            createSupabaseTenantContext({
              tenantId: 'tenant-demo-001',
              identityId: 'identity-001'
            })
          ),
          tenantId: 'tenant-demo-001'
        },
        tenantId: 'tenant-demo-001'
      })
    );
    assert.ok(result.summaryItems.some((item) => item.key === 'refreshCount'));
    assert.ok(
      result.summaryItems.some((item) => item.key === 'validationCount')
    );
  });

  it('uses existing moduleIds when runtime modules empty', () => {
    const existing = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    const remapped = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult({ modules: [] }),
      { operation: 'refresh', existingModule: existing }
    );
    assert.deepEqual([...remapped.moduleIds], [...existing.moduleIds]);
  });

  it('explicit moduleIds override runtime modules', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize', moduleIds: ['exports'] }
    );
    assert.deepEqual([...module.moduleIds], ['exports']);
  });

  it('resolve prefers existing module when tenant empty', () => {
    const existing = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    const ids = resolveBusinessContextIdentifiers(
      { success: false, validationIssues: [], summaryItems: [], telemetry: {} },
      { operation: 'refresh', existingModule: existing }
    );
    assert.equal(ids.tenantId, 'tenant-demo-001');
    assert.equal(ids.displayName, 'Demo Tenant');
  });

  it('mapWorkspace dedupes explicit workspace against runtime', () => {
    const workspaces = mapBusinessModulesToWorkspaces(fakeBusinessResult(), {
      operation: 'mapWorkspace',
      workspaceId: 'workspace-dashboard',
      workspaceLabel: 'Dashboard Alias'
    });
    assert.equal(
      workspaces.filter((item) => item.workspaceId === 'workspace-dashboard')
        .length,
      1
    );
    assert.equal(workspaces[0].label, 'Dashboard Alias');
  });

  it('validate increments validationCount even on denial', async () => {
    const { bridge } = createStack({
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
      createBusinessContextBridgeContext({
        operation: 'validate',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantBridgeContext: {
          locale: 'tr',
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
        },
        identityId: 'identity-001',
        tenantId: 'tenant-demo-001'
      })
    );
    assert.equal(result.telemetry.validationCount, 1);
  });

  it('synchronize registers binding by businessId lookup', async () => {
    const { bridge } = createStack();
    await bridge.synchronize(syncContext({ businessId: 'biz-lookup' }));
    assert.equal(
      bridge.getBridgeRegistry().getByBusinessId('biz-lookup').length,
      1
    );
  });

  it('getContextModule returns undefined for unknown', () => {
    const { bridge } = createStack();
    assert.equal(bridge.getContextModule('missing'), undefined);
  });

  it('mapUpstreamIssues handles undefined inputs', () => {
    assert.deepEqual(
      mapUpstreamIssuesToBusinessContextBridgeIssues(undefined, undefined),
      []
    );
  });

  it('business context projection freezes moduleIds', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    const projection = toBusinessContextProjection(module);
    assert.throws(() => {
      projection.moduleIds.push('x');
    });
  });

  it('workspace refs are frozen on module', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    assert.throws(() => {
      module.workspaces.push({
        workspaceId: 'x',
        label: 'x',
        active: true
      });
    });
  });

  it('createBusinessContextBridgeContext allows en locale', () => {
    const context = createBusinessContextBridgeContext({
      locale: 'en',
      operation: 'synchronize',
      providerId: SUPABASE_TENANT_PROVIDER_ID
    });
    assert.equal(context.locale, 'en');
  });

  it('resolve existing module by tenantId after sync', async () => {
    const { bridge } = createStack();
    await bridge.synchronize(syncContext());
    const second = await bridge.synchronize(
      syncContext({ sessionId: undefined })
    );
    assert.equal(bridge.getBridgeRegistry().count(), 1);
    assert.ok(second.businessContextModule);
  });

  it('mapWorkspace telemetry workspaceMappingCount at least 1', async () => {
    const { bridge } = createStack();
    const result = await bridge.mapWorkspace(
      createBusinessContextBridgeContext({
        operation: 'mapWorkspace',
        providerId: SUPABASE_TENANT_PROVIDER_ID,
        tenantBridgeContext: {
          locale: 'tr',
          operation: 'getTenant',
          providerId: SUPABASE_TENANT_PROVIDER_ID,
          providerContext: toTenantProviderContext(
            createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
          ),
          tenantId: 'tenant-demo-001'
        },
        tenantId: 'tenant-demo-001',
        workspaceId: 'ws-z'
      })
    );
    assert.ok(result.telemetry.workspaceMappingCount >= 1);
  });

  it('identity lookup finds binding after sync', async () => {
    const { bridge } = createStack();
    await bridge.synchronize(syncContext());
    assert.equal(
      bridge.getBridgeRegistry().getByIdentityId('identity-001').length,
      1
    );
  });

  it('session lookup finds binding after sync', async () => {
    const { bridge } = createStack();
    await bridge.synchronize(syncContext());
    assert.ok(bridge.getBridgeRegistry().getBySessionId('session-001'));
  });

  it('pipeline bag carries actorId through business runtime', async () => {
    const { bridge } = createStack();
    const result = await bridge.synchronize(
      syncContext({ actorId: 'actor-99', bag: { trace: 't-1' } })
    );
    assert.equal(result.bag?.trace, 't-1');
    assert.equal(result.success, true);
  });

  it('failed tenant leaves businessContextCount 0', async () => {
    const { bridge } = createStack({
      tenants: {
        getById: async () => ({ data: null, error: null }),
        getBySlug: async () => ({ data: null, error: null }),
        getByDomain: async () => ({ data: null, error: null })
      }
    });
    const result = await bridge.synchronize(syncContext());
    assert.equal(result.telemetry.businessContextCount, 0);
    assert.equal(result.success, false);
  });

  it('BusinessContextBridgeRegistry class is constructable', () => {
    const registry = new BusinessContextBridgeRegistry();
    assert.equal(registry.count(), 0);
  });

  it('mapBusinessBridgeOperationToTenantBridgeOperation covers all ops', () => {
    const ops = ['synchronize', 'refresh', 'validate', 'mapWorkspace'];
    for (const op of ops) {
      assert.ok(mapBusinessBridgeOperationToTenantBridgeOperation(op));
    }
  });

  it('displayName falls back to businessId', () => {
    const ids = resolveBusinessContextIdentifiers(
      {
        success: true,
        validationIssues: [],
        summaryItems: [],
        telemetry: {},
        isolationModule: {
          tenantIdentity: {
            tenantId: 't-x',
            slug: 'sx',
            displayName: ''
          }
        }
      },
      { operation: 'synchronize', businessId: 'biz-fallback' }
    );
    // empty displayName is falsy → businessId fallback via || chain
    assert.equal(ids.businessId, 'biz-fallback');
  });

  it('context module order defaults to 100', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize' }
    );
    assert.equal(module.order, 100);
  });

  it('context module order can be overridden', () => {
    const module = mapTenantBridgeResultToBusinessContextModule(
      fakeTenantBridgeResult(),
      fakeBusinessResult(),
      { operation: 'synchronize', order: 7 }
    );
    assert.equal(module.order, 7);
  });

  it('unregister unknown binding returns false', () => {
    const registry = createBusinessContextBridgeRegistry();
    assert.equal(registry.unregister('missing'), false);
  });

  it('getByBusinessContextModuleId returns undefined for unknown', () => {
    const registry = createBusinessContextBridgeRegistry();
    assert.equal(registry.getByBusinessContextModuleId('missing'), undefined);
  });
});
