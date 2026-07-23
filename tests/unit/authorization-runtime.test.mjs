/**
 * Authorization (RBAC) Runtime — PR-203D (en az 70 unit test)
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
  createAuthorizationRuntime,
  createAuthorizationRegistry,
  createAuthorizationRegistryRuntime,
  createAuthorizationContext,
  validateAuthorizationContext,
  resolveAuthorizationIdentityProjections,
  resolveAuthorizationAuthenticationProjections,
  resolveAuthorizationSessionProjections,
  resolveRequestedAuthorizations,
  buildAuthorizationSummary,
  buildAuthorizationSummaryItems,
  toAuthorizationProjection,
  BUILTIN_AUTHORIZATION_MODULES,
  BUILTIN_AUTHORIZATION_MODULE_COUNT,
  getBuiltinAuthorizationModule,
  PIPELINE_BAG_AUTHORIZATION_RESULT_KEY,
  AuthorizationRegistry,
  AuthorizationRegistryRuntime,
  createIdentityRuntime,
  createIdentityContext,
  createAuthenticationRuntime,
  createAuthenticationContext,
  createSessionRuntime,
  createSessionContext
} = await import('../../src/identity/index.ts');

describe('AuthorizationRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createAuthorizationRegistry(true);
  });

  it('seeds all 8 builtin authorization modules', () => {
    assert.equal(registry.count(), 8);
    assert.equal(BUILTIN_AUTHORIZATION_MODULE_COUNT, 8);
    assert.equal(BUILTIN_AUTHORIZATION_MODULES.length, 8);
  });

  it('returns authorizations sorted by order', () => {
    const items = registry.getAll();
    assert.equal(items[0].id, 'authz-owner-001');
    assert.equal(items[items.length - 1].id, 'authz-anon-008');
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i].order >= items[i - 1].order);
    }
  });

  it('getById returns owner authorization', () => {
    const owner = registry.getById('authz-owner-001');
    assert.ok(owner);
    assert.equal(owner.identityId, 'identity-platform-owner-001');
    assert.equal(owner.roles[0].id, 'platform-owner');
  });

  it('getBuiltinAuthorizationModule resolves business admin', () => {
    const mod = getBuiltinAuthorizationModule('authz-badmin-003');
    assert.ok(mod);
    assert.equal(mod.roles.length, 2);
    assert.ok(mod.decisions.every((d) => d.outcome === 'allow'));
  });

  it('register adds a new authorization module', () => {
    registry.register({
      id: 'authz-custom-099',
      identityId: 'identity-custom',
      principalId: 'principal-custom',
      roles: [
        {
          id: 'viewer',
          name: 'Viewer',
          scope: 'tenant',
          permissionIds: []
        }
      ],
      permissions: [],
      policies: [],
      decisions: [
        {
          decisionId: 'dec-custom',
          outcome: 'deny',
          roleId: 'viewer',
          permissionId: 'perm-x',
          resourceId: 'res-x',
          actionId: 'action-read'
        }
      ],
      order: 99,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z'
    });
    assert.equal(registry.count(), 9);
    assert.ok(registry.getById('authz-custom-099'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_AUTHORIZATION_MODULES[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          id: '',
          identityId: 'i',
          principalId: 'p',
          roles: [],
          permissions: [],
          policies: [],
          decisions: [],
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /id zorunludur/
    );
  });

  it('register throws on missing identityId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'authz-bad-identity',
          identityId: '',
          principalId: 'p',
          roles: [],
          permissions: [],
          policies: [],
          decisions: [],
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /identityId zorunludur/
    );
  });

  it('register throws on missing principalId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'authz-bad-principal',
          identityId: 'i',
          principalId: '',
          roles: [],
          permissions: [],
          policies: [],
          decisions: [],
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /principalId zorunludur/
    );
  });

  it('unregister removes an authorization', () => {
    assert.ok(registry.unregister('authz-anon-008'));
    assert.equal(registry.count(), 7);
    assert.equal(registry.getById('authz-anon-008'), undefined);
  });

  it('getByIdentityId filters owner identity', () => {
    const items = registry.getByIdentityId('identity-platform-owner-001');
    assert.equal(items.length, 3);
  });

  it('getBySessionId filters sess-owner-001', () => {
    const items = registry.getBySessionId('sess-owner-001');
    assert.equal(items.length, 1);
    assert.equal(items[0].id, 'authz-owner-001');
  });

  it('roleCount permissionCount decisionCount aggregate builtins', () => {
    assert.ok(registry.roleCount() >= 6);
    assert.ok(registry.permissionCount() >= 6);
    assert.ok(registry.decisionCount() >= 8);
  });

  it('clear empties the registry', () => {
    registry.clear();
    assert.equal(registry.count(), 0);
  });

  it('createAuthorizationRegistryRuntime aliases createAuthorizationRegistry', () => {
    const aliased = createAuthorizationRegistryRuntime(false);
    assert.ok(aliased instanceof AuthorizationRegistry);
    assert.equal(aliased.count(), 0);
  });

  it('AuthorizationRegistryRuntime is an alias of AuthorizationRegistry', () => {
    assert.equal(AuthorizationRegistryRuntime, AuthorizationRegistry);
  });
});

describe('AuthorizationContext', () => {
  it('createAuthorizationContext defaults locale to tr', () => {
    assert.equal(createAuthorizationContext().locale, 'tr');
  });

  it('createAuthorizationContext accepts en locale', () => {
    assert.equal(createAuthorizationContext({ locale: 'en' }).locale, 'en');
  });

  it('createAuthorizationContext accepts filters', () => {
    const ctx = createAuthorizationContext({
      authorizationIds: ['authz-owner-001'],
      identityId: 'identity-platform-owner-001',
      sessionId: 'sess-owner-001',
      decisionOutcome: 'allow',
      actorId: 'actor-1'
    });
    assert.deepEqual(ctx.authorizationIds, ['authz-owner-001']);
    assert.equal(ctx.identityId, 'identity-platform-owner-001');
    assert.equal(ctx.sessionId, 'sess-owner-001');
    assert.equal(ctx.decisionOutcome, 'allow');
    assert.equal(ctx.actorId, 'actor-1');
  });
});

describe('validateAuthorizationContext', () => {
  let registry;

  beforeEach(() => {
    registry = createAuthorizationRegistry(true);
  });

  it('passes for valid default context', () => {
    assert.equal(
      validateAuthorizationContext(createAuthorizationContext(), registry)
        .length,
      0
    );
  });

  it('errors on invalid locale', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ locale: 'de' }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'INVALID_LOCALE' && i.severity === 'error')
    );
  });

  it('warns on empty authorizationIds array', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ authorizationIds: [] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_AUTHORIZATION_IDS'));
  });

  it('warns on unknown authorization id', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({
        authorizationIds: ['authz-owner-001', 'ghost']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_AUTHORIZATION_ID'));
  });

  it('warns on duplicate authorization id', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({
        authorizationIds: ['authz-owner-001', 'authz-owner-001']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'DUPLICATE_AUTHORIZATION_ID'));
  });

  it('errors on blank authorization id', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ authorizationIds: ['  '] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_AUTHORIZATION_ID'));
  });

  it('warns on empty actorId', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ actorId: '   ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });

  it('errors on empty identityId', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ identityId: '  ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_IDENTITY_ID'));
  });

  it('warns on unknown identityId', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ identityId: 'identity-missing' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_IDENTITY_ID'));
  });

  it('errors on empty sessionId', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ sessionId: '  ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_SESSION_ID'));
  });

  it('warns on unknown sessionId', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ sessionId: 'sess-missing' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_SESSION_ID'));
  });

  it('errors on invalid decisionOutcome', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ decisionOutcome: 'maybe' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_DECISION_OUTCOME'));
  });

  it('warns when upstream identityResult is unsuccessful', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({ locale: 'xx' })
    );
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ identityResult }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'IDENTITY_NOT_SUCCESS'));
  });

  it('warns when upstream authenticationResult is unsuccessful', () => {
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({ locale: 'xx' })
    );
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ authenticationResult }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'AUTHENTICATION_NOT_SUCCESS'));
  });

  it('warns when upstream sessionResult is unsuccessful', () => {
    const sessionResult = createSessionRuntime().execute(
      createSessionContext({ locale: 'xx' })
    );
    const issues = validateAuthorizationContext(
      createAuthorizationContext({ sessionResult }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'SESSION_NOT_SUCCESS'));
  });

  it('errors on invalid identityResult summary', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({
        identityResult: { identities: [], summary: {} }
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_IDENTITY_RESULT'));
  });

  it('errors on invalid authenticationResult summary', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({
        authenticationResult: { authentications: [], summary: {} }
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_AUTHENTICATION_RESULT'));
  });

  it('errors on invalid sessionResult summary', () => {
    const issues = validateAuthorizationContext(
      createAuthorizationContext({
        sessionResult: { sessions: [], summary: {} }
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_SESSION_RESULT'));
  });
});

describe('resolveAuthorization upstream projections', () => {
  it('identity projections empty when omitted', () => {
    assert.equal(
      resolveAuthorizationIdentityProjections(createAuthorizationContext())
        .length,
      0
    );
  });

  it('identity projections from upstream', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({
        identityIds: ['identity-platform-owner-001']
      })
    );
    const projections = resolveAuthorizationIdentityProjections(
      createAuthorizationContext({ identityResult })
    );
    assert.equal(projections.length, 1);
    assert.equal(projections[0].projected, true);
  });

  it('authentication projections empty when omitted', () => {
    assert.equal(
      resolveAuthorizationAuthenticationProjections(
        createAuthorizationContext()
      ).length,
      0
    );
  });

  it('authentication projections from upstream', () => {
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({
        authenticationIds: ['auth-owner-001']
      })
    );
    const projections = resolveAuthorizationAuthenticationProjections(
      createAuthorizationContext({ authenticationResult })
    );
    assert.equal(projections.length, 1);
    assert.equal(projections[0].projected, true);
  });

  it('session projections empty when omitted', () => {
    assert.equal(
      resolveAuthorizationSessionProjections(createAuthorizationContext())
        .length,
      0
    );
  });

  it('session projections from upstream', () => {
    const sessionResult = createSessionRuntime().execute(
      createSessionContext({ sessionIds: ['session-owner-001'] })
    );
    const projections = resolveAuthorizationSessionProjections(
      createAuthorizationContext({ sessionResult })
    );
    assert.equal(projections.length, 1);
    assert.equal(projections[0].projected, true);
  });
});

describe('resolveRequestedAuthorizations', () => {
  let registry;

  beforeEach(() => {
    registry = createAuthorizationRegistry(true);
  });

  it('returns all authorizations when filters omitted', () => {
    const { authorizations, requestedCount, unavailableCount } =
      resolveRequestedAuthorizations(createAuthorizationContext(), registry);
    assert.equal(authorizations.length, 8);
    assert.equal(requestedCount, 8);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested authorization ids', () => {
    const { authorizations, requestedCount, unavailableCount } =
      resolveRequestedAuthorizations(
        createAuthorizationContext({
          authorizationIds: ['authz-owner-001', 'authz-badmin-003']
        }),
        registry
      );
    assert.equal(authorizations.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
  });

  it('counts unavailable authorizations for unknown ids', () => {
    const { authorizations, unavailableCount } =
      resolveRequestedAuthorizations(
        createAuthorizationContext({
          authorizationIds: ['authz-owner-001', 'missing']
        }),
        registry
      );
    assert.equal(authorizations.length, 1);
    assert.equal(unavailableCount, 1);
  });

  it('filters by identityId', () => {
    const { authorizations } = resolveRequestedAuthorizations(
      createAuthorizationContext({
        identityId: 'identity-platform-owner-001'
      }),
      registry
    );
    assert.equal(authorizations.length, 3);
  });

  it('filters by sessionId', () => {
    const { authorizations } = resolveRequestedAuthorizations(
      createAuthorizationContext({ sessionId: 'sess-badmin-003' }),
      registry
    );
    assert.equal(authorizations.length, 1);
    assert.equal(authorizations[0].id, 'authz-badmin-003');
  });

  it('filters by decisionOutcome deny', () => {
    const { authorizations } = resolveRequestedAuthorizations(
      createAuthorizationContext({ decisionOutcome: 'deny' }),
      registry
    );
    assert.ok(authorizations.length >= 4);
    assert.ok(
      authorizations.every((item) =>
        item.decisions.some((d) => d.outcome === 'deny')
      )
    );
  });

  it('filters by upstream identity projections', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({
        identityIds: ['identity-business-admin-003']
      })
    );
    const { authorizations } = resolveRequestedAuthorizations(
      createAuthorizationContext({ identityResult }),
      registry
    );
    assert.equal(authorizations.length, 1);
    assert.equal(authorizations[0].id, 'authz-badmin-003');
  });

  it('filters by upstream session projections', () => {
    const sessionResult = createSessionRuntime().execute(
      createSessionContext({ sessionIds: ['session-member-004'] })
    );
    const { authorizations } = resolveRequestedAuthorizations(
      createAuthorizationContext({ sessionResult }),
      registry
    );
    assert.equal(authorizations.length, 1);
    assert.equal(authorizations[0].id, 'authz-member-004');
  });

  it('filters by upstream authentication projections', () => {
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({
        authenticationIds: ['auth-viewer-005']
      })
    );
    const { authorizations } = resolveRequestedAuthorizations(
      createAuthorizationContext({ authenticationResult }),
      registry
    );
    assert.equal(authorizations.length, 1);
    assert.equal(authorizations[0].id, 'authz-viewer-005');
  });

  it('combines identityId with authorizationIds', () => {
    const { authorizations, unavailableCount } =
      resolveRequestedAuthorizations(
        createAuthorizationContext({
          identityId: 'identity-platform-owner-001',
          authorizationIds: ['authz-owner-001', 'authz-badmin-003']
        }),
        registry
      );
    assert.equal(authorizations.length, 1);
    assert.equal(authorizations[0].id, 'authz-owner-001');
    assert.equal(unavailableCount, 1);
  });
});

describe('toAuthorizationProjection', () => {
  it('projects authorization module with projected flag and counts', () => {
    const projection = toAuthorizationProjection(
      BUILTIN_AUTHORIZATION_MODULES[0]
    );
    assert.equal(projection.authorizationId, 'authz-owner-001');
    assert.equal(projection.projected, true);
    assert.equal(projection.roles.length, 1);
    assert.equal(projection.permissions.length, 2);
    assert.equal(projection.decisions.length, 2);
    assert.equal(projection.allowCount, 2);
    assert.equal(projection.denyCount, 0);
    assert.equal(projection.policies[0].effect, 'allow');
  });

  it('copies nested role permission decision objects without mutation', () => {
    const source = BUILTIN_AUTHORIZATION_MODULES[2];
    const projection = toAuthorizationProjection(source);
    assert.notEqual(projection.roles, source.roles);
    assert.notEqual(projection.permissions, source.permissions);
    assert.equal(projection.roles.length, 2);
    assert.ok(Object.isFrozen(projection.roles));
    assert.ok(Object.isFrozen(projection.permissions));
    assert.ok(Object.isFrozen(projection.decisions));
  });

  it('counts allow and deny decisions', () => {
    const projection = toAuthorizationProjection(
      BUILTIN_AUTHORIZATION_MODULES[1]
    );
    assert.equal(projection.allowCount, 2);
    assert.equal(projection.denyCount, 1);
  });
});

describe('buildAuthorizationSummary', () => {
  it('builds summary with role permission decision counts', () => {
    const projections = BUILTIN_AUTHORIZATION_MODULES.map((m) =>
      toAuthorizationProjection(m)
    );
    const summary = buildAuthorizationSummary(
      projections,
      [],
      [],
      [],
      8,
      0,
      false
    );
    assert.equal(summary.success, true);
    assert.equal(summary.authorizationCount, 8);
    assert.ok(summary.roleCount >= 6);
    assert.ok(summary.permissionCount >= 6);
    assert.ok(summary.decisionCount >= 8);
    assert.ok(summary.allowCount >= 1);
    assert.ok(summary.denyCount >= 1);
  });

  it('includes upstream projection counts', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext()
    );
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext()
    );
    const sessionResult = createSessionRuntime().execute(createSessionContext());
    const summary = buildAuthorizationSummary(
      [],
      identityResult.identities,
      authenticationResult.authentications,
      sessionResult.sessions,
      0,
      0,
      false
    );
    assert.equal(summary.identityProjectionCount, 6);
    assert.equal(summary.authenticationProjectionCount, 7);
    assert.equal(summary.sessionProjectionCount, 8);
    assert.equal(summary.success, false);
  });

  it('marks success false when hasErrors', () => {
    const summary = buildAuthorizationSummary([], [], [], [], 0, 0, true);
    assert.equal(summary.success, false);
  });
});

describe('buildAuthorizationSummaryItems', () => {
  it('includes telemetry-aligned keys', () => {
    const ctx = createAuthorizationContext({ actorId: 'actor-x' });
    const projections = [
      toAuthorizationProjection(BUILTIN_AUTHORIZATION_MODULES[0])
    ];
    const summary = buildAuthorizationSummary(
      projections,
      [],
      [],
      [],
      1,
      0,
      false
    );
    const items = buildAuthorizationSummaryItems(ctx, summary, []);
    const keys = items.map((item) => item.key);
    assert.ok(keys.includes('locale'));
    assert.ok(keys.includes('role-count'));
    assert.ok(keys.includes('permission-count'));
    assert.ok(keys.includes('decision-count'));
    assert.ok(keys.includes('allow-count'));
    assert.ok(keys.includes('deny-count'));
    assert.ok(keys.includes('actor-id'));
    assert.ok(keys.includes('success'));
  });

  it('includes identity session and decision filters', () => {
    const ctx = createAuthorizationContext({
      identityId: 'identity-platform-owner-001',
      sessionId: 'sess-owner-001',
      decisionOutcome: 'allow'
    });
    const summary = buildAuthorizationSummary([], [], [], [], 0, 0, false);
    const items = buildAuthorizationSummaryItems(ctx, summary, []);
    assert.ok(items.some((item) => item.key === 'identity-id'));
    assert.ok(items.some((item) => item.key === 'session-id'));
    assert.ok(items.some((item) => item.key === 'decision-outcome-filter'));
  });

  it('reports has-errors from validation issues', () => {
    const summary = buildAuthorizationSummary([], [], [], [], 0, 0, true);
    const items = buildAuthorizationSummaryItems(
      createAuthorizationContext(),
      summary,
      [{ code: 'INVALID_LOCALE', message: 'x', severity: 'error' }]
    );
    const hasErrors = items.find((item) => item.key === 'has-errors');
    assert.equal(hasErrors.value, true);
  });
});

describe('AuthorizationRuntime.execute', () => {
  it('executes full pipeline for default context', () => {
    const result = createAuthorizationRuntime().execute(
      createAuthorizationContext()
    );
    assert.equal(result.authorizations.length, 8);
    assert.equal(result.identityProjections.length, 0);
    assert.equal(result.authenticationProjections.length, 0);
    assert.equal(result.sessionProjections.length, 0);
    assert.equal(result.summary.success, true);
    assert.ok(result.summary.roleCount >= 6);
    assert.ok(result.summary.permissionCount >= 6);
    assert.ok(result.summary.decisionCount >= 8);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.telemetry.durationMs >= 0);
    assert.equal(result.telemetry.roleCount, result.summary.roleCount);
    assert.equal(
      result.telemetry.permissionCount,
      result.summary.permissionCount
    );
    assert.equal(result.telemetry.decisionCount, result.summary.decisionCount);
    assert.ok(result.telemetry.summaryItemCount >= 10);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
  });

  it('projects identity auth session then authorization when upstream provided', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({
        identityIds: [
          'identity-platform-owner-001',
          'identity-platform-admin-002'
        ]
      })
    );
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({
        identityResult,
        authenticationIds: ['auth-owner-001', 'auth-padmin-002']
      })
    );
    const sessionResult = createSessionRuntime().execute(
      createSessionContext({
        identityResult,
        authenticationResult,
        sessionIds: ['session-owner-001', 'session-padmin-002']
      })
    );
    const result = createAuthorizationRuntime().execute(
      createAuthorizationContext({
        identityResult,
        authenticationResult,
        sessionResult
      })
    );
    assert.equal(result.identityProjections.length, 2);
    assert.equal(result.authenticationProjections.length, 2);
    assert.equal(result.sessionProjections.length, 2);
    assert.ok(result.authorizations.length >= 2);
    assert.ok(
      result.authorizations.every((item) =>
        ['sess-owner-001', 'sess-padmin-002'].includes(item.sessionId)
      )
    );
  });

  it('projects only requested authorizations', () => {
    const result = createAuthorizationRuntime().execute(
      createAuthorizationContext({
        authorizationIds: ['authz-member-004']
      })
    );
    assert.equal(result.authorizations.length, 1);
    assert.equal(result.authorizations[0].authorizationId, 'authz-member-004');
    assert.equal(result.summary.authorizationCount, 1);
    assert.ok(result.summary.decisionCount >= 2);
  });

  it('filters by decisionOutcome allow', () => {
    const result = createAuthorizationRuntime().execute(
      createAuthorizationContext({ decisionOutcome: 'allow' })
    );
    assert.ok(result.authorizations.length >= 1);
    assert.ok(
      result.authorizations.every((item) =>
        item.decisions.some((d) => d.outcome === 'allow')
      )
    );
  });

  it('reports warnings for unknown ids', () => {
    const result = createAuthorizationRuntime().execute(
      createAuthorizationContext({
        authorizationIds: ['authz-owner-001', 'ghost']
      })
    );
    assert.equal(result.authorizations.length, 1);
    assert.equal(result.summary.unavailableCount, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_AUTHORIZATION_ID')
    );
  });

  it('fails summary on invalid locale error', () => {
    const result = createAuthorizationRuntime().execute(
      createAuthorizationContext({ locale: 'xx' })
    );
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some(
        (i) => i.code === 'INVALID_LOCALE' && i.severity === 'error'
      )
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(createAuthorizationRuntime().getRegistry().count(), 8);
  });

  it('accepts custom empty registry', () => {
    const result = createAuthorizationRuntime(
      createAuthorizationRegistry(false)
    ).execute(createAuthorizationContext());
    assert.equal(result.authorizations.length, 0);
    assert.equal(result.summary.success, false);
    assert.equal(result.telemetry.decisionCount, 0);
  });

  it('all projections have projected true', () => {
    const result = createAuthorizationRuntime().execute(
      createAuthorizationContext()
    );
    assert.ok(result.authorizations.every((item) => item.projected === true));
  });

  it('summaryItems align with telemetry counts', () => {
    const result = createAuthorizationRuntime().execute(
      createAuthorizationContext({ locale: 'en' })
    );
    const roleCount = result.summaryItems.find(
      (item) => item.key === 'role-count'
    );
    const permissionCount = result.summaryItems.find(
      (item) => item.key === 'permission-count'
    );
    const decisionCount = result.summaryItems.find(
      (item) => item.key === 'decision-count'
    );
    assert.equal(roleCount.value, result.telemetry.roleCount);
    assert.equal(permissionCount.value, result.telemetry.permissionCount);
    assert.equal(decisionCount.value, result.telemetry.decisionCount);
  });

  it('AuthorizationResult shape includes all pipeline outputs', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext()
    );
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({ identityResult })
    );
    const sessionResult = createSessionRuntime().execute(
      createSessionContext({ identityResult, authenticationResult })
    );
    const result = createAuthorizationRuntime().execute(
      createAuthorizationContext({
        identityResult,
        authenticationResult,
        sessionResult,
        actorId: 'a1'
      })
    );
    assert.ok(Array.isArray(result.identityProjections));
    assert.ok(Array.isArray(result.authenticationProjections));
    assert.ok(Array.isArray(result.sessionProjections));
    assert.ok(Array.isArray(result.authorizations));
    assert.ok(result.summary);
    assert.ok(Array.isArray(result.summaryItems));
    assert.ok(Array.isArray(result.validationIssues));
    assert.ok(result.telemetry);
    assert.equal(typeof result.telemetry.durationMs, 'number');
  });
});

describe('Authorization telemetry helpers', () => {
  it('PIPELINE_BAG_AUTHORIZATION_RESULT_KEY is authorizationResult', () => {
    assert.equal(
      PIPELINE_BAG_AUTHORIZATION_RESULT_KEY,
      'authorizationResult'
    );
  });
});

describe('Authorization model shape', () => {
  it('builtin modules include Role Permission Policy Resource Action Decision', () => {
    for (const module of BUILTIN_AUTHORIZATION_MODULES) {
      assert.ok(module.identityId);
      assert.ok(module.principalId);
      assert.ok(Array.isArray(module.roles));
      assert.ok(Array.isArray(module.permissions));
      assert.ok(Array.isArray(module.policies));
      assert.ok(Array.isArray(module.decisions));
      for (const permission of module.permissions) {
        assert.ok(permission.action.id);
        assert.ok(permission.resource.id);
        assert.ok(permission.resource.type);
      }
      for (const decision of module.decisions) {
        assert.ok(['allow', 'deny'].includes(decision.outcome));
        assert.ok(decision.roleId);
        assert.ok(decision.permissionId);
        assert.ok(decision.resourceId);
        assert.ok(decision.actionId);
      }
    }
  });

  it('covers allow and deny decisions', () => {
    const outcomes = new Set(
      BUILTIN_AUTHORIZATION_MODULES.flatMap((m) =>
        m.decisions.map((d) => d.outcome)
      )
    );
    assert.ok(outcomes.has('allow'));
    assert.ok(outcomes.has('deny'));
  });

  it('covers platform business and tenant role scopes', () => {
    const scopes = new Set(
      BUILTIN_AUTHORIZATION_MODULES.flatMap((m) => m.roles.map((r) => r.scope))
    );
    assert.ok(scopes.has('platform'));
    assert.ok(scopes.has('business'));
    assert.ok(scopes.has('tenant'));
  });

  it('suspended authorization denies with empty permissions', () => {
    const suspended = getBuiltinAuthorizationModule('authz-susp-006');
    assert.ok(suspended);
    assert.equal(suspended.permissions.length, 0);
    assert.ok(suspended.decisions.every((d) => d.outcome === 'deny'));
    assert.equal(suspended.identityId, 'identity-suspended-006');
  });

  it('business admin has dual roles and only allow decisions', () => {
    const biz = getBuiltinAuthorizationModule('authz-badmin-003');
    assert.ok(biz);
    const roleIds = biz.roles.map((r) => r.id);
    assert.ok(roleIds.includes('business-admin'));
    assert.ok(roleIds.includes('tenant-admin'));
    assert.ok(biz.decisions.every((d) => d.outcome === 'allow'));
  });
});
