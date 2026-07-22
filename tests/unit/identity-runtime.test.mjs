/**
 * Identity Runtime — PR-203A (en az 40 unit test)
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
  createIdentityRuntime,
  createIdentityRegistry,
  createIdentityRegistryRuntime,
  createIdentityContext,
  validateIdentityContext,
  resolveRequestedIdentities,
  buildIdentitySummary,
  buildIdentitySummaryItems,
  toIdentityProjection,
  BUILTIN_IDENTITY_MODULES,
  BUILTIN_IDENTITY_MODULE_COUNT,
  getBuiltinIdentityModule,
  PIPELINE_BAG_IDENTITY_RESULT_KEY,
  IdentityRegistry,
  IdentityRegistryRuntime,
  nowMs,
  startStageTimer,
  endStageTimer
} = await import('../../src/identity/index.ts');

describe('IdentityRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createIdentityRegistry(true);
  });

  it('seeds all 6 builtin identity modules', () => {
    assert.equal(registry.count(), 6);
    assert.equal(BUILTIN_IDENTITY_MODULE_COUNT, 6);
    assert.equal(BUILTIN_IDENTITY_MODULES.length, 6);
  });

  it('returns identities sorted by order', () => {
    const identities = registry.getAll();
    assert.equal(identities[0].id, 'identity-platform-owner-001');
    assert.equal(identities[identities.length - 1].id, 'identity-suspended-006');
    for (let i = 1; i < identities.length; i++) {
      assert.ok(identities[i].order >= identities[i - 1].order);
    }
  });

  it('getById returns platform owner identity', () => {
    const owner = registry.getById('identity-platform-owner-001');
    assert.ok(owner);
    assert.equal(owner.user.displayName, 'Platform Owner');
    assert.equal(owner.roles[0].scope, 'platform');
  });

  it('getBuiltinIdentityModule resolves business admin', () => {
    const mod = getBuiltinIdentityModule('identity-business-admin-003');
    assert.ok(mod);
    assert.equal(mod.user.displayName, 'Business Admin');
    assert.equal(mod.roles.length, 2);
  });

  it('register adds a new identity module', () => {
    registry.register({
      id: 'identity-custom-099',
      user: {
        id: 'user-custom-099',
        displayName: 'Custom User'
      },
      tenant: {
        id: 'tenant-custom',
        slug: 'custom',
        displayName: 'Custom Tenant'
      },
      roles: [{ id: 'viewer', name: 'Viewer', scope: 'tenant' }],
      permissions: [{ id: 'p1', action: 'read', resource: 'dashboard' }],
      claims: { locale: 'tr' },
      sessionReference: { sessionId: 'sess-custom' },
      status: 'inactive',
      order: 99,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z'
    });
    assert.equal(registry.count(), 7);
    assert.ok(registry.getById('identity-custom-099'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_IDENTITY_MODULES[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          id: '',
          user: { id: 'u', displayName: 'X' },
          tenant: { id: 't', slug: 't', displayName: 'T' },
          roles: [],
          permissions: [],
          claims: {},
          sessionReference: { sessionId: 's' },
          status: 'active',
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /id zorunludur/
    );
  });

  it('register throws on missing user.id', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'identity-bad-user',
          user: { id: '', displayName: 'X' },
          tenant: { id: 't', slug: 't', displayName: 'T' },
          roles: [],
          permissions: [],
          claims: {},
          sessionReference: { sessionId: 's' },
          status: 'active',
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /user\.id zorunludur/
    );
  });

  it('register throws on missing tenant.id', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'identity-bad-tenant',
          user: { id: 'u', displayName: 'X' },
          tenant: { id: '', slug: 't', displayName: 'T' },
          roles: [],
          permissions: [],
          claims: {},
          sessionReference: { sessionId: 's' },
          status: 'active',
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /tenant\.id zorunludur/
    );
  });

  it('unregister removes an identity', () => {
    assert.ok(registry.unregister('identity-viewer-005'));
    assert.equal(registry.count(), 5);
    assert.equal(registry.getById('identity-viewer-005'), undefined);
  });

  it('getByTenantId filters demo tenant identities', () => {
    const demo = registry.getByTenantId('tenant-demo-001');
    assert.equal(demo.length, 2);
    assert.ok(demo.every((item) => item.tenant.id === 'tenant-demo-001'));
  });

  it('getByStatus filters active identities', () => {
    const active = registry.getByStatus('active');
    assert.ok(active.length >= 3);
    assert.ok(active.every((item) => item.status === 'active'));
  });

  it('clear empties the registry', () => {
    registry.clear();
    assert.equal(registry.count(), 0);
  });

  it('roleCount and permissionCount aggregate builtins', () => {
    assert.ok(registry.roleCount() >= 6);
    assert.ok(registry.permissionCount() >= 6);
  });

  it('createIdentityRegistryRuntime aliases createIdentityRegistry', () => {
    const aliased = createIdentityRegistryRuntime(false);
    assert.ok(aliased instanceof IdentityRegistry);
    assert.equal(aliased.count(), 0);
  });

  it('IdentityRegistryRuntime is an alias of IdentityRegistry', () => {
    assert.equal(IdentityRegistryRuntime, IdentityRegistry);
  });
});

describe('IdentityContext', () => {
  it('createIdentityContext defaults locale to tr', () => {
    const ctx = createIdentityContext();
    assert.equal(ctx.locale, 'tr');
  });

  it('createIdentityContext accepts en locale', () => {
    const ctx = createIdentityContext({ locale: 'en' });
    assert.equal(ctx.locale, 'en');
  });

  it('createIdentityContext accepts identityIds and tenantId', () => {
    const ctx = createIdentityContext({
      identityIds: ['identity-platform-owner-001'],
      tenantId: 'tenant-platform',
      actorId: 'actor-1'
    });
    assert.deepEqual(ctx.identityIds, ['identity-platform-owner-001']);
    assert.equal(ctx.tenantId, 'tenant-platform');
    assert.equal(ctx.actorId, 'actor-1');
  });
});

describe('validateIdentityContext', () => {
  let registry;

  beforeEach(() => {
    registry = createIdentityRegistry(true);
  });

  it('passes for valid default context', () => {
    const ctx = createIdentityContext();
    const issues = validateIdentityContext(ctx, registry);
    assert.equal(issues.length, 0);
  });

  it('errors on invalid locale', () => {
    const ctx = createIdentityContext({ locale: 'de' });
    const issues = validateIdentityContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'INVALID_LOCALE'));
    assert.ok(
      issues.some((i) => i.code === 'INVALID_LOCALE' && i.severity === 'error')
    );
  });

  it('warns on empty identityIds array', () => {
    const ctx = createIdentityContext({ identityIds: [] });
    const issues = validateIdentityContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'EMPTY_IDENTITY_IDS'));
  });

  it('warns on unknown identity id', () => {
    const ctx = createIdentityContext({
      identityIds: ['identity-platform-owner-001', 'nonexistent']
    });
    const issues = validateIdentityContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_IDENTITY_ID'));
  });

  it('warns on duplicate identity id', () => {
    const ctx = createIdentityContext({
      identityIds: [
        'identity-platform-owner-001',
        'identity-platform-owner-001'
      ]
    });
    const issues = validateIdentityContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'DUPLICATE_IDENTITY_ID'));
  });

  it('errors on invalid blank identity id', () => {
    const ctx = createIdentityContext({ identityIds: ['  '] });
    const issues = validateIdentityContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'INVALID_IDENTITY_ID'));
  });

  it('warns on empty actorId', () => {
    const ctx = createIdentityContext({ actorId: '   ' });
    const issues = validateIdentityContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });

  it('errors on empty tenantId', () => {
    const ctx = createIdentityContext({ tenantId: '  ' });
    const issues = validateIdentityContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'EMPTY_TENANT_ID'));
  });

  it('warns on unknown tenantId', () => {
    const ctx = createIdentityContext({ tenantId: 'tenant-missing' });
    const issues = validateIdentityContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_TENANT_ID'));
  });
});

describe('resolveRequestedIdentities', () => {
  let registry;

  beforeEach(() => {
    registry = createIdentityRegistry(true);
  });

  it('returns all identities when identityIds omitted', () => {
    const ctx = createIdentityContext();
    const { identities, requestedCount, unavailableCount } =
      resolveRequestedIdentities(ctx, registry);
    assert.equal(identities.length, 6);
    assert.equal(requestedCount, 6);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested identity ids', () => {
    const ctx = createIdentityContext({
      identityIds: [
        'identity-platform-owner-001',
        'identity-business-admin-003'
      ]
    });
    const { identities, requestedCount, unavailableCount } =
      resolveRequestedIdentities(ctx, registry);
    assert.equal(identities.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
    assert.deepEqual(
      identities.map((m) => m.id),
      ['identity-platform-owner-001', 'identity-business-admin-003']
    );
  });

  it('counts unavailable identities for unknown ids', () => {
    const ctx = createIdentityContext({
      identityIds: ['identity-platform-owner-001', 'missing']
    });
    const { identities, unavailableCount } = resolveRequestedIdentities(
      ctx,
      registry
    );
    assert.equal(identities.length, 1);
    assert.equal(unavailableCount, 1);
  });

  it('filters by tenantId', () => {
    const ctx = createIdentityContext({ tenantId: 'tenant-demo-001' });
    const { identities } = resolveRequestedIdentities(ctx, registry);
    assert.equal(identities.length, 2);
    assert.ok(identities.every((item) => item.tenant.id === 'tenant-demo-001'));
  });

  it('combines tenantId with identityIds', () => {
    const ctx = createIdentityContext({
      tenantId: 'tenant-demo-001',
      identityIds: [
        'identity-business-admin-003',
        'identity-platform-owner-001'
      ]
    });
    const { identities, unavailableCount } = resolveRequestedIdentities(
      ctx,
      registry
    );
    assert.equal(identities.length, 1);
    assert.equal(identities[0].id, 'identity-business-admin-003');
    assert.equal(unavailableCount, 1);
  });
});

describe('toIdentityProjection', () => {
  it('projects identity module with projected flag', () => {
    const projection = toIdentityProjection(BUILTIN_IDENTITY_MODULES[0]);
    assert.equal(projection.identityId, 'identity-platform-owner-001');
    assert.equal(projection.projected, true);
    assert.equal(projection.user.id, 'user-owner-001');
    assert.equal(projection.tenant.slug, 'istebul-platform');
    assert.equal(projection.roles.length, 1);
    assert.equal(projection.permissions.length, 2);
    assert.equal(projection.sessionReference.sessionId, 'sess-ref-owner-001');
    assert.equal(projection.status, 'active');
  });

  it('copies claims without mutation of source', () => {
    const source = BUILTIN_IDENTITY_MODULES[2];
    const projection = toIdentityProjection(source);
    assert.equal(projection.claims.audience, 'business-admin');
    assert.equal(projection.claims.tenantId, 'tenant-demo-001');
    assert.notEqual(projection.claims, source.claims);
  });

  it('freezes role and permission arrays in projection', () => {
    const projection = toIdentityProjection(BUILTIN_IDENTITY_MODULES[2]);
    assert.ok(Object.isFrozen(projection.roles));
    assert.ok(Object.isFrozen(projection.permissions));
    assert.ok(Object.isFrozen(projection.claims));
  });
});

describe('buildIdentitySummary', () => {
  it('builds summary with identity/role/permission counts', () => {
    const projections = BUILTIN_IDENTITY_MODULES.map((m) =>
      toIdentityProjection(m)
    );
    const summary = buildIdentitySummary(projections, 6, 0, false);
    assert.equal(summary.success, true);
    assert.equal(summary.identityCount, 6);
    assert.ok(summary.roleCount >= 6);
    assert.ok(summary.permissionCount >= 6);
    assert.equal(summary.requestedCount, 6);
    assert.equal(summary.unavailableCount, 0);
    assert.ok(summary.statusCounts.active >= 1);
    assert.ok(summary.statusCounts.suspended >= 1);
    assert.ok(summary.statusCounts.pending >= 1);
  });

  it('marks success false when hasErrors', () => {
    const summary = buildIdentitySummary([], 0, 0, true);
    assert.equal(summary.success, false);
    assert.equal(summary.identityCount, 0);
  });

  it('marks success false when no projections', () => {
    const summary = buildIdentitySummary([], 2, 2, false);
    assert.equal(summary.success, false);
    assert.equal(summary.unavailableCount, 2);
  });
});

describe('buildIdentitySummaryItems', () => {
  it('includes locale identity role permission keys', () => {
    const ctx = createIdentityContext({ actorId: 'actor-x' });
    const projections = [toIdentityProjection(BUILTIN_IDENTITY_MODULES[0])];
    const summary = buildIdentitySummary(projections, 1, 0, false);
    const items = buildIdentitySummaryItems(ctx, summary, []);
    const keys = items.map((item) => item.key);
    assert.ok(keys.includes('locale'));
    assert.ok(keys.includes('identity-count'));
    assert.ok(keys.includes('role-count'));
    assert.ok(keys.includes('permission-count'));
    assert.ok(keys.includes('actor-id'));
    assert.ok(keys.includes('success'));
  });

  it('includes tenant-id when present', () => {
    const ctx = createIdentityContext({ tenantId: 'tenant-demo-001' });
    const summary = buildIdentitySummary([], 0, 0, false);
    const items = buildIdentitySummaryItems(ctx, summary, []);
    assert.ok(items.some((item) => item.key === 'tenant-id'));
  });

  it('reports has-errors from validation issues', () => {
    const ctx = createIdentityContext();
    const summary = buildIdentitySummary([], 0, 0, true);
    const items = buildIdentitySummaryItems(ctx, summary, [
      { code: 'INVALID_LOCALE', message: 'x', severity: 'error' }
    ]);
    const hasErrors = items.find((item) => item.key === 'has-errors');
    assert.equal(hasErrors.value, true);
  });
});

describe('IdentityRuntime.execute', () => {
  it('executes full pipeline for default context', () => {
    const runtime = createIdentityRuntime();
    const result = runtime.execute(createIdentityContext());
    assert.equal(result.identities.length, 6);
    assert.equal(result.summary.success, true);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.telemetry.durationMs >= 0);
    assert.equal(result.telemetry.identityCount, 6);
    assert.ok(result.telemetry.roleCount >= 6);
    assert.ok(result.telemetry.permissionCount >= 6);
    assert.ok(result.telemetry.summaryItemCount >= 9);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
  });

  it('projects only requested identities', () => {
    const runtime = createIdentityRuntime();
    const result = runtime.execute(
      createIdentityContext({
        identityIds: ['identity-tenant-member-004']
      })
    );
    assert.equal(result.identities.length, 1);
    assert.equal(result.identities[0].identityId, 'identity-tenant-member-004');
    assert.equal(result.summary.identityCount, 1);
    assert.equal(result.summary.roleCount, 1);
    assert.equal(result.summary.permissionCount, 1);
  });

  it('filters by tenant and reports warnings for unknown ids', () => {
    const runtime = createIdentityRuntime();
    const result = runtime.execute(
      createIdentityContext({
        tenantId: 'tenant-demo-001',
        identityIds: ['identity-business-admin-003', 'ghost']
      })
    );
    assert.equal(result.identities.length, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_IDENTITY_ID')
    );
    assert.equal(result.summary.unavailableCount, 1);
  });

  it('fails summary on invalid locale error', () => {
    const runtime = createIdentityRuntime();
    const result = runtime.execute(createIdentityContext({ locale: 'xx' }));
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some(
        (i) => i.code === 'INVALID_LOCALE' && i.severity === 'error'
      )
    );
  });

  it('exposes registry via getRegistry', () => {
    const runtime = createIdentityRuntime();
    assert.equal(runtime.getRegistry().count(), 6);
  });

  it('accepts custom empty registry', () => {
    const empty = createIdentityRegistry(false);
    const runtime = createIdentityRuntime(empty);
    const result = runtime.execute(createIdentityContext());
    assert.equal(result.identities.length, 0);
    assert.equal(result.summary.success, false);
    assert.equal(result.telemetry.identityCount, 0);
  });

  it('all projections have projected true', () => {
    const runtime = createIdentityRuntime();
    const result = runtime.execute(createIdentityContext());
    assert.ok(result.identities.every((item) => item.projected === true));
  });

  it('summaryItems include telemetry-aligned counts', () => {
    const runtime = createIdentityRuntime();
    const result = runtime.execute(createIdentityContext({ locale: 'en' }));
    const identityCount = result.summaryItems.find(
      (item) => item.key === 'identity-count'
    );
    const roleCount = result.summaryItems.find(
      (item) => item.key === 'role-count'
    );
    const permissionCount = result.summaryItems.find(
      (item) => item.key === 'permission-count'
    );
    assert.equal(identityCount.value, result.telemetry.identityCount);
    assert.equal(roleCount.value, result.telemetry.roleCount);
    assert.equal(permissionCount.value, result.telemetry.permissionCount);
  });
});

describe('Identity telemetry helpers', () => {
  it('PIPELINE_BAG_IDENTITY_RESULT_KEY is identityResult', () => {
    assert.equal(PIPELINE_BAG_IDENTITY_RESULT_KEY, 'identityResult');
  });

  it('nowMs returns a finite number', () => {
    assert.ok(Number.isFinite(nowMs()));
  });

  it('startStageTimer and endStageTimer measure duration', () => {
    const timer = startStageTimer();
    assert.ok(timer.startedAt);
    const { endedAt, durationMs } = endStageTimer(timer);
    assert.ok(endedAt);
    assert.ok(durationMs >= 0);
  });
});

describe('Identity model shape', () => {
  it('builtin modules include User Tenant Role Permission Claims SessionReference', () => {
    for (const module of BUILTIN_IDENTITY_MODULES) {
      assert.ok(module.user.id);
      assert.ok(module.tenant.id);
      assert.ok(module.tenant.slug);
      assert.ok(Array.isArray(module.roles));
      assert.ok(Array.isArray(module.permissions));
      assert.ok(module.claims);
      assert.ok(module.sessionReference.sessionId);
      assert.ok(module.status);
    }
  });

  it('business admin identity has dual roles', () => {
    const biz = getBuiltinIdentityModule('identity-business-admin-003');
    assert.ok(biz);
    const scopes = biz.roles.map((r) => r.scope);
    assert.ok(scopes.includes('business'));
    assert.ok(scopes.includes('tenant'));
  });

  it('suspended identity has empty permissions', () => {
    const suspended = getBuiltinIdentityModule('identity-suspended-006');
    assert.ok(suspended);
    assert.equal(suspended.status, 'suspended');
    assert.equal(suspended.permissions.length, 0);
    assert.equal(suspended.claims.suspended, true);
  });
});
