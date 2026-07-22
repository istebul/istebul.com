/**
 * Supabase Tenant Provider — EPIC-302B (en az 80 unit test)
 *
 * Coverage: initialization, resolution, membership, access, refresh,
 * error mapping, adapter integration.
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
  createSupabaseTenantProvider,
  createSupabaseTenantContext,
  toTenantProviderContext,
  fromTenantProviderContext,
  validateSupabaseResolveTenantKeys,
  validateSupabaseTenantId,
  validateSupabaseMembershipLookup,
  validateSupabaseAccessKeys,
  createSupabaseTenantResult,
  toTenantIdentityRefFromSupabaseTenant,
  toTenantMembershipsFromSupabase,
  statusFromTenantErrorCode,
  toTenantProviderResult,
  assertSupabaseTenantClient,
  mapSupabaseTenantErrorMessageToCode,
  mapSupabaseTenantError,
  mapUnknownTenantProviderError,
  TenantError,
  TenantNotFound,
  MembershipNotFound,
  AccessDenied,
  TenantProviderUnavailable,
  createTenantErrorByCode,
  toTenantError,
  SUPABASE_TENANT_PROVIDER_ID,
  SUPABASE_TENANT_PROVIDER_NAME,
  SUPABASE_TENANT_CONTEXT_BAG_KEY,
  createSupabaseTenantProviderRegistration,
  registerSupabaseTenantProvider,
  createTenantAdapterWithSupabaseProvider,
  attachSupabaseTenantProvider,
  createTenantProviderRegistry,
  createTenantAdapter,
  SupabaseTenantProvider
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
  const tenants = {
    getById: async () => ({ data: createTenantRow(), error: null }),
    getBySlug: async () => ({ data: createTenantRow(), error: null }),
    getByDomain: async () => ({ data: createTenantRow(), error: null }),
    ...(overrides.tenants ?? {})
  };
  const memberships = {
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
  };
  return { tenants, memberships };
}

describe('Provider initialization', () => {
  it('creates provider with injected client', () => {
    const client = createMockClient();
    const provider = createSupabaseTenantProvider({ client });
    assert.equal(provider.id, SUPABASE_TENANT_PROVIDER_ID);
    assert.equal(provider.kind, 'registry');
    assert.equal(provider.getClient(), client);
  });

  it('allows custom providerId and kind', () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient(),
      providerId: 'custom-tenant-supabase',
      kind: 'membership'
    });
    assert.equal(provider.id, 'custom-tenant-supabase');
    assert.equal(provider.kind, 'membership');
  });

  it('throws when client is missing', () => {
    assert.throws(
      () => createSupabaseTenantProvider({ client: null }),
      /Supabase Tenant client zorunludur/
    );
  });

  it('throws when tenants.getById missing', () => {
    assert.throws(
      () =>
        createSupabaseTenantProvider({
          client: {
            tenants: { getBySlug: async () => ({}) },
            memberships: {
              listByIdentity: async () => ({}),
              listByTenant: async () => ({}),
              getById: async () => ({}),
              validateAccess: async () => ({})
            }
          }
        }),
      /tenants.getById zorunludur/
    );
  });

  it('throws when memberships.validateAccess missing', () => {
    assert.throws(
      () =>
        createSupabaseTenantProvider({
          client: {
            tenants: {
              getById: async () => ({}),
              getBySlug: async () => ({}),
              getByDomain: async () => ({})
            },
            memberships: {
              listByIdentity: async () => ({}),
              listByTenant: async () => ({}),
              getById: async () => ({})
            }
          }
        }),
      /memberships.validateAccess zorunludur/
    );
  });

  it('assertSupabaseTenantClient accepts valid client', () => {
    assert.doesNotThrow(() => assertSupabaseTenantClient(createMockClient()));
  });

  it('assertSupabaseTenantClient rejects incomplete client', () => {
    assert.throws(
      () => assertSupabaseTenantClient({ tenants: {}, memberships: {} }),
      /zorunludur/
    );
  });

  it('does not create singleton — two factories are independent', () => {
    const a = createSupabaseTenantProvider({ client: createMockClient() });
    const b = createSupabaseTenantProvider({ client: createMockClient() });
    assert.notEqual(a, b);
    assert.notEqual(a.getClient(), b.getClient());
  });

  it('SupabaseTenantProvider is constructable', () => {
    const provider = new SupabaseTenantProvider({
      client: createMockClient()
    });
    assert.ok(provider instanceof SupabaseTenantProvider);
  });
});

describe('SupabaseTenantContext', () => {
  it('createSupabaseTenantContext defaults locale to tr', () => {
    const context = createSupabaseTenantContext({});
    assert.equal(context.locale, 'tr');
  });

  it('toTenantProviderContext embeds resolution keys in bag', () => {
    const providerContext = toTenantProviderContext(
      createSupabaseTenantContext({
        tenantId: 'tenant-demo-001',
        domain: 'demo.example.com',
        headerValue: 'hdr',
        claimValue: 'claim'
      })
    );
    assert.equal(providerContext.providerId, SUPABASE_TENANT_PROVIDER_ID);
    assert.equal(providerContext.kind, 'registry');
    assert.equal(
      providerContext.bag?.[SUPABASE_TENANT_CONTEXT_BAG_KEY]?.domain,
      'demo.example.com'
    );
  });

  it('fromTenantProviderContext restores resolution keys', () => {
    const roundTrip = fromTenantProviderContext(
      toTenantProviderContext(
        createSupabaseTenantContext({
          tenantSlug: 'demo',
          domain: 'demo.example.com',
          identityId: 'identity-001'
        })
      )
    );
    assert.equal(roundTrip.tenantSlug, 'demo');
    assert.equal(roundTrip.domain, 'demo.example.com');
    assert.equal(roundTrip.identityId, 'identity-001');
  });

  it('validateSupabaseResolveTenantKeys requires a key', () => {
    assert.ok(validateSupabaseResolveTenantKeys(createSupabaseTenantContext({})));
    assert.equal(
      validateSupabaseResolveTenantKeys(
        createSupabaseTenantContext({ tenantSlug: 'demo' })
      ),
      undefined
    );
  });

  it('validateSupabaseTenantId requires tenantId', () => {
    assert.ok(validateSupabaseTenantId(createSupabaseTenantContext({})));
    assert.equal(
      validateSupabaseTenantId(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      ),
      undefined
    );
  });

  it('validateSupabaseMembershipLookup requires identity/tenant/membership', () => {
    assert.ok(
      validateSupabaseMembershipLookup(createSupabaseTenantContext({}))
    );
    assert.equal(
      validateSupabaseMembershipLookup(
        createSupabaseTenantContext({ identityId: 'identity-001' })
      ),
      undefined
    );
  });

  it('validateSupabaseAccessKeys requires identity and tenant', () => {
    assert.match(
      validateSupabaseAccessKeys(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      ),
      /identityId/
    );
    assert.match(
      validateSupabaseAccessKeys(
        createSupabaseTenantContext({ identityId: 'identity-001' })
      ),
      /tenantId/
    );
    assert.equal(
      validateSupabaseAccessKeys(
        createSupabaseTenantContext({
          identityId: 'identity-001',
          tenantId: 'tenant-demo-001'
        })
      ),
      undefined
    );
  });
});

describe('SupabaseTenantResult factories', () => {
  const telemetry = {
    durationMs: 3,
    startedAt: '2026-07-22T00:00:00.000Z',
    endedAt: '2026-07-22T00:00:00.003Z',
    operation: 'resolveTenant',
    providerId: SUPABASE_TENANT_PROVIDER_ID
  };

  it('createSupabaseTenantResult maps success', () => {
    const result = createSupabaseTenantResult({
      success: true,
      status: 'resolved',
      operation: 'resolveTenant',
      tenant: {
        id: 'tenant-demo-001',
        slug: 'demo',
        displayName: 'Demo Tenant'
      },
      telemetry
    });
    assert.equal(result.success, true);
    assert.equal(result.tenant?.slug, 'demo');
  });

  it('toTenantIdentityRefFromSupabaseTenant maps fields', () => {
    const ref = toTenantIdentityRefFromSupabaseTenant({
      id: 'tenant-demo-001',
      slug: 'demo',
      displayName: 'Demo Tenant'
    });
    assert.equal(ref.tenantId, 'tenant-demo-001');
    assert.equal(ref.displayName, 'Demo Tenant');
  });

  it('toTenantMembershipsFromSupabase maps memberships', () => {
    const mapped = toTenantMembershipsFromSupabase([
      {
        id: 'membership-001',
        identityId: 'identity-001',
        tenantId: 'tenant-demo-001',
        roleLabel: 'admin',
        active: true
      }
    ]);
    assert.equal(mapped[0].membershipId, 'membership-001');
    assert.equal(mapped[0].roleLabel, 'admin');
  });

  it('toTenantProviderResult maps error into validationIssues', () => {
    const mapped = toTenantProviderResult(
      createSupabaseTenantResult({
        success: false,
        status: 'unresolved',
        operation: 'getTenant',
        error: { code: 'TenantNotFound', message: 'missing' },
        telemetry: { ...telemetry, operation: 'getTenant' }
      })
    );
    assert.equal(mapped.success, false);
    assert.ok(
      mapped.validationIssues.some((item) => item.code === 'TenantNotFound')
    );
  });

  it('statusFromTenantErrorCode maps known codes', () => {
    assert.equal(statusFromTenantErrorCode('AccessDenied'), 'denied');
    assert.equal(statusFromTenantErrorCode('TenantNotFound'), 'unresolved');
    assert.equal(statusFromTenantErrorCode('MembershipNotFound'), 'unresolved');
    assert.equal(statusFromTenantErrorCode('ProviderUnavailable'), 'stale');
    assert.equal(statusFromTenantErrorCode('TenantError'), 'unresolved');
  });
});

describe('Error model', () => {
  it('TenantNotFound has code TenantNotFound', () => {
    const error = new TenantNotFound();
    assert.equal(error.code, 'TenantNotFound');
    assert.equal(error.name, 'TenantNotFound');
  });

  it('MembershipNotFound has code MembershipNotFound', () => {
    const error = new MembershipNotFound();
    assert.equal(error.code, 'MembershipNotFound');
  });

  it('AccessDenied has code AccessDenied', () => {
    const error = new AccessDenied();
    assert.equal(error.code, 'AccessDenied');
  });

  it('TenantProviderUnavailable has code ProviderUnavailable', () => {
    const error = new TenantProviderUnavailable();
    assert.equal(error.code, 'ProviderUnavailable');
  });

  it('createTenantErrorByCode returns correct subclass', () => {
    assert.ok(
      createTenantErrorByCode('TenantNotFound', 'x') instanceof TenantNotFound
    );
    assert.ok(
      createTenantErrorByCode('MembershipNotFound', 'x') instanceof
        MembershipNotFound
    );
    assert.ok(
      createTenantErrorByCode('AccessDenied', 'x') instanceof AccessDenied
    );
    assert.ok(
      createTenantErrorByCode('ProviderUnavailable', 'x') instanceof
        TenantProviderUnavailable
    );
    assert.ok(
      createTenantErrorByCode('TenantError', 'x') instanceof TenantError
    );
  });

  it('toTenantError wraps unknown values', () => {
    const fromError = toTenantError(new Error('boom'));
    assert.equal(fromError.message, 'boom');
    const fromString = toTenantError('plain');
    assert.equal(fromString.message, 'plain');
    const passthrough = toTenantError(new TenantNotFound('keep'));
    assert.equal(passthrough.message, 'keep');
  });
});

describe('Error mapping', () => {
  it('maps 404 to TenantNotFound', () => {
    assert.equal(
      mapSupabaseTenantErrorMessageToCode('missing', 404),
      'TenantNotFound'
    );
  });

  it('maps membership not found message', () => {
    assert.equal(
      mapSupabaseTenantErrorMessageToCode('membership not found', 404),
      'MembershipNotFound'
    );
  });

  it('maps 403 to AccessDenied', () => {
    assert.equal(
      mapSupabaseTenantErrorMessageToCode('forbidden', 403),
      'AccessDenied'
    );
  });

  it('maps 503 to ProviderUnavailable', () => {
    assert.equal(
      mapSupabaseTenantErrorMessageToCode('down', 503),
      'ProviderUnavailable'
    );
  });

  it('maps network text to ProviderUnavailable', () => {
    assert.equal(
      mapSupabaseTenantErrorMessageToCode('failed to fetch'),
      'ProviderUnavailable'
    );
  });

  it('mapSupabaseTenantError returns typed TenantNotFound', () => {
    const error = mapSupabaseTenantError({
      message: 'tenant not found',
      status: 404
    });
    assert.ok(error instanceof TenantNotFound);
  });

  it('mapUnknownTenantProviderError maps Error network', () => {
    const error = mapUnknownTenantProviderError(new Error('ECONNREFUSED'));
    assert.ok(error instanceof TenantProviderUnavailable);
  });

  it('mapUnknownTenantProviderError passes through TenantError', () => {
    const original = new AccessDenied('nope');
    assert.equal(mapUnknownTenantProviderError(original), original);
  });

  it('mapUnknownTenantProviderError maps object with message', () => {
    const error = mapUnknownTenantProviderError({
      message: 'access denied',
      status: 403
    });
    assert.ok(error instanceof AccessDenied);
  });

  it('mapUnknownTenantProviderError defaults unknown to ProviderUnavailable', () => {
    const error = mapUnknownTenantProviderError(42);
    assert.ok(error instanceof TenantProviderUnavailable);
  });
});

describe('Tenant resolution', () => {
  let provider;

  beforeEach(() => {
    provider = createSupabaseTenantProvider({ client: createMockClient() });
  });

  it('resolveTenant by tenantId', async () => {
    const result = await provider.resolveTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.tenant?.tenantId, 'tenant-demo-001');
    assert.equal(result.status, 'resolved');
  });

  it('resolveTenant by slug', async () => {
    const client = createMockClient({
      tenants: {
        getById: async () => ({ data: null, error: null }),
        getBySlug: async () => ({
          data: createTenantRow({ slug: 'acme' }),
          error: null
        }),
        getByDomain: async () => ({ data: null, error: null })
      }
    });
    provider = createSupabaseTenantProvider({ client });
    const result = await provider.resolveTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantSlug: 'acme' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.tenant?.slug, 'acme');
  });

  it('resolveTenant by domain', async () => {
    const client = createMockClient({
      tenants: {
        getById: async () => ({ data: null, error: null }),
        getBySlug: async () => ({ data: null, error: null }),
        getByDomain: async () => ({
          data: createTenantRow({ domain: 'acme.test' }),
          error: null
        })
      }
    });
    provider = createSupabaseTenantProvider({ client });
    const result = await provider.resolveTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ domain: 'acme.test' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.tenant?.tenantId, 'tenant-demo-001');
  });

  it('resolveTenant by membershipId', async () => {
    const result = await provider.resolveTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ membershipId: 'membership-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.tenant?.tenantId, 'tenant-demo-001');
  });

  it('resolveTenant returns TenantNotFound when missing keys', async () => {
    const result = await provider.resolveTenant(
      toTenantProviderContext(createSupabaseTenantContext({}))
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'TenantNotFound')
    );
  });

  it('resolveTenant returns TenantNotFound when row null', async () => {
    provider = createSupabaseTenantProvider({
      client: createMockClient({
        tenants: {
          getById: async () => ({ data: null, error: null }),
          getBySlug: async () => ({ data: null, error: null }),
          getByDomain: async () => ({ data: null, error: null })
        }
      })
    });
    const result = await provider.resolveTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'missing' })
      )
    );
    assert.equal(result.success, false);
    assert.equal(result.status, 'unresolved');
  });

  it('resolveTenantWithSupabaseContext works directly', async () => {
    const result = await provider.resolveTenantWithSupabaseContext(
      createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
    );
    assert.equal(result.success, true);
    assert.equal(result.tenant?.id, 'tenant-demo-001');
  });

  it('getTenant returns tenant by id', async () => {
    const result = await provider.getTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'getTenant');
    assert.equal(result.tenant?.displayName, 'Demo Tenant');
  });

  it('getTenant fails without tenantId', async () => {
    const result = await provider.getTenant(
      toTenantProviderContext(createSupabaseTenantContext({}))
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'TenantNotFound')
    );
  });
});

describe('Membership lookup', () => {
  let provider;

  beforeEach(() => {
    provider = createSupabaseTenantProvider({ client: createMockClient() });
  });

  it('listMemberships by identityId', async () => {
    const result = await provider.listMemberships(
      toTenantProviderContext(
        createSupabaseTenantContext({ identityId: 'identity-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.memberships?.length, 1);
    assert.equal(result.memberships?.[0].identityId, 'identity-001');
  });

  it('listMemberships by tenantId', async () => {
    const result = await provider.listMemberships(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.memberships?.length, 1);
    assert.equal(result.tenant?.tenantId, 'tenant-demo-001');
  });

  it('listMemberships by membershipId', async () => {
    const result = await provider.listMemberships(
      toTenantProviderContext(
        createSupabaseTenantContext({ membershipId: 'membership-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.memberships?.[0].membershipId, 'membership-001');
  });

  it('listMemberships fails when empty', async () => {
    provider = createSupabaseTenantProvider({
      client: createMockClient({
        memberships: {
          listByIdentity: async () => ({ data: [], error: null }),
          listByTenant: async () => ({ data: [], error: null }),
          getById: async () => ({ data: null, error: null }),
          validateAccess: async () => ({ data: null, error: null })
        }
      })
    });
    const result = await provider.listMemberships(
      toTenantProviderContext(
        createSupabaseTenantContext({ identityId: 'identity-001' })
      )
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'MembershipNotFound'
      )
    );
  });

  it('listMemberships fails without lookup keys', async () => {
    const result = await provider.listMemberships(
      toTenantProviderContext(createSupabaseTenantContext({}))
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'MembershipNotFound'
      )
    );
  });
});

describe('Access validation', () => {
  let provider;

  beforeEach(() => {
    provider = createSupabaseTenantProvider({ client: createMockClient() });
  });

  it('validateAccess allows when client allows', async () => {
    const result = await provider.validateAccess(
      toTenantProviderContext(
        createSupabaseTenantContext({
          identityId: 'identity-001',
          tenantId: 'tenant-demo-001',
          resourceId: 'resource-1'
        })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.accessOutcome, 'allow');
    assert.ok(result.accessScope);
  });

  it('validateAccess denies when not allowed', async () => {
    provider = createSupabaseTenantProvider({
      client: createMockClient({
        memberships: {
          listByIdentity: async () => ({ data: [], error: null }),
          listByTenant: async () => ({ data: [], error: null }),
          getById: async () => ({ data: null, error: null }),
          validateAccess: async () => ({
            data: { allowed: false, outcome: 'deny' },
            error: null
          })
        }
      })
    });
    const result = await provider.validateAccess(
      toTenantProviderContext(
        createSupabaseTenantContext({
          identityId: 'identity-001',
          tenantId: 'tenant-demo-001'
        })
      )
    );
    assert.equal(result.success, false);
    assert.equal(result.status, 'denied');
    assert.ok(
      result.validationIssues.some((item) => item.code === 'AccessDenied')
    );
  });

  it('validateAccess fails without identity/tenant', async () => {
    const result = await provider.validateAccess(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'AccessDenied')
    );
  });

  it('validateAccess maps restrict outcome', async () => {
    provider = createSupabaseTenantProvider({
      client: createMockClient({
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
      })
    });
    const result = await provider.validateAccess(
      toTenantProviderContext(
        createSupabaseTenantContext({
          identityId: 'identity-001',
          tenantId: 'tenant-demo-001'
        })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.accessOutcome, 'restrict');
  });
});

describe('Refresh flow', () => {
  let provider;

  beforeEach(() => {
    provider = createSupabaseTenantProvider({ client: createMockClient() });
  });

  it('refreshTenant reloads tenant and memberships', async () => {
    const result = await provider.refreshTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({
          tenantId: 'tenant-demo-001',
          identityId: 'identity-001'
        })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'refreshTenant');
    assert.equal(result.tenant?.tenantId, 'tenant-demo-001');
    assert.equal(result.memberships?.length, 1);
    assert.ok(result.summaryItems.some((item) => item.key === 'refreshed'));
  });

  it('refreshTenant without identity lists by tenant', async () => {
    const result = await provider.refreshTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.memberships?.length, 1);
  });

  it('refreshTenant fails without tenantId', async () => {
    const result = await provider.refreshTenant(
      toTenantProviderContext(createSupabaseTenantContext({}))
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'TenantNotFound')
    );
  });

  it('refreshTenant fails when tenant missing', async () => {
    provider = createSupabaseTenantProvider({
      client: createMockClient({
        tenants: {
          getById: async () => ({ data: null, error: null }),
          getBySlug: async () => ({ data: null, error: null }),
          getByDomain: async () => ({ data: null, error: null })
        }
      })
    });
    const result = await provider.refreshTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'missing' })
      )
    );
    assert.equal(result.success, false);
  });
});

describe('Provider client error paths', () => {
  it('maps client error on getTenant', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient({
        tenants: {
          getById: async () => ({
            data: null,
            error: { message: 'tenant not found', status: 404 }
          }),
          getBySlug: async () => ({ data: null, error: null }),
          getByDomain: async () => ({ data: null, error: null })
        }
      })
    });
    const result = await provider.getTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'x' })
      )
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'TenantNotFound')
    );
  });

  it('maps thrown network error to ProviderUnavailable', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient({
        tenants: {
          getById: async () => {
            throw new Error('failed to fetch');
          },
          getBySlug: async () => ({ data: null, error: null }),
          getByDomain: async () => ({ data: null, error: null })
        }
      })
    });
    const result = await provider.getTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, false);
    assert.equal(result.status, 'stale');
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'ProviderUnavailable'
      )
    );
  });

  it('maps access denied client error', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient({
        memberships: {
          listByIdentity: async () => ({ data: [], error: null }),
          listByTenant: async () => ({ data: [], error: null }),
          getById: async () => ({ data: null, error: null }),
          validateAccess: async () => ({
            data: null,
            error: { message: 'forbidden', status: 403 }
          })
        }
      })
    });
    const result = await provider.validateAccess(
      toTenantProviderContext(
        createSupabaseTenantContext({
          identityId: 'identity-001',
          tenantId: 'tenant-demo-001'
        })
      )
    );
    assert.equal(result.status, 'denied');
  });

  it('maps camelCase tenant displayName', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient({
        tenants: {
          getById: async () => ({
            data: {
              id: 't1',
              slug: 's1',
              displayName: 'Camel Name'
            },
            error: null
          }),
          getBySlug: async () => ({ data: null, error: null }),
          getByDomain: async () => ({ data: null, error: null })
        }
      })
    });
    const result = await provider.getTenant(
      toTenantProviderContext(createSupabaseTenantContext({ tenantId: 't1' }))
    );
    assert.equal(result.tenant?.displayName, 'Camel Name');
  });
});

describe('Adapter integration', () => {
  it('createSupabaseTenantProviderRegistration uses supabase id', () => {
    const registration = createSupabaseTenantProviderRegistration();
    assert.equal(registration.id, SUPABASE_TENANT_PROVIDER_ID);
    assert.equal(registration.name, SUPABASE_TENANT_PROVIDER_NAME);
    assert.equal(registration.kind, 'registry');
    assert.equal(registration.providerRegistered, false);
  });

  it('registerSupabaseTenantProvider attaches to registry', () => {
    const registry = createTenantProviderRegistry(true);
    const provider = createSupabaseTenantProvider({
      client: createMockClient()
    });
    registerSupabaseTenantProvider(registry, provider);
    assert.equal(registry.hasProvider(SUPABASE_TENANT_PROVIDER_ID), true);
    assert.equal(
      registry.getRegistrationById(SUPABASE_TENANT_PROVIDER_ID)
        ?.providerRegistered,
      true
    );
  });

  it('createTenantAdapterWithSupabaseProvider resolves via adapter', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient()
    });
    const adapter = createTenantAdapterWithSupabaseProvider(provider);
    const result = await adapter.resolveTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.providerId, SUPABASE_TENANT_PROVIDER_ID);
  });

  it('attachSupabaseTenantProvider binds to existing adapter', async () => {
    const adapter = createTenantAdapter(createTenantProviderRegistry(true));
    const provider = createSupabaseTenantProvider({
      client: createMockClient()
    });
    attachSupabaseTenantProvider(adapter, provider);
    const result = await adapter.getTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, true);
  });

  it('adapter listMemberships delegates to supabase provider', async () => {
    const adapter = createTenantAdapterWithSupabaseProvider(
      createSupabaseTenantProvider({ client: createMockClient() })
    );
    const result = await adapter.listMemberships(
      toTenantProviderContext(
        createSupabaseTenantContext({ identityId: 'identity-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.memberships?.length, 1);
  });

  it('adapter validateAccess delegates to supabase provider', async () => {
    const adapter = createTenantAdapterWithSupabaseProvider(
      createSupabaseTenantProvider({ client: createMockClient() })
    );
    const result = await adapter.validateAccess(
      toTenantProviderContext(
        createSupabaseTenantContext({
          identityId: 'identity-001',
          tenantId: 'tenant-demo-001'
        })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.accessOutcome, 'allow');
  });

  it('adapter refreshTenant delegates to supabase provider', async () => {
    const adapter = createTenantAdapterWithSupabaseProvider(
      createSupabaseTenantProvider({ client: createMockClient() })
    );
    const result = await adapter.refreshTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ tenantId: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'refreshTenant');
  });

  it('register is idempotent when already registered', () => {
    const registry = createTenantProviderRegistry(false);
    const provider = createSupabaseTenantProvider({
      client: createMockClient()
    });
    registerSupabaseTenantProvider(registry, provider);
    registerSupabaseTenantProvider(registry, provider);
    assert.equal(registry.registeredProviderCount(), 1);
  });
});

describe('Additional resolution and mapping coverage', () => {
  it('resolveTenant by headerValue uses getById', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient()
    });
    const result = await provider.resolveTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ headerValue: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.tenant?.tenantId, 'tenant-demo-001');
  });

  it('resolveTenant by claimValue uses getById', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient()
    });
    const result = await provider.resolveTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ claimValue: 'tenant-demo-001' })
      )
    );
    assert.equal(result.success, true);
  });

  it('maps membership not found from client error on list', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient({
        memberships: {
          listByIdentity: async () => ({
            data: null,
            error: { message: 'membership not found', status: 404 }
          }),
          listByTenant: async () => ({ data: [], error: null }),
          getById: async () => ({ data: null, error: null }),
          validateAccess: async () => ({ data: null, error: null })
        }
      })
    });
    const result = await provider.listMemberships(
      toTenantProviderContext(
        createSupabaseTenantContext({ identityId: 'identity-001' })
      )
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'MembershipNotFound'
      )
    );
  });

  it('createSupabaseTenantResult freezes memberships', () => {
    const result = createSupabaseTenantResult({
      success: true,
      status: 'resolved',
      operation: 'listMemberships',
      memberships: [
        {
          id: 'm1',
          identityId: 'i1',
          tenantId: 't1',
          active: true
        }
      ],
      telemetry: {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        operation: 'listMemberships',
        providerId: SUPABASE_TENANT_PROVIDER_ID
      }
    });
    assert.throws(() => {
      result.memberships.push({
        id: 'm2',
        identityId: 'i2',
        tenantId: 't2',
        active: true
      });
    });
  });

  it('toTenantProviderResult embeds supabase payload in bag', () => {
    const mapped = toTenantProviderResult(
      createSupabaseTenantResult({
        success: true,
        status: 'resolved',
        operation: 'getTenant',
        tenant: {
          id: 'tenant-demo-001',
          slug: 'demo',
          displayName: 'Demo Tenant'
        },
        telemetry: {
          durationMs: 1,
          startedAt: '2026-07-22T00:00:00.000Z',
          endedAt: '2026-07-22T00:00:00.001Z',
          operation: 'getTenant',
          providerId: SUPABASE_TENANT_PROVIDER_ID
        }
      })
    );
    assert.equal(mapped.bag?.supabaseTenant?.id, 'tenant-demo-001');
  });

  it('mapSupabaseTenantErrorMessageToCode defaults to TenantError', () => {
    assert.equal(
      mapSupabaseTenantErrorMessageToCode('something else'),
      'TenantError'
    );
  });

  it('mapSupabaseTenantError maps AccessDenied text', () => {
    const error = mapSupabaseTenantError({ message: 'permission denied' });
    assert.ok(error instanceof AccessDenied);
  });

  it('mapSupabaseTenantError maps ProviderUnavailable status 500', () => {
    const error = mapSupabaseTenantError({
      message: 'internal',
      status: 500
    });
    assert.ok(error instanceof TenantProviderUnavailable);
  });

  it('assertSupabaseTenantClient rejects missing tenants object', () => {
    assert.throws(
      () =>
        assertSupabaseTenantClient({
          memberships: {
            listByIdentity: async () => ({}),
            listByTenant: async () => ({}),
            getById: async () => ({}),
            validateAccess: async () => ({})
          }
        }),
      /client.tenants zorunludur/
    );
  });

  it('assertSupabaseTenantClient rejects missing memberships object', () => {
    assert.throws(
      () =>
        assertSupabaseTenantClient({
          tenants: {
            getById: async () => ({}),
            getBySlug: async () => ({}),
            getByDomain: async () => ({})
          }
        }),
      /client.memberships zorunludur/
    );
  });

  it('preserves bag on successful resolveTenant', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient()
    });
    const result = await provider.resolveTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({
          tenantId: 'tenant-demo-001',
          bag: { requestId: 'req-9' }
        })
      )
    );
    assert.equal(result.bag?.requestId, 'req-9');
  });

  it('validateAccess without data returns AccessDenied', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient({
        memberships: {
          listByIdentity: async () => ({ data: [], error: null }),
          listByTenant: async () => ({ data: [], error: null }),
          getById: async () => ({ data: null, error: null }),
          validateAccess: async () => ({ data: null, error: null })
        }
      })
    });
    const result = await provider.validateAccess(
      toTenantProviderContext(
        createSupabaseTenantContext({
          identityId: 'identity-001',
          tenantId: 'tenant-demo-001'
        })
      )
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'AccessDenied')
    );
  });

  it('createTenantAdapterWithSupabaseProvider can skip builtins', () => {
    const adapter = createTenantAdapterWithSupabaseProvider(
      createSupabaseTenantProvider({ client: createMockClient() }),
      { seedBuiltins: false }
    );
    assert.equal(
      adapter.getRegistry().hasProvider(SUPABASE_TENANT_PROVIDER_ID),
      true
    );
    assert.equal(adapter.getRegistry().registrationCount(), 1);
  });

  it('membership row camelCase fields are normalized', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient({
        memberships: {
          listByIdentity: async () => ({
            data: [
              {
                id: 'm-camel',
                identityId: 'identity-camel',
                tenantId: 'tenant-demo-001',
                roleLabel: 'owner',
                active: true
              }
            ],
            error: null
          }),
          listByTenant: async () => ({ data: [], error: null }),
          getById: async () => ({ data: null, error: null }),
          validateAccess: async () => ({ data: null, error: null })
        }
      })
    });
    const result = await provider.listMemberships(
      toTenantProviderContext(
        createSupabaseTenantContext({ identityId: 'identity-camel' })
      )
    );
    assert.equal(result.memberships?.[0].roleLabel, 'owner');
    assert.equal(result.memberships?.[0].identityId, 'identity-camel');
  });

  it('resolveTenant membership path fails when membership missing', async () => {
    const provider = createSupabaseTenantProvider({
      client: createMockClient({
        memberships: {
          listByIdentity: async () => ({ data: [], error: null }),
          listByTenant: async () => ({ data: [], error: null }),
          getById: async () => ({ data: null, error: null }),
          validateAccess: async () => ({ data: null, error: null })
        }
      })
    });
    const result = await provider.resolveTenant(
      toTenantProviderContext(
        createSupabaseTenantContext({ membershipId: 'missing-m' })
      )
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'MembershipNotFound'
      )
    );
  });
});
