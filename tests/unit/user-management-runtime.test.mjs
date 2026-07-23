/**
 * User Management Runtime — PR-201C (en az 20 unit test)
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
  createUserManagementRuntime,
  createUserRegistryRuntime,
  createUserManagementContext,
  validateUserManagementContext,
  resolveRequestedUsers,
  buildUserSummary,
  buildUserSummaryItems,
  toUserProjection,
  BUILTIN_USER_DEFINITIONS,
  BUILTIN_USER_DEFINITION_COUNT,
  getBuiltinUserDefinition,
  PIPELINE_BAG_USER_MANAGEMENT_RESULT_KEY
} = await import('../../src/platform-admin/index.ts');

describe('UserRegistryRuntime', () => {
  let registry;

  beforeEach(() => {
    registry = createUserRegistryRuntime(true);
  });

  it('seeds all builtin users', () => {
    assert.equal(registry.count(), BUILTIN_USER_DEFINITION_COUNT);
    assert.equal(BUILTIN_USER_DEFINITIONS.length, 6);
  });

  it('getById returns platform owner', () => {
    const user = registry.getById('user-owner-001');
    assert.ok(user);
    assert.equal(user.displayName, 'Platform Owner');
    assert.equal(user.role, 'platform-owner');
    assert.equal(user.status, 'active');
  });

  it('getBuiltinUserDefinition resolves support user', () => {
    const user = getBuiltinUserDefinition('user-support-005');
    assert.ok(user);
    assert.equal(user.role, 'support');
    assert.equal(user.email, 'support@istebul.example');
  });

  it('register adds a new user', () => {
    registry.register({
      identity: { id: 'user-custom-099', username: 'custom' },
      displayName: 'Custom User',
      email: 'custom@example.com',
      role: 'viewer',
      tenantReference: { tenantId: 'tenant-demo-001' },
      status: 'invited',
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z'
    });
    assert.equal(registry.count(), BUILTIN_USER_DEFINITION_COUNT + 1);
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_USER_DEFINITIONS[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          identity: { id: '' },
          displayName: 'X',
          email: 'x@example.com',
          role: 'viewer',
          tenantReference: { tenantId: 't1' },
          status: 'invited',
          createdAt: '2026-07-21T00:00:00.000Z',
          updatedAt: '2026-07-21T00:00:00.000Z'
        }),
      /identity.id zorunludur/
    );
  });

  it('unregister removes a user', () => {
    assert.ok(registry.unregister('user-viewer-006'));
    assert.equal(registry.count(), BUILTIN_USER_DEFINITION_COUNT - 1);
    assert.equal(registry.getById('user-viewer-006'), undefined);
  });

  it('getByTenantId filters users for a tenant', () => {
    const users = registry.getByTenantId('tenant-trial-002');
    assert.equal(users.length, 2);
    assert.ok(
      users.every((u) => u.tenantReference.tenantId === 'tenant-trial-002')
    );
  });
});

describe('UserManagementContext', () => {
  it('defaults locale to tr', () => {
    const ctx = createUserManagementContext();
    assert.equal(ctx.locale, 'tr');
  });

  it('accepts en locale and actorId', () => {
    const ctx = createUserManagementContext({
      locale: 'en',
      actorId: 'ops-1'
    });
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.actorId, 'ops-1');
  });
});

describe('validateUserManagementContext', () => {
  let registry;

  beforeEach(() => {
    registry = createUserRegistryRuntime(true);
  });

  it('passes for valid default context', () => {
    const issues = validateUserManagementContext(
      createUserManagementContext(),
      registry
    );
    assert.equal(issues.length, 0);
  });

  it('warns on empty userIds', () => {
    const issues = validateUserManagementContext(
      createUserManagementContext({ userIds: [] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_USER_IDS'));
  });

  it('warns on unknown user id', () => {
    const issues = validateUserManagementContext(
      createUserManagementContext({
        userIds: ['user-owner-001', 'missing']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_USER_ID'));
  });

  it('warns when platform admin result lacks users module', () => {
    const platform = createPlatformAdminRuntime().execute(
      createPlatformAdminContext({ moduleIds: ['tenant'] })
    );
    const issues = validateUserManagementContext(
      createUserManagementContext({ platformAdminResult: platform }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'USERS_MODULE_NOT_PROJECTED'));
  });
});

describe('resolveRequestedUsers', () => {
  let registry;

  beforeEach(() => {
    registry = createUserRegistryRuntime(true);
  });

  it('returns all users when userIds omitted', () => {
    const { users, requestedCount, unavailableCount } = resolveRequestedUsers(
      createUserManagementContext(),
      registry
    );
    assert.equal(users.length, BUILTIN_USER_DEFINITION_COUNT);
    assert.equal(requestedCount, BUILTIN_USER_DEFINITION_COUNT);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested user ids', () => {
    const { users, requestedCount, unavailableCount } = resolveRequestedUsers(
      createUserManagementContext({
        userIds: ['user-owner-001', 'user-admin-002']
      }),
      registry
    );
    assert.equal(users.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
  });

  it('filters by tenantId', () => {
    const { users } = resolveRequestedUsers(
      createUserManagementContext({ tenantId: 'tenant-demo-001' }),
      registry
    );
    assert.equal(users.length, 2);
    assert.ok(
      users.every((u) => u.tenantReference.tenantId === 'tenant-demo-001')
    );
  });

  it('counts unavailable users for unknown ids', () => {
    const { users, unavailableCount } = resolveRequestedUsers(
      createUserManagementContext({
        userIds: ['user-owner-001', 'ghost']
      }),
      registry
    );
    assert.equal(users.length, 1);
    assert.equal(unavailableCount, 1);
  });
});

describe('toUserProjection', () => {
  it('projects full user model fields', () => {
    const def = getBuiltinUserDefinition('user-owner-001');
    assert.ok(def);
    const projection = toUserProjection(def);
    assert.equal(projection.projected, true);
    assert.equal(projection.identity.id, 'user-owner-001');
    assert.equal(projection.displayName, 'Platform Owner');
    assert.equal(projection.email, 'owner@istebul.example');
    assert.equal(projection.role, 'platform-owner');
    assert.equal(projection.tenantReference.tenantId, 'tenant-demo-001');
    assert.equal(projection.status, 'active');
    assert.ok(projection.createdAt);
    assert.ok(projection.updatedAt);
  });
});

describe('UserSummary', () => {
  it('buildUserSummary aggregates status and role counts', () => {
    const registry = createUserRegistryRuntime(true);
    const projections = registry.getAll().map(toUserProjection);
    const summary = buildUserSummary(projections, projections.length, 0, false);
    assert.equal(summary.success, true);
    assert.equal(summary.userCount, projections.length);
    assert.ok(summary.statusCounts.active >= 1);
    assert.ok((summary.roleCounts['platform-owner'] ?? 0) >= 1);
  });

  it('buildUserSummaryItems includes user-count', () => {
    const summary = buildUserSummary([], 0, 0, false);
    const items = buildUserSummaryItems(summary, 'tr');
    assert.ok(items.some((i) => i.key === 'user-count'));
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'tr'));
  });
});

describe('UserManagementRuntime', () => {
  let runtime;

  beforeEach(() => {
    runtime = createUserManagementRuntime();
  });

  it('executes full pipeline and returns UserManagementResult', () => {
    const result = runtime.execute(createUserManagementContext());
    assert.equal(result.users.length, BUILTIN_USER_DEFINITION_COUNT);
    assert.equal(result.summary.userCount, BUILTIN_USER_DEFINITION_COUNT);
    assert.equal(result.summary.success, true);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.summaryItems.length > 0);
  });

  it('records telemetry with duration, user count, summary items', () => {
    const result = runtime.execute(createUserManagementContext());
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.userCount, result.users.length);
    assert.equal(
      result.telemetry.summaryItemCount,
      result.summaryItems.length
    );
  });

  it('filters users by userIds', () => {
    const result = runtime.execute(
      createUserManagementContext({
        userIds: ['user-support-005', 'user-viewer-006']
      })
    );
    assert.equal(result.users.length, 2);
    assert.deepEqual(
      result.users.map((u) => u.identity.id).sort(),
      ['user-support-005', 'user-viewer-006']
    );
  });

  it('accepts upstream PlatformAdminResult', () => {
    const platform = createPlatformAdminRuntime().execute(
      createPlatformAdminContext({ moduleIds: ['users'] })
    );
    const result = runtime.execute(
      createUserManagementContext({ platformAdminResult: platform })
    );
    assert.equal(result.summary.success, true);
    assert.equal(result.users.length, BUILTIN_USER_DEFINITION_COUNT);
    assert.ok(
      !result.validationIssues.some(
        (i) => i.code === 'USERS_MODULE_NOT_PROJECTED'
      )
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(runtime.getRegistry().count(), BUILTIN_USER_DEFINITION_COUNT);
  });

  it('exports pipeline bag key constant', () => {
    assert.equal(
      PIPELINE_BAG_USER_MANAGEMENT_RESULT_KEY,
      'userManagementResult'
    );
  });

  it('reports unavailable count for partial user requests', () => {
    const result = runtime.execute(
      createUserManagementContext({
        userIds: ['user-owner-001', 'ghost']
      })
    );
    assert.equal(result.summary.unavailableCount, 1);
    assert.equal(result.users.length, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_USER_ID')
    );
  });
});
