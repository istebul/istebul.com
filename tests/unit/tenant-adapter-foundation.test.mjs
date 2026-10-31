/**
 * Tenant Adapter Foundation — EPIC-302A (en az 60 unit test)
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
  createTenantAdapter,
  createTenantProviderRegistry,
  createTenantProviderRegistryRuntime,
  createTenantProviderContext,
  createTenantProviderResult,
  createTenantProviderFailure,
  createTenantProviderSuccess,
  validateTenantProviderContext,
  resolveTenantProvider,
  resolveTenantProviderRegistration,
  hasTenantProviderValidationErrors,
  BUILTIN_TENANT_PROVIDER_REGISTRATIONS,
  BUILTIN_TENANT_PROVIDER_COUNT,
  getBuiltinTenantProviderRegistration,
  TenantProviderRegistry,
  TenantProviderRegistryRuntime,
  TenantAdapter
} = await import('../../src/identity/index.ts');

function createMockTenant(overrides = {}) {
  return {
    tenantId: 'tenant-demo-001',
    slug: 'demo',
    displayName: 'Demo Tenant',
    ...overrides
  };
}

function createMockMembership(overrides = {}) {
  return {
    membershipId: 'membership-mock-001',
    identityId: 'identity-mock-001',
    tenantId: 'tenant-demo-001',
    roleLabel: 'member',
    active: true,
    ...overrides
  };
}

function createMockProvider(overrides = {}) {
  const baseResult = (operation, context) =>
    createTenantProviderSuccess(
      operation,
      context.providerId,
      {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        operation,
        providerId: context.providerId
      },
      createMockTenant(),
      [createMockMembership()],
      'resolved',
      [],
      operation === 'validateAccess' ? 'allow' : undefined,
      operation === 'validateAccess'
        ? {
            accessScopeId: 'scope-mock-001',
            allowedTenantIds: ['tenant-demo-001'],
            crossTenantAllowed: false
          }
        : undefined
    );

  return {
    id: 'provider-tenant-registry-001',
    kind: 'registry',
    resolveTenant: (context) => baseResult('resolveTenant', context),
    getTenant: (context) => baseResult('getTenant', context),
    listMemberships: (context) => baseResult('listMemberships', context),
    validateAccess: (context) => baseResult('validateAccess', context),
    refreshTenant: async (context) =>
      createTenantProviderResult({
        success: true,
        status: 'resolved',
        operation: 'refreshTenant',
        providerId: context.providerId,
        tenant: createMockTenant({ displayName: 'Refreshed Tenant' }),
        memberships: [createMockMembership()],
        telemetry: {
          durationMs: 1,
          startedAt: '2026-07-22T00:00:00.000Z',
          endedAt: '2026-07-22T00:00:00.001Z',
          operation: 'refreshTenant',
          providerId: context.providerId
        }
      }),
    ...overrides
  };
}

describe('TenantProviderRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createTenantProviderRegistry(true);
  });

  it('seeds all 6 builtin provider registrations', () => {
    assert.equal(registry.registrationCount(), 6);
    assert.equal(BUILTIN_TENANT_PROVIDER_COUNT, 6);
    assert.equal(BUILTIN_TENANT_PROVIDER_REGISTRATIONS.length, 6);
  });

  it('returns registrations sorted by order', () => {
    const items = registry.getAllRegistrations();
    assert.equal(items[0].id, 'provider-tenant-registry-001');
    assert.equal(items[items.length - 1].id, 'provider-tenant-claim-006');
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i].order >= items[i - 1].order);
    }
  });

  it('getRegistrationById returns registry provider metadata', () => {
    const entry = registry.getRegistrationById('provider-tenant-registry-001');
    assert.ok(entry);
    assert.equal(entry.kind, 'registry');
    assert.equal(entry.providerRegistered, false);
  });

  it('getBuiltinTenantProviderRegistration resolves membership slot', () => {
    const entry = getBuiltinTenantProviderRegistration(
      'provider-tenant-membership-002'
    );
    assert.ok(entry);
    assert.equal(entry.name, 'Membership');
    assert.equal(entry.kind, 'membership');
  });

  it('registerRegistration adds a new metadata entry', () => {
    registry.registerRegistration({
      id: 'provider-tenant-custom-099',
      name: 'Custom',
      description: 'Custom tenant provider slot',
      kind: 'header',
      providerRegistered: false,
      order: 99
    });
    assert.equal(registry.registrationCount(), 7);
    assert.ok(registry.getRegistrationById('provider-tenant-custom-099'));
  });

  it('registerRegistration stores an immutable snapshot isolated from its source', () => {
    const source = {
      id: 'provider-tenant-snapshot-098',
      name: 'Snapshot',
      description: 'Snapshot tenant provider slot',
      kind: 'header',
      providerRegistered: false,
      order: 98
    };

    registry.registerRegistration(source);

    const stored = registry.getRegistrationById(source.id);
    assert.ok(stored);
    assert.equal(Object.isFrozen(stored), true);

    source.name = 'Changed';
    source.description = 'Changed description';
    source.kind = 'claim';
    source.order = 999;

    assert.equal(stored.name, 'Snapshot');
    assert.equal(stored.description, 'Snapshot tenant provider slot');
    assert.equal(stored.kind, 'header');
    assert.equal(stored.order, 98);

    const all = registry.getAllRegistrations();
    assert.equal(Object.isFrozen(all), true);
    assert.ok(all.every((entry) => Object.isFrozen(entry)));
    assert.equal(Object.isFrozen(registry.getByKind('header')[0]), true);
  });

  it('registerRegistration rejects invalid metadata fields', () => {
    const base = {
      name: 'Invalid',
      description: 'Invalid metadata test',
      kind: 'header',
      providerRegistered: false,
      order: 99
    };

    for (const [field, value, pattern] of [
      ['description', '   ', /description zorunludur/],
      ['kind', 'unsupported', /kind desteklenmiyor/],
      ['providerRegistered', 'false', /providerRegistered boolean/],
      ['providerRegistered', true, /providerRegistered=false/],
      ['order', 0, /order pozitif/],
      ['order', -1, /order pozitif/],
      ['order', 1.5, /order pozitif/],
      ['order', NaN, /order pozitif/],
      ['order', Infinity, /order pozitif/]
    ]) {
      assert.throws(
        () =>
          registry.registerRegistration({
            ...base,
            id: `provider-tenant-invalid-${field}-${String(value)}`,
            [field]: value
          }),
        pattern
      );
    }
  });

  it('registerRegistration throws on duplicate id', () => {
    assert.throws(
      () =>
        registry.registerRegistration(BUILTIN_TENANT_PROVIDER_REGISTRATIONS[0]),
      /zaten mevcut/
    );
  });

  it('registerRegistration throws on missing id', () => {
    assert.throws(
      () =>
        registry.registerRegistration({
          id: '',
          name: 'X',
          description: 'X',
          kind: 'registry',
          providerRegistered: false,
          order: 1
        }),
      /id zorunludur/
    );
  });

  it('registerRegistration throws on missing name', () => {
    assert.throws(
      () =>
        registry.registerRegistration({
          id: 'provider-tenant-no-name',
          name: '',
          description: 'X',
          kind: 'registry',
          providerRegistered: false,
          order: 1
        }),
      /name zorunludur/
    );
  });

  it('registerRegistration throws on missing kind', () => {
    assert.throws(
      () =>
        registry.registerRegistration({
          id: 'provider-tenant-no-kind',
          name: 'No Kind',
          description: 'X',
          kind: '',
          providerRegistered: false,
          order: 1
        }),
      /kind zorunludur/
    );
  });

  it('registerProvider attaches implementation to metadata', () => {
    const provider = createMockProvider();
    registry.registerProvider(provider);
    assert.equal(registry.registeredProviderCount(), 1);
    assert.equal(
      registry.getRegistrationById('provider-tenant-registry-001')
        ?.providerRegistered,
      true
    );
    assert.equal(
      registry.getProviderById('provider-tenant-registry-001'),
      provider
    );
    assert.equal(Object.isFrozen(provider), false);
    assert.equal(
      Object.isFrozen(
        registry.getRegistrationById('provider-tenant-registry-001')
      ),
      true
    );
  });

  it('registerProvider throws when metadata missing', () => {
    assert.throws(
      () =>
        registry.registerProvider({
          ...createMockProvider(),
          id: 'provider-tenant-unknown'
        }),
      /metadata kaydı bulunamadı/
    );
  });

  it('registerProvider throws on duplicate implementation', () => {
    registry.registerProvider(createMockProvider());
    assert.throws(
      () => registry.registerProvider(createMockProvider()),
      /zaten kayıtlı/
    );
  });

  it('registerProvider throws on kind mismatch', () => {
    assert.throws(
      () =>
        registry.registerProvider(createMockProvider({ kind: 'membership' })),
      /kind uyuşmazlığı/
    );
  });

  it('unregisterProvider removes implementation but keeps metadata', () => {
    registry.registerProvider(createMockProvider());
    assert.equal(
      registry.unregisterProvider('provider-tenant-registry-001'),
      true
    );
    assert.equal(registry.registeredProviderCount(), 0);
    assert.equal(
      registry.getRegistrationById('provider-tenant-registry-001')
        ?.providerRegistered,
      false
    );
  });

  it('unregisterRegistration throws when implementation exists', () => {
    registry.registerProvider(createMockProvider());
    assert.throws(
      () => registry.unregisterRegistration('provider-tenant-registry-001'),
      /metadata silinemez/
    );
  });

  it('unregisterRegistration removes metadata when no implementation', () => {
    registry.registerRegistration({
      id: 'provider-tenant-temp-100',
      name: 'Temp',
      description: 'Temp',
      kind: 'registry',
      providerRegistered: false,
      order: 100
    });
    assert.equal(
      registry.unregisterRegistration('provider-tenant-temp-100'),
      true
    );
    assert.equal(registry.registrationCount(), 6);
  });

  it('getByKind returns slug and domain slots separately', () => {
    const slug = registry.getByKind('slug');
    assert.equal(slug.length, 1);
    assert.equal(slug[0].id, 'provider-tenant-slug-003');
    const domain = registry.getByKind('domain');
    assert.equal(domain.length, 1);
    assert.equal(domain[0].id, 'provider-tenant-domain-004');
  });

  it('hasRegistration and hasProvider reflect state', () => {
    assert.equal(
      registry.hasRegistration('provider-tenant-registry-001'),
      true
    );
    assert.equal(registry.hasProvider('provider-tenant-registry-001'), false);
    registry.registerProvider(createMockProvider());
    assert.equal(registry.hasProvider('provider-tenant-registry-001'), true);
  });

  it('isKindSupported validates kind for provider', () => {
    assert.equal(
      registry.isKindSupported('provider-tenant-registry-001', 'registry'),
      true
    );
    assert.equal(
      registry.isKindSupported('provider-tenant-registry-001', 'claim'),
      false
    );
  });

  it('getRegisteredProviders returns sorted implementations', () => {
    registry.registerProvider(createMockProvider());
    const providers = registry.getRegisteredProviders();
    assert.equal(providers.length, 1);
    assert.equal(providers[0].id, 'provider-tenant-registry-001');
  });

  it('clear removes all registrations and providers', () => {
    registry.registerProvider(createMockProvider());
    registry.clear();
    assert.equal(registry.registrationCount(), 0);
    assert.equal(registry.registeredProviderCount(), 0);
  });

  it('TenantProviderRegistryRuntime alias matches registry', () => {
    const runtime = createTenantProviderRegistryRuntime(true);
    assert.ok(runtime instanceof TenantProviderRegistryRuntime);
    assert.equal(runtime.registrationCount(), 6);
  });

  it('unregisterProvider returns false for unknown id', () => {
    assert.equal(registry.unregisterProvider('missing-provider'), false);
  });

  it('createTenantProviderRegistry can start empty', () => {
    const empty = createTenantProviderRegistry(false);
    assert.equal(empty.registrationCount(), 0);
  });
});

describe('TenantProviderContext', () => {
  it('createTenantProviderContext defaults locale to tr', () => {
    const context = createTenantProviderContext({
      providerId: 'provider-tenant-registry-001'
    });
    assert.equal(context.locale, 'tr');
    assert.equal(context.providerId, 'provider-tenant-registry-001');
  });

  it('creates an immutable context snapshot', () => {
    const sourceBag = { traceId: 'trace-original' };
    const context = createTenantProviderContext({
      providerId: 'provider-tenant-registry-001',
      bag: sourceBag
    });

    sourceBag.traceId = 'trace-mutated';

    assert.equal(context.bag?.traceId, 'trace-original');
    assert.equal(Object.isFrozen(context), true);
    assert.equal(Object.isFrozen(context.bag), true);
  });

  it('createTenantProviderContext preserves optional fields', () => {
    const context = createTenantProviderContext({
      locale: 'en',
      providerId: 'provider-tenant-registry-001',
      operation: 'resolveTenant',
      kind: 'registry',
      tenantId: 'tenant-demo-001',
      tenantSlug: 'demo',
      identityId: 'identity-001',
      membershipId: 'membership-001',
      sessionId: 'session-001',
      actorId: 'actor-001',
      resourceId: 'resource-001',
      bag: { traceId: 't-1' }
    });
    assert.equal(context.locale, 'en');
    assert.equal(context.operation, 'resolveTenant');
    assert.equal(context.tenantId, 'tenant-demo-001');
    assert.equal(context.tenantSlug, 'demo');
    assert.equal(context.bag?.traceId, 't-1');
  });
});

describe('TenantProviderResult factories', () => {
  const telemetry = {
    durationMs: 5,
    startedAt: '2026-07-22T00:00:00.000Z',
    endedAt: '2026-07-22T00:00:00.005Z',
    operation: 'resolveTenant',
    providerId: 'provider-tenant-registry-001'
  };

  it('creates immutable snapshots and isolates source mutations', () => {
    const tenant = {
      tenantId: 'tenant-original',
      slug: 'original',
      displayName: 'Original'
    };
    const membership = {
      membershipId: 'membership-original',
      identityId: 'identity-001',
      tenantId: 'tenant-original',
      roleLabel: 'Admin',
      active: true
    };
    const allowedTenantIds = ['tenant-original'];
    const accessScope = {
      accessScopeId: 'scope-001',
      allowedTenantIds,
      crossTenantAllowed: false
    };
    const issue = {
      code: 'ISSUE',
      message: 'Original issue',
      severity: 'warning'
    };
    const summary = {
      key: 'state',
      label: 'State',
      value: 'original'
    };
    const sourceTelemetry = { ...telemetry };
    const sourceBag = { traceId: 'trace-original' };

    const result = createTenantProviderResult({
      success: true,
      status: 'resolved',
      operation: 'resolveTenant',
      providerId: 'provider-tenant-registry-001',
      tenant,
      memberships: [membership],
      accessScope,
      validationIssues: [issue],
      summaryItems: [summary],
      telemetry: sourceTelemetry,
      bag: sourceBag
    });

    tenant.displayName = 'Mutated';
    membership.roleLabel = 'Mutated';
    allowedTenantIds.push('tenant-mutated');
    accessScope.crossTenantAllowed = true;
    issue.message = 'Mutated issue';
    summary.label = 'Mutated';
    sourceTelemetry.durationMs = 999;
    sourceBag.traceId = 'trace-mutated';

    assert.equal(result.tenant.displayName, 'Original');
    assert.equal(result.memberships[0].roleLabel, 'Admin');
    assert.deepEqual(result.accessScope.allowedTenantIds, ['tenant-original']);
    assert.equal(result.accessScope.crossTenantAllowed, false);
    assert.equal(result.validationIssues[0].message, 'Original issue');
    assert.equal(result.summaryItems[0].label, 'State');
    assert.equal(result.telemetry.durationMs, 5);
    assert.equal(result.bag.traceId, 'trace-original');

    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.tenant), true);
    assert.equal(Object.isFrozen(result.memberships), true);
    assert.equal(Object.isFrozen(result.memberships[0]), true);
    assert.equal(Object.isFrozen(result.accessScope), true);
    assert.equal(Object.isFrozen(result.accessScope.allowedTenantIds), true);
    assert.equal(Object.isFrozen(result.validationIssues[0]), true);
    assert.equal(Object.isFrozen(result.summaryItems[0]), true);
    assert.equal(Object.isFrozen(result.telemetry), true);
    assert.equal(Object.isFrozen(result.bag), true);
  });

  it('createTenantProviderResult freezes validation issues', () => {
    const result = createTenantProviderResult({
      success: false,
      status: 'unresolved',
      operation: 'resolveTenant',
      providerId: 'provider-tenant-registry-001',
      validationIssues: [{ code: 'X', message: 'Y', severity: 'error' }],
      telemetry
    });
    assert.equal(result.validationIssues.length, 1);
    assert.throws(() => {
      result.validationIssues.push({
        code: 'Z',
        message: 'W',
        severity: 'warning'
      });
    });
  });

  it('createTenantProviderFailure returns unresolved by default', () => {
    const result = createTenantProviderFailure(
      'resolveTenant',
      'provider-tenant-registry-001',
      telemetry,
      [{ code: 'FAIL', message: 'failed', severity: 'error' }]
    );
    assert.equal(result.success, false);
    assert.equal(result.status, 'unresolved');
  });

  it('createTenantProviderSuccess includes tenant and memberships', () => {
    const result = createTenantProviderSuccess(
      'resolveTenant',
      'provider-tenant-registry-001',
      telemetry,
      createMockTenant(),
      [createMockMembership()]
    );
    assert.equal(result.success, true);
    assert.equal(result.status, 'resolved');
    assert.equal(result.tenant?.tenantId, 'tenant-demo-001');
    assert.equal(result.memberships?.length, 1);
  });

  it('createTenantProviderResult freezes memberships', () => {
    const result = createTenantProviderResult({
      success: true,
      status: 'resolved',
      operation: 'listMemberships',
      providerId: 'provider-tenant-registry-001',
      memberships: [createMockMembership()],
      telemetry: { ...telemetry, operation: 'listMemberships' }
    });
    assert.throws(() => {
      result.memberships.push(createMockMembership({ membershipId: 'x' }));
    });
  });

  it('createTenantProviderFailure can set denied status', () => {
    const result = createTenantProviderFailure(
      'validateAccess',
      'provider-tenant-registry-001',
      { ...telemetry, operation: 'validateAccess' },
      [{ code: 'DENIED', message: 'denied', severity: 'error' }],
      'denied'
    );
    assert.equal(result.status, 'denied');
  });
});

describe('validateTenantProviderContext', () => {
  let registry;

  beforeEach(() => {
    registry = createTenantProviderRegistry(true);
  });

  it('returns error when providerId missing', () => {
    const issues = validateTenantProviderContext(
      createTenantProviderContext({ providerId: '' }),
      registry
    );
    assert.ok(issues.some((item) => item.code === 'PROVIDER_ID_REQUIRED'));
  });

  it('returns error when provider not found', () => {
    const issues = validateTenantProviderContext(
      createTenantProviderContext({ providerId: 'missing' }),
      registry
    );
    assert.ok(issues.some((item) => item.code === 'PROVIDER_NOT_FOUND'));
  });

  it('returns warning on kind mismatch', () => {
    const issues = validateTenantProviderContext(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001',
        kind: 'claim'
      }),
      registry
    );
    assert.ok(issues.some((item) => item.code === 'KIND_MISMATCH'));
  });

  it('returns immutable validation issue snapshots', () => {
    const issues = validateTenantProviderContext(
      {
        locale: 'de',
        providerId: 'provider-tenant-registry-001',
        kind: 'claim'
      },
      registry
    );

    assert.equal(Object.isFrozen(issues), true);
    assert.ok(issues.length >= 2);
    assert.ok(issues.every((issue) => Object.isFrozen(issue)));

    const firstIssue = issues[0];
    assert.ok(firstIssue);

    const originalMessage = firstIssue.message;

    assert.equal(
      Reflect.set(firstIssue, 'message', 'mutated'),
      false
    );
    assert.equal(firstIssue.message, originalMessage);

    assert.equal(
      Reflect.set(issues, '0', {
        code: 'INJECTED',
        message: 'Injected',
        severity: 'error'
      }),
      false
    );
  });

  it('hasTenantProviderValidationErrors detects errors only', () => {
    assert.equal(
      hasTenantProviderValidationErrors([
        { code: 'W', message: 'w', severity: 'warning' }
      ]),
      false
    );
    assert.equal(
      hasTenantProviderValidationErrors([
        { code: 'E', message: 'e', severity: 'error' }
      ]),
      true
    );
  });

  it('resolveTenantProvider returns undefined without implementation', () => {
    const context = createTenantProviderContext({
      providerId: 'provider-tenant-registry-001'
    });
    assert.equal(resolveTenantProvider(context, registry), undefined);
  });

  it('resolveTenantProviderRegistration returns metadata', () => {
    const context = createTenantProviderContext({
      providerId: 'provider-tenant-membership-002'
    });
    const registration = resolveTenantProviderRegistration(context, registry);
    assert.ok(registration);
    assert.equal(registration.kind, 'membership');
  });

  it('returns CONTEXT_MISSING when context is nullish', () => {
    const issues = validateTenantProviderContext(null, registry);
    assert.ok(issues.some((item) => item.code === 'CONTEXT_MISSING'));
  });

  it('returns INVALID_LOCALE for unsupported locale', () => {
    const issues = validateTenantProviderContext(
      {
        locale: 'de',
        providerId: 'provider-tenant-registry-001'
      },
      registry
    );
    assert.ok(issues.some((item) => item.code === 'INVALID_LOCALE'));
  });
});

describe('TenantAdapter without provider implementation', () => {
  let adapter;

  beforeEach(() => {
    adapter = createTenantAdapter(createTenantProviderRegistry(true));
  });

  it('resolveTenant returns PROVIDER_NOT_IMPLEMENTED for builtin slot', async () => {
    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.operation, 'resolveTenant');
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'PROVIDER_NOT_IMPLEMENTED'
      )
    );
  });

  it('getTenant returns failure when provider not implemented', async () => {
    const result = await adapter.getTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-membership-002'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.operation, 'getTenant');
  });

  it('listMemberships returns failure when provider not implemented', async () => {
    const result = await adapter.listMemberships(
      createTenantProviderContext({
        providerId: 'provider-tenant-slug-003'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.operation, 'listMemberships');
  });

  it('validateAccess returns failure when provider not implemented', async () => {
    const result = await adapter.validateAccess(
      createTenantProviderContext({
        providerId: 'provider-tenant-domain-004'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.operation, 'validateAccess');
  });

  it('refreshTenant returns failure when provider not implemented', async () => {
    const result = await adapter.refreshTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-header-005'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.operation, 'refreshTenant');
  });

  it('returns PROVIDER_ID_REQUIRED when providerId empty', async () => {
    const result = await adapter.resolveTenant(
      createTenantProviderContext({ providerId: '' })
    );
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'PROVIDER_ID_REQUIRED'
      )
    );
  });

  it('returns PROVIDER_NOT_FOUND for unknown provider', async () => {
    const result = await adapter.resolveTenant(
      createTenantProviderContext({ providerId: 'provider-tenant-unknown' })
    );
    assert.ok(
      result.validationIssues.some((item) => item.code === 'PROVIDER_NOT_FOUND')
    );
  });

  it('includes telemetry on failure results', async () => {
    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.equal(result.telemetry.providerId, 'provider-tenant-registry-001');
    assert.equal(result.telemetry.operation, 'resolveTenant');
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
  });

  it('getRegistry returns injected registry', () => {
    const registry = createTenantProviderRegistry(false);
    const localAdapter = createTenantAdapter(registry);
    assert.equal(localAdapter.getRegistry(), registry);
  });
});

describe('TenantAdapter with mock provider', () => {
  let adapter;
  let registry;

  beforeEach(() => {
    registry = createTenantProviderRegistry(true);
    registry.registerProvider(createMockProvider());
    adapter = createTenantAdapter(registry);
  });

  it('resolveTenant delegates to provider and succeeds', async () => {
    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001',
        identityId: 'identity-mock-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.status, 'resolved');
    assert.equal(result.tenant?.tenantId, 'tenant-demo-001');
  });

  it('passes an isolated immutable context snapshot to provider', async () => {
    const sourceBag = { requestId: 'req-original' };
    const sourceContext = createTenantProviderContext({
      providerId: 'provider-tenant-registry-001',
      bag: sourceBag
    });
    let providerContext;

    const contextProvider = createMockProvider({
      resolveTenant: (context) => {
        providerContext = context;
        return createTenantProviderSuccess(
          'resolveTenant',
          context.providerId,
          {
            durationMs: 1,
            startedAt: '2026-07-22T00:00:00.000Z',
            endedAt: '2026-07-22T00:00:00.001Z',
            operation: 'resolveTenant',
            providerId: context.providerId
          },
          createMockTenant()
        );
      }
    });

    registry.unregisterProvider('provider-tenant-registry-001');
    registry.registerProvider(contextProvider);

    const result = await adapter.resolveTenant(sourceContext);

    assert.equal(result.success, true);
    assert.notStrictEqual(providerContext, sourceContext);
    assert.notStrictEqual(providerContext.bag, sourceContext.bag);
    assert.equal(Object.isFrozen(providerContext), true);
    assert.equal(Object.isFrozen(providerContext.bag), true);
    assert.equal(
      Reflect.set(providerContext, 'tenantId', 'tenant-tampered'),
      false
    );
    assert.equal(
      Reflect.set(providerContext.bag, 'requestId', 'req-tampered'),
      false
    );
    assert.equal(sourceContext.tenantId, undefined);
    assert.equal(sourceBag.requestId, 'req-original');
    assert.equal(result.bag?.requestId, 'req-original');
  });

  it('getTenant delegates to provider', async () => {
    const result = await adapter.getTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001',
        tenantId: 'tenant-demo-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'getTenant');
  });

  it('listMemberships delegates to provider', async () => {
    const result = await adapter.listMemberships(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001',
        identityId: 'identity-mock-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'listMemberships');
    assert.equal(result.memberships?.length, 1);
  });

  it('validateAccess delegates to provider', async () => {
    const result = await adapter.validateAccess(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001',
        tenantId: 'tenant-demo-001',
        resourceId: 'resource-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'validateAccess');
    assert.equal(result.accessOutcome, 'allow');
  });

  it('refreshTenant delegates to provider asynchronously', async () => {
    const result = await adapter.refreshTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'refreshTenant');
    assert.equal(result.tenant?.displayName, 'Refreshed Tenant');
  });

  it('merges adapter summary items with provider summary items', async () => {
    const customProvider = createMockProvider({
      resolveTenant: (context) =>
        createTenantProviderSuccess(
          'resolveTenant',
          context.providerId,
          {
            durationMs: 1,
            startedAt: '2026-07-22T00:00:00.000Z',
            endedAt: '2026-07-22T00:00:00.001Z',
            operation: 'resolveTenant',
            providerId: context.providerId
          },
          createMockTenant(),
          [createMockMembership()],
          'resolved',
          [{ key: 'custom', label: 'Custom', value: true }]
        )
    });
    registry.unregisterProvider('provider-tenant-registry-001');
    registry.registerProvider(customProvider);

    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.ok(result.summaryItems.some((item) => item.key === 'operation'));
    assert.ok(result.summaryItems.some((item) => item.key === 'custom'));
  });

  it('supports async provider implementations', async () => {
    const asyncProvider = createMockProvider({
      resolveTenant: async (context) =>
        createTenantProviderSuccess(
          'resolveTenant',
          context.providerId,
          {
            durationMs: 2,
            startedAt: '2026-07-22T00:00:00.000Z',
            endedAt: '2026-07-22T00:00:00.002Z',
            operation: 'resolveTenant',
            providerId: context.providerId
          },
          createMockTenant({ displayName: 'Async Tenant' }),
          [createMockMembership()]
        )
    });
    registry.unregisterProvider('provider-tenant-registry-001');
    registry.registerProvider(asyncProvider);

    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.equal(result.tenant?.displayName, 'Async Tenant');
  });

  it('normalizes mutable provider results into isolated immutable snapshots', async () => {
    const sourceTenant = createMockTenant();
    sourceTenant.displayName = 'Original tenant';

    const sourceMembership = createMockMembership();
    sourceMembership.roleLabel = 'viewer';

    const sourceMemberships = [sourceMembership];
    const sourceAccessScope = {
      accessScopeId: 'scope-source-001',
      allowedTenantIds: ['tenant-demo-001'],
      crossTenantAllowed: false
    };
    const sourceIssue = {
      code: 'SOURCE_WARNING',
      message: 'Original warning',
      severity: 'warning'
    };
    const sourceValidationIssues = [sourceIssue];
    const sourceSummaryItem = {
      key: 'custom',
      label: 'Original summary',
      value: 'original'
    };
    const sourceSummaryItems = [sourceSummaryItem];
    const sourceBag = { traceId: 'trace-original' };

    const mutableProviderResult = {
      success: true,
      status: 'resolved',
      operation: 'resolveTenant',
      providerId: 'provider-tenant-registry-001',
      tenant: sourceTenant,
      memberships: sourceMemberships,
      accessScope: sourceAccessScope,
      accessOutcome: 'allow',
      validationIssues: sourceValidationIssues,
      summaryItems: sourceSummaryItems,
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        operation: 'resolveTenant',
        providerId: 'provider-tenant-registry-001'
      },
      bag: sourceBag
    };

    const mutableProvider = createMockProvider({
      resolveTenant: () => mutableProviderResult
    });

    registry.unregisterProvider('provider-tenant-registry-001');
    registry.registerProvider(mutableProvider);

    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );

    sourceTenant.displayName = 'Mutated tenant';
    sourceMembership.roleLabel = 'admin';
    sourceMemberships.push(createMockMembership());
    sourceAccessScope.allowedTenantIds.push('tenant-injected');
    sourceIssue.message = 'Mutated warning';
    sourceValidationIssues.push({
      code: 'INJECTED',
      message: 'Injected issue',
      severity: 'error'
    });
    sourceSummaryItem.label = 'Mutated summary';
    sourceSummaryItems.push({
      key: 'injected',
      label: 'Injected summary',
      value: true
    });
    sourceBag.traceId = 'trace-mutated';

    assert.equal(result.tenant?.displayName, 'Original tenant');
    assert.equal(result.memberships?.length, 1);
    assert.equal(result.memberships?.[0]?.roleLabel, 'viewer');
    assert.deepEqual(
      result.accessScope?.allowedTenantIds,
      ['tenant-demo-001']
    );
    assert.equal(result.validationIssues.length, 1);
    assert.equal(result.validationIssues[0]?.message, 'Original warning');
    assert.equal(
      result.summaryItems.filter((item) => item.key === 'custom').length,
      1
    );
    assert.equal(
      result.summaryItems.find((item) => item.key === 'custom')?.label,
      'Original summary'
    );
    assert.equal(result.bag?.traceId, 'trace-original');

    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.tenant), true);
    assert.equal(Object.isFrozen(result.memberships), true);
    assert.equal(Object.isFrozen(result.memberships?.[0]), true);
    assert.equal(Object.isFrozen(result.accessScope), true);
    assert.equal(
      Object.isFrozen(result.accessScope?.allowedTenantIds),
      true
    );
    assert.equal(Object.isFrozen(result.validationIssues), true);
    assert.equal(Object.isFrozen(result.validationIssues[0]), true);
    assert.equal(Object.isFrozen(result.summaryItems), true);
    assert.equal(
      Object.isFrozen(result.summaryItems.find((item) => item.key === 'custom')),
      true
    );
    assert.equal(Object.isFrozen(result.telemetry), true);
    assert.equal(Object.isFrozen(result.bag), true);
  });

  it('preserves context bag on successful operations when provider has no bag', async () => {
    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001',
        bag: { requestId: 'req-42' }
      })
    );
    assert.equal(result.bag?.requestId, 'req-42');
  });
});

describe('Builtin provider metadata coverage', () => {
  it('freezes the builtin metadata array and every registration', () => {
    assert.equal(Object.isFrozen(BUILTIN_TENANT_PROVIDER_REGISTRATIONS), true);
    assert.ok(
      BUILTIN_TENANT_PROVIDER_REGISTRATIONS.every((entry) =>
        Object.isFrozen(entry)
      )
    );

    const registry = createTenantProviderRegistry(true);
    assert.ok(
      registry.getAllRegistrations().every((entry) => Object.isFrozen(entry))
    );
  });

  it('covers all tenant provider kinds in builtin registrations', () => {
    const kinds = BUILTIN_TENANT_PROVIDER_REGISTRATIONS.map(
      (entry) => entry.kind
    );
    assert.deepEqual(kinds, [
      'registry',
      'membership',
      'slug',
      'domain',
      'header',
      'claim'
    ]);
  });

  it('all builtin registrations start unregistered', () => {
    for (const entry of BUILTIN_TENANT_PROVIDER_REGISTRATIONS) {
      assert.equal(entry.providerRegistered, false);
    }
  });

  it('TenantAdapter is constructable via class', () => {
    const registry = createTenantProviderRegistry(true);
    const instance = new TenantAdapter(registry);
    assert.ok(instance instanceof TenantAdapter);
    assert.equal(instance.getRegistry().registrationCount(), 6);
  });

  it('each builtin registration has non-empty name and description', () => {
    for (const entry of BUILTIN_TENANT_PROVIDER_REGISTRATIONS) {
      assert.ok(entry.name.length > 0);
      assert.ok(entry.description.length > 0);
    }
  });

  it('builtin registration orders are unique', () => {
    const orders = BUILTIN_TENANT_PROVIDER_REGISTRATIONS.map(
      (entry) => entry.order
    );
    assert.equal(new Set(orders).size, orders.length);
  });

  it('getBuiltinTenantProviderRegistration returns undefined for unknown', () => {
    assert.equal(getBuiltinTenantProviderRegistration('missing'), undefined);
  });
});

describe('TenantAdapter operation edge cases', () => {
  let adapter;
  let registry;

  beforeEach(() => {
    registry = createTenantProviderRegistry(true);
    registry.registerProvider(createMockProvider());
    adapter = createTenantAdapter(registry);
  });

  it('sets operation on context during resolveTenant', async () => {
    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.equal(result.telemetry.operation, 'resolveTenant');
  });

  it('sets operation on context during getTenant', async () => {
    const result = await adapter.getTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.equal(result.telemetry.operation, 'getTenant');
  });

  it('sets operation on context during listMemberships', async () => {
    const result = await adapter.listMemberships(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.equal(result.telemetry.operation, 'listMemberships');
  });

  it('sets operation on context during validateAccess', async () => {
    const result = await adapter.validateAccess(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.equal(result.telemetry.operation, 'validateAccess');
  });

  it('sets operation on context during refreshTenant', async () => {
    const result = await adapter.refreshTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.equal(result.telemetry.operation, 'refreshTenant');
  });

  it('propagates provider validation issues on success path', async () => {
    const warningProvider = createMockProvider({
      resolveTenant: (context) =>
        createTenantProviderResult({
          success: true,
          status: 'resolved',
          operation: 'resolveTenant',
          providerId: context.providerId,
          tenant: createMockTenant(),
          validationIssues: [
            { code: 'WARN', message: 'soft warning', severity: 'warning' }
          ],
          telemetry: {
            durationMs: 1,
            startedAt: '2026-07-22T00:00:00.000Z',
            endedAt: '2026-07-22T00:00:00.001Z',
            operation: 'resolveTenant',
            providerId: context.providerId
          }
        })
    });
    registry.unregisterProvider('provider-tenant-registry-001');
    registry.registerProvider(warningProvider);

    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001'
      })
    );
    assert.ok(result.validationIssues.some((item) => item.code === 'WARN'));
  });

  it('returns kind mismatch warning without blocking when provider exists', async () => {
    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-registry-001',
        kind: 'claim'
      })
    );
    assert.equal(result.success, true);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'KIND_MISMATCH')
    );
  });

  it('createTenantAdapter uses default seeded registry', () => {
    const defaultAdapter = createTenantAdapter();
    assert.equal(defaultAdapter.getRegistry().registrationCount(), 6);
  });

  it('registry exposes TenantProviderRegistry class', () => {
    const instance = new TenantProviderRegistry(true);
    assert.ok(instance instanceof TenantProviderRegistry);
    assert.equal(instance.registrationCount(), 6);
  });

  it('failure result summary items remain empty by default', async () => {
    const result = await adapter.resolveTenant(
      createTenantProviderContext({
        providerId: 'provider-tenant-claim-006'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.summaryItems.length, 0);
  });

  it('resolveTenantProvider returns provider after registration', () => {
    const context = createTenantProviderContext({
      providerId: 'provider-tenant-registry-001'
    });
    assert.ok(resolveTenantProvider(context, registry));
  });

  it('resolveTenantProvider returns undefined without providerId', () => {
    assert.equal(resolveTenantProvider({}, registry), undefined);
  });

  it('resolveTenantProviderRegistration returns undefined without providerId', () => {
    assert.equal(resolveTenantProviderRegistration({}, registry), undefined);
  });
});
