/**
 * Tenant Management Runtime — PR-201B (en az 20 unit test)
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
  createPlatformAdminRuntime,
  createPlatformAdminContext,
  createTenantManagementRuntime,
  createTenantRegistryRuntime,
  createTenantManagementContext,
  validateTenantManagementContext,
  resolveRequestedTenants,
  buildTenantSummary,
  buildTenantSummaryItems,
  toTenantProjection,
  BUILTIN_TENANT_DEFINITIONS,
  BUILTIN_TENANT_DEFINITION_COUNT,
  getBuiltinTenantDefinition,
  PIPELINE_BAG_TENANT_MANAGEMENT_RESULT_KEY
} = await import('../../src/platform-admin/index.ts');

describe('TenantRegistryRuntime', () => {
  let registry;

  beforeEach(() => {
    registry = createTenantRegistryRuntime(true);
  });

  it('seeds all builtin tenants', () => {
    assert.equal(registry.count(), BUILTIN_TENANT_DEFINITION_COUNT);
    assert.equal(BUILTIN_TENANT_DEFINITIONS.length, 5);
  });

  it('getById returns demo tenant', () => {
    const tenant = registry.getById('tenant-demo-001');
    assert.ok(tenant);
    assert.equal(tenant.identity.slug, 'demo-istebul');
    assert.equal(tenant.plan, 'pro');
    assert.equal(tenant.status, 'active');
  });

  it('getBuiltinTenantDefinition resolves enterprise tenant', () => {
    const tenant = getBuiltinTenantDefinition('tenant-ent-004');
    assert.ok(tenant);
    assert.equal(tenant.plan, 'enterprise');
    assert.equal(tenant.organization.name, 'North Holding');
  });

  it('register adds a new tenant', () => {
    registry.register({
      identity: {
        id: 'tenant-custom-099',
        slug: 'custom',
        displayName: 'Custom'
      },
      organization: { name: 'Custom Org', countryCode: 'TR' },
      subscriptionStatus: 'none',
      plan: 'free',
      status: 'pending',
      limits: {
        maxUsers: 1,
        maxAiRequestsPerMonth: 10,
        maxStorageMb: 64
      },
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z'
    });
    assert.equal(registry.count(), BUILTIN_TENANT_DEFINITION_COUNT + 1);
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_TENANT_DEFINITIONS[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          identity: { id: '', slug: 'x', displayName: 'X' },
          organization: { name: 'X', countryCode: 'TR' },
          subscriptionStatus: 'none',
          plan: 'free',
          status: 'pending',
          limits: {
            maxUsers: 1,
            maxAiRequestsPerMonth: 1,
            maxStorageMb: 1
          },
          createdAt: '2026-07-21T00:00:00.000Z',
          updatedAt: '2026-07-21T00:00:00.000Z'
        }),
      /identity.id zorunludur/
    );
  });

  it('unregister removes a tenant', () => {
    assert.ok(registry.unregister('tenant-free-003'));
    assert.equal(registry.count(), BUILTIN_TENANT_DEFINITION_COUNT - 1);
    assert.equal(registry.getById('tenant-free-003'), undefined);
  });

  it('getByStatus filters active tenants', () => {
    const active = registry.getByStatus('active');
    assert.ok(active.length >= 2);
    assert.ok(active.every((t) => t.status === 'active'));
  });
});

describe('TenantManagementContext', () => {
  it('defaults locale to tr', () => {
    const ctx = createTenantManagementContext();
    assert.equal(ctx.locale, 'tr');
  });

  it('accepts en locale and actorId', () => {
    const ctx = createTenantManagementContext({
      locale: 'en',
      actorId: 'ops-1'
    });
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.actorId, 'ops-1');
  });
});

describe('validateTenantManagementContext', () => {
  let registry;

  beforeEach(() => {
    registry = createTenantRegistryRuntime(true);
  });

  it('passes for valid default context', () => {
    const issues = validateTenantManagementContext(
      createTenantManagementContext(),
      registry
    );
    assert.equal(issues.length, 0);
  });

  it('warns on empty tenantIds', () => {
    const issues = validateTenantManagementContext(
      createTenantManagementContext({ tenantIds: [] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_TENANT_IDS'));
  });

  it('warns on unknown tenant id', () => {
    const issues = validateTenantManagementContext(
      createTenantManagementContext({
        tenantIds: ['tenant-demo-001', 'missing']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_TENANT_ID'));
  });

  it('warns when platform admin result lacks tenant module', () => {
    const platform = createPlatformAdminRuntime().execute(
      createPlatformAdminContext({ moduleIds: ['users'] })
    );
    const issues = validateTenantManagementContext(
      createTenantManagementContext({ platformAdminResult: platform }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'TENANT_MODULE_NOT_PROJECTED'));
  });
});

describe('resolveRequestedTenants', () => {
  let registry;

  beforeEach(() => {
    registry = createTenantRegistryRuntime(true);
  });

  it('returns all tenants when tenantIds omitted', () => {
    const { tenants, requestedCount, unavailableCount } =
      resolveRequestedTenants(createTenantManagementContext(), registry);
    assert.equal(tenants.length, BUILTIN_TENANT_DEFINITION_COUNT);
    assert.equal(requestedCount, BUILTIN_TENANT_DEFINITION_COUNT);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested tenant ids', () => {
    const { tenants, requestedCount, unavailableCount } =
      resolveRequestedTenants(
        createTenantManagementContext({
          tenantIds: ['tenant-demo-001', 'tenant-trial-002']
        }),
        registry
      );
    assert.equal(tenants.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
  });

  it('counts unavailable tenants for unknown ids', () => {
    const { tenants, unavailableCount } = resolveRequestedTenants(
      createTenantManagementContext({
        tenantIds: ['tenant-demo-001', 'ghost']
      }),
      registry
    );
    assert.equal(tenants.length, 1);
    assert.equal(unavailableCount, 1);
  });
});

describe('toTenantProjection', () => {
  it('projects full tenant model fields', () => {
    const def = getBuiltinTenantDefinition('tenant-demo-001');
    assert.ok(def);
    const projection = toTenantProjection(def);
    assert.equal(projection.projected, true);
    assert.equal(projection.identity.id, 'tenant-demo-001');
    assert.equal(projection.organization.countryCode, 'TR');
    assert.equal(projection.subscriptionStatus, 'active');
    assert.equal(projection.plan, 'pro');
    assert.equal(projection.status, 'active');
    assert.equal(projection.limits.maxUsers, 50);
    assert.ok(projection.createdAt);
    assert.ok(projection.updatedAt);
  });
});

describe('TenantSummary', () => {
  it('buildTenantSummary aggregates status and plan counts', () => {
    const registry = createTenantRegistryRuntime(true);
    const projections = registry.getAll().map(toTenantProjection);
    const summary = buildTenantSummary(projections, projections.length, 0, false);
    assert.equal(summary.success, true);
    assert.equal(summary.tenantCount, projections.length);
    assert.ok(summary.statusCounts.active >= 1);
    assert.ok((summary.planCounts.pro ?? 0) >= 1);
  });

  it('buildTenantSummaryItems includes tenant-count', () => {
    const summary = buildTenantSummary([], 0, 0, false);
    const items = buildTenantSummaryItems(summary, 'tr');
    assert.ok(items.some((i) => i.key === 'tenant-count'));
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'tr'));
  });
});

describe('TenantManagementRuntime', () => {
  let runtime;

  beforeEach(() => {
    runtime = createTenantManagementRuntime();
  });

  it('executes full pipeline and returns TenantManagementResult', () => {
    const result = runtime.execute(createTenantManagementContext());
    assert.equal(result.tenants.length, BUILTIN_TENANT_DEFINITION_COUNT);
    assert.equal(result.summary.tenantCount, BUILTIN_TENANT_DEFINITION_COUNT);
    assert.equal(result.summary.success, true);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.summaryItems.length > 0);
  });

  it('records telemetry with duration, tenant count, summary items', () => {
    const result = runtime.execute(createTenantManagementContext());
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.tenantCount, result.tenants.length);
    assert.equal(
      result.telemetry.summaryItemCount,
      result.summaryItems.length
    );
  });

  it('filters tenants by tenantIds', () => {
    const result = runtime.execute(
      createTenantManagementContext({
        tenantIds: ['tenant-ent-004', 'tenant-susp-005']
      })
    );
    assert.equal(result.tenants.length, 2);
    assert.deepEqual(
      result.tenants.map((t) => t.identity.id).sort(),
      ['tenant-ent-004', 'tenant-susp-005']
    );
  });

  it('accepts upstream PlatformAdminResult', () => {
    const platform = createPlatformAdminRuntime().execute(
      createPlatformAdminContext({ moduleIds: ['tenant'] })
    );
    const result = runtime.execute(
      createTenantManagementContext({ platformAdminResult: platform })
    );
    assert.equal(result.summary.success, true);
    assert.equal(result.tenants.length, BUILTIN_TENANT_DEFINITION_COUNT);
    assert.ok(
      !result.validationIssues.some(
        (i) => i.code === 'TENANT_MODULE_NOT_PROJECTED'
      )
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(runtime.getRegistry().count(), BUILTIN_TENANT_DEFINITION_COUNT);
  });

  it('exports pipeline bag key constant', () => {
    assert.equal(
      PIPELINE_BAG_TENANT_MANAGEMENT_RESULT_KEY,
      'tenantManagementResult'
    );
  });

  it('reports unavailable count for partial tenant requests', () => {
    const result = runtime.execute(
      createTenantManagementContext({
        tenantIds: ['tenant-demo-001', 'ghost']
      })
    );
    assert.equal(result.summary.unavailableCount, 1);
    assert.equal(result.tenants.length, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_TENANT_ID')
    );
  });
});
