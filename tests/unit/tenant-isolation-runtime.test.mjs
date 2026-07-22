/**
 * Tenant Isolation Runtime — PR-203E (en az 80 unit test)
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
  createTenantIsolationRuntime,
  createTenantIsolationRegistry,
  createTenantIsolationRegistryRuntime,
  createTenantIsolationContext,
  validateTenantIsolationContext,
  resolveTenantIsolationIdentityProjections,
  resolveTenantIsolationAuthenticationProjections,
  resolveTenantIsolationSessionProjections,
  resolveTenantIsolationAuthorizationProjections,
  resolveRequestedIsolations,
  buildTenantIsolationSummary,
  buildTenantIsolationSummaryItems,
  toTenantIsolationProjection,
  BUILTIN_TENANT_ISOLATION_MODULES,
  BUILTIN_TENANT_ISOLATION_MODULE_COUNT,
  getBuiltinTenantIsolationModule,
  PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY,
  TenantIsolationRegistry,
  TenantIsolationRegistryRuntime,
  createIdentityRuntime,
  createIdentityContext,
  createAuthenticationRuntime,
  createAuthenticationContext,
  createSessionRuntime,
  createSessionContext,
  createAuthorizationRuntime,
  createAuthorizationContext
} = await import('../../src/identity/index.ts');

describe('TenantIsolationRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createTenantIsolationRegistry(true);
  });

  it('seeds all 9 builtin isolation modules', () => {
    assert.equal(registry.count(), 9);
    assert.equal(BUILTIN_TENANT_ISOLATION_MODULE_COUNT, 9);
    assert.equal(BUILTIN_TENANT_ISOLATION_MODULES.length, 9);
  });

  it('returns isolations sorted by order', () => {
    const items = registry.getAll();
    assert.equal(items[0].id, 'iso-platform-001');
    assert.equal(items[items.length - 1].id, 'iso-enterprise-009');
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i].order >= items[i - 1].order);
    }
  });

  it('getById returns platform isolation', () => {
    const mod = registry.getById('iso-platform-001');
    assert.ok(mod);
    assert.equal(mod.tenantIdentity.tenantId, 'tenant-platform');
    assert.equal(mod.boundary.strict, true);
  });

  it('getBuiltinTenantIsolationModule resolves demo', () => {
    const mod = getBuiltinTenantIsolationModule('iso-demo-002');
    assert.ok(mod);
    assert.equal(mod.memberships.length, 2);
    assert.ok(mod.decisions.some((d) => d.outcome === 'restrict'));
  });

  it('register adds a new isolation module', () => {
    registry.register({
      id: 'iso-custom-099',
      tenantIdentity: {
        tenantId: 'tenant-custom',
        slug: 'custom',
        displayName: 'Custom'
      },
      boundary: {
        boundaryId: 'bound-custom',
        tenantId: 'tenant-custom',
        label: 'Custom',
        strict: true
      },
      memberships: [],
      scopes: [{ scopeId: 's1', level: 'tenant', tenantId: 'tenant-custom' }],
      isolationRules: [],
      accessScope: {
        accessScopeId: 'a1',
        allowedTenantIds: ['tenant-custom'],
        crossTenantAllowed: false
      },
      decisions: [
        {
          decisionId: 'd1',
          outcome: 'deny',
          identityId: 'identity-x',
          sourceTenantId: 'tenant-custom',
          targetTenantId: 'tenant-custom'
        }
      ],
      order: 99,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z'
    });
    assert.equal(registry.count(), 10);
    assert.ok(registry.getById('iso-custom-099'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_TENANT_ISOLATION_MODULES[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          id: '',
          tenantIdentity: {
            tenantId: 't',
            slug: 't',
            displayName: 'T'
          },
          boundary: {
            boundaryId: 'b',
            tenantId: 't',
            label: 'B',
            strict: true
          },
          memberships: [],
          scopes: [],
          isolationRules: [],
          accessScope: {
            accessScopeId: 'a',
            allowedTenantIds: [],
            crossTenantAllowed: false
          },
          decisions: [],
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /id zorunludur/
    );
  });

  it('register throws on missing tenantId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'iso-bad-tenant',
          tenantIdentity: {
            tenantId: '',
            slug: 't',
            displayName: 'T'
          },
          boundary: {
            boundaryId: 'b',
            tenantId: 't',
            label: 'B',
            strict: true
          },
          memberships: [],
          scopes: [],
          isolationRules: [],
          accessScope: {
            accessScopeId: 'a',
            allowedTenantIds: [],
            crossTenantAllowed: false
          },
          decisions: [],
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /tenantId zorunludur/
    );
  });

  it('register throws on missing boundaryId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'iso-bad-boundary',
          tenantIdentity: {
            tenantId: 't',
            slug: 't',
            displayName: 'T'
          },
          boundary: {
            boundaryId: '',
            tenantId: 't',
            label: 'B',
            strict: true
          },
          memberships: [],
          scopes: [],
          isolationRules: [],
          accessScope: {
            accessScopeId: 'a',
            allowedTenantIds: [],
            crossTenantAllowed: false
          },
          decisions: [],
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /boundaryId zorunludur/
    );
  });

  it('unregister removes an isolation', () => {
    assert.ok(registry.unregister('iso-anon-008'));
    assert.equal(registry.count(), 8);
    assert.equal(registry.getById('iso-anon-008'), undefined);
  });

  it('getByTenantId filters platform tenant', () => {
    const items = registry.getByTenantId('tenant-platform');
    assert.ok(items.length >= 3);
    assert.ok(
      items.every((item) => item.tenantIdentity.tenantId === 'tenant-platform')
    );
  });

  it('getByIdentityId finds owner via membership and primary', () => {
    const items = registry.getByIdentityId('identity-platform-owner-001');
    assert.ok(items.length >= 2);
  });

  it('tenantCount membershipCount decisionCount aggregate', () => {
    assert.ok(registry.tenantCount() >= 4);
    assert.ok(registry.membershipCount() >= 6);
    assert.ok(registry.decisionCount() >= 8);
  });

  it('clear empties the registry', () => {
    registry.clear();
    assert.equal(registry.count(), 0);
  });

  it('createTenantIsolationRegistryRuntime aliases createTenantIsolationRegistry', () => {
    const aliased = createTenantIsolationRegistryRuntime(false);
    assert.ok(aliased instanceof TenantIsolationRegistry);
    assert.equal(aliased.count(), 0);
  });

  it('TenantIsolationRegistryRuntime is an alias of TenantIsolationRegistry', () => {
    assert.equal(TenantIsolationRegistryRuntime, TenantIsolationRegistry);
  });
});

describe('TenantIsolationContext', () => {
  it('createTenantIsolationContext defaults locale to tr', () => {
    assert.equal(createTenantIsolationContext().locale, 'tr');
  });

  it('createTenantIsolationContext accepts en locale', () => {
    assert.equal(createTenantIsolationContext({ locale: 'en' }).locale, 'en');
  });

  it('createTenantIsolationContext accepts filters', () => {
    const ctx = createTenantIsolationContext({
      isolationIds: ['iso-platform-001'],
      tenantId: 'tenant-platform',
      identityId: 'identity-platform-owner-001',
      decisionOutcome: 'allow',
      actorId: 'actor-1'
    });
    assert.deepEqual(ctx.isolationIds, ['iso-platform-001']);
    assert.equal(ctx.tenantId, 'tenant-platform');
    assert.equal(ctx.identityId, 'identity-platform-owner-001');
    assert.equal(ctx.decisionOutcome, 'allow');
    assert.equal(ctx.actorId, 'actor-1');
  });
});

describe('validateTenantIsolationContext', () => {
  let registry;

  beforeEach(() => {
    registry = createTenantIsolationRegistry(true);
  });

  it('passes for valid default context', () => {
    assert.equal(
      validateTenantIsolationContext(createTenantIsolationContext(), registry)
        .length,
      0
    );
  });

  it('errors on invalid locale', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ locale: 'de' }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'INVALID_LOCALE' && i.severity === 'error')
    );
  });

  it('warns on empty isolationIds array', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ isolationIds: [] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_ISOLATION_IDS'));
  });

  it('warns on unknown isolation id', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({
        isolationIds: ['iso-platform-001', 'ghost']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_ISOLATION_ID'));
  });

  it('warns on duplicate isolation id', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({
        isolationIds: ['iso-platform-001', 'iso-platform-001']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'DUPLICATE_ISOLATION_ID'));
  });

  it('errors on blank isolation id', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ isolationIds: ['  '] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_ISOLATION_ID'));
  });

  it('warns on empty actorId', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ actorId: '   ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });

  it('errors on empty tenantId', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ tenantId: '  ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_TENANT_ID'));
  });

  it('warns on unknown tenantId', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ tenantId: 'tenant-missing' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_TENANT_ID'));
  });

  it('errors on empty identityId', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ identityId: '  ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_IDENTITY_ID'));
  });

  it('warns on unknown identityId', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ identityId: 'identity-missing' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_IDENTITY_ID'));
  });

  it('errors on invalid decisionOutcome', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ decisionOutcome: 'maybe' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_DECISION_OUTCOME'));
  });

  it('warns when upstream identityResult is unsuccessful', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({ locale: 'xx' })
    );
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ identityResult }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'IDENTITY_NOT_SUCCESS'));
  });

  it('warns when upstream authenticationResult is unsuccessful', () => {
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({ locale: 'xx' })
    );
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ authenticationResult }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'AUTHENTICATION_NOT_SUCCESS'));
  });

  it('warns when upstream sessionResult is unsuccessful', () => {
    const sessionResult = createSessionRuntime().execute(
      createSessionContext({ locale: 'xx' })
    );
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ sessionResult }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'SESSION_NOT_SUCCESS'));
  });

  it('warns when upstream authorizationResult is unsuccessful', () => {
    const authorizationResult = createAuthorizationRuntime().execute(
      createAuthorizationContext({ locale: 'xx' })
    );
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({ authorizationResult }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'AUTHORIZATION_NOT_SUCCESS'));
  });

  it('errors on invalid identityResult summary', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({
        identityResult: { identities: [], summary: {} }
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_IDENTITY_RESULT'));
  });

  it('errors on invalid authenticationResult summary', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({
        authenticationResult: { authentications: [], summary: {} }
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_AUTHENTICATION_RESULT'));
  });

  it('errors on invalid sessionResult summary', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({
        sessionResult: { sessions: [], summary: {} }
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_SESSION_RESULT'));
  });

  it('errors on invalid authorizationResult summary', () => {
    const issues = validateTenantIsolationContext(
      createTenantIsolationContext({
        authorizationResult: { authorizations: [], summary: {} }
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_AUTHORIZATION_RESULT'));
  });
});

describe('resolveTenantIsolation upstream projections', () => {
  it('identity projections empty when omitted', () => {
    assert.equal(
      resolveTenantIsolationIdentityProjections(createTenantIsolationContext())
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
    const projections = resolveTenantIsolationIdentityProjections(
      createTenantIsolationContext({ identityResult })
    );
    assert.equal(projections.length, 1);
    assert.equal(projections[0].projected, true);
  });

  it('authentication projections empty when omitted', () => {
    assert.equal(
      resolveTenantIsolationAuthenticationProjections(
        createTenantIsolationContext()
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
    const projections = resolveTenantIsolationAuthenticationProjections(
      createTenantIsolationContext({ authenticationResult })
    );
    assert.equal(projections.length, 1);
  });

  it('session projections empty when omitted', () => {
    assert.equal(
      resolveTenantIsolationSessionProjections(createTenantIsolationContext())
        .length,
      0
    );
  });

  it('session projections from upstream', () => {
    const sessionResult = createSessionRuntime().execute(
      createSessionContext({ sessionIds: ['session-owner-001'] })
    );
    const projections = resolveTenantIsolationSessionProjections(
      createTenantIsolationContext({ sessionResult })
    );
    assert.equal(projections.length, 1);
  });

  it('authorization projections empty when omitted', () => {
    assert.equal(
      resolveTenantIsolationAuthorizationProjections(
        createTenantIsolationContext()
      ).length,
      0
    );
  });

  it('authorization projections from upstream', () => {
    const authorizationResult = createAuthorizationRuntime().execute(
      createAuthorizationContext({
        authorizationIds: ['authz-owner-001']
      })
    );
    const projections = resolveTenantIsolationAuthorizationProjections(
      createTenantIsolationContext({ authorizationResult })
    );
    assert.equal(projections.length, 1);
    assert.equal(projections[0].projected, true);
  });
});

describe('resolveRequestedIsolations', () => {
  let registry;

  beforeEach(() => {
    registry = createTenantIsolationRegistry(true);
  });

  it('returns all isolations when filters omitted', () => {
    const { isolations, requestedCount, unavailableCount } =
      resolveRequestedIsolations(createTenantIsolationContext(), registry);
    assert.equal(isolations.length, 9);
    assert.equal(requestedCount, 9);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested isolation ids', () => {
    const { isolations, requestedCount, unavailableCount } =
      resolveRequestedIsolations(
        createTenantIsolationContext({
          isolationIds: ['iso-platform-001', 'iso-demo-002']
        }),
        registry
      );
    assert.equal(isolations.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
  });

  it('counts unavailable isolations for unknown ids', () => {
    const { isolations, unavailableCount } = resolveRequestedIsolations(
      createTenantIsolationContext({
        isolationIds: ['iso-platform-001', 'missing']
      }),
      registry
    );
    assert.equal(isolations.length, 1);
    assert.equal(unavailableCount, 1);
  });

  it('filters by tenantId', () => {
    const { isolations } = resolveRequestedIsolations(
      createTenantIsolationContext({ tenantId: 'tenant-demo-001' }),
      registry
    );
    assert.equal(isolations.length, 2);
  });

  it('filters by identityId', () => {
    const { isolations } = resolveRequestedIsolations(
      createTenantIsolationContext({
        identityId: 'identity-tenant-member-004'
      }),
      registry
    );
    assert.ok(isolations.length >= 2);
  });

  it('filters by decisionOutcome restrict', () => {
    const { isolations } = resolveRequestedIsolations(
      createTenantIsolationContext({ decisionOutcome: 'restrict' }),
      registry
    );
    assert.ok(isolations.length >= 2);
    assert.ok(
      isolations.every((item) =>
        item.decisions.some((d) => d.outcome === 'restrict')
      )
    );
  });

  it('filters by upstream identity projections', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({
        identityIds: ['identity-viewer-005']
      })
    );
    const { isolations } = resolveRequestedIsolations(
      createTenantIsolationContext({ identityResult }),
      registry
    );
    assert.equal(isolations.length, 1);
    assert.equal(isolations[0].id, 'iso-trial-003');
  });

  it('filters by upstream authorization projections', () => {
    const authorizationResult = createAuthorizationRuntime().execute(
      createAuthorizationContext({
        authorizationIds: ['authz-member-004']
      })
    );
    const { isolations } = resolveRequestedIsolations(
      createTenantIsolationContext({ authorizationResult }),
      registry
    );
    assert.equal(isolations.length, 1);
    assert.equal(isolations[0].id, 'iso-demo-member-005');
  });

  it('filters by upstream session projections', () => {
    const sessionResult = createSessionRuntime().execute(
      createSessionContext({ sessionIds: ['session-susp-006'] })
    );
    const { isolations } = resolveRequestedIsolations(
      createTenantIsolationContext({ sessionResult }),
      registry
    );
    assert.equal(isolations.length, 1);
    assert.equal(isolations[0].id, 'iso-susp-004');
  });

  it('combines tenantId with isolationIds', () => {
    const { isolations, unavailableCount } = resolveRequestedIsolations(
      createTenantIsolationContext({
        tenantId: 'tenant-platform',
        isolationIds: ['iso-platform-001', 'iso-demo-002']
      }),
      registry
    );
    assert.equal(isolations.length, 1);
    assert.equal(isolations[0].id, 'iso-platform-001');
    assert.equal(unavailableCount, 1);
  });
});

describe('toTenantIsolationProjection', () => {
  it('projects isolation module with projected flag and counts', () => {
    const projection = toTenantIsolationProjection(
      BUILTIN_TENANT_ISOLATION_MODULES[0]
    );
    assert.equal(projection.isolationId, 'iso-platform-001');
    assert.equal(projection.projected, true);
    assert.equal(projection.membershipCount, 2);
    assert.equal(projection.decisionCount, 2);
    assert.equal(projection.allowCount, 1);
    assert.equal(projection.denyCount, 1);
    assert.equal(projection.restrictCount, 0);
    assert.equal(projection.boundary.strict, true);
    assert.equal(projection.accessScope.crossTenantAllowed, false);
  });

  it('copies nested objects without mutating source', () => {
    const source = BUILTIN_TENANT_ISOLATION_MODULES[1];
    const projection = toTenantIsolationProjection(source);
    assert.notEqual(projection.memberships, source.memberships);
    assert.notEqual(projection.decisions, source.decisions);
    assert.ok(Object.isFrozen(projection.memberships));
    assert.ok(Object.isFrozen(projection.decisions));
    assert.ok(Object.isFrozen(projection.accessScope.allowedTenantIds));
  });

  it('counts allow deny and restrict decisions', () => {
    const projection = toTenantIsolationProjection(
      BUILTIN_TENANT_ISOLATION_MODULES[1]
    );
    assert.equal(projection.allowCount, 2);
    assert.equal(projection.restrictCount, 1);
    assert.equal(projection.denyCount, 0);
  });
});

describe('buildTenantIsolationSummary', () => {
  it('builds summary with tenant membership decision counts', () => {
    const projections = BUILTIN_TENANT_ISOLATION_MODULES.map((m) =>
      toTenantIsolationProjection(m)
    );
    const summary = buildTenantIsolationSummary(
      projections,
      [],
      [],
      [],
      [],
      9,
      0,
      false
    );
    assert.equal(summary.success, true);
    assert.ok(summary.tenantCount >= 4);
    assert.ok(summary.membershipCount >= 6);
    assert.ok(summary.isolationDecisionCount >= 8);
    assert.ok(summary.allowCount >= 1);
    assert.ok(summary.denyCount >= 1);
    assert.ok(summary.restrictCount >= 1);
  });

  it('includes upstream projection counts', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext()
    );
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext()
    );
    const sessionResult = createSessionRuntime().execute(createSessionContext());
    const authorizationResult = createAuthorizationRuntime().execute(
      createAuthorizationContext()
    );
    const summary = buildTenantIsolationSummary(
      [],
      identityResult.identities,
      authenticationResult.authentications,
      sessionResult.sessions,
      authorizationResult.authorizations,
      0,
      0,
      false
    );
    assert.equal(summary.identityProjectionCount, 6);
    assert.equal(summary.authenticationProjectionCount, 7);
    assert.equal(summary.sessionProjectionCount, 8);
    assert.equal(summary.authorizationProjectionCount, 8);
    assert.equal(summary.success, false);
  });

  it('marks success false when hasErrors', () => {
    const summary = buildTenantIsolationSummary(
      [],
      [],
      [],
      [],
      [],
      0,
      0,
      true
    );
    assert.equal(summary.success, false);
  });
});

describe('buildTenantIsolationSummaryItems', () => {
  it('includes telemetry-aligned keys', () => {
    const ctx = createTenantIsolationContext({ actorId: 'actor-x' });
    const projections = [
      toTenantIsolationProjection(BUILTIN_TENANT_ISOLATION_MODULES[0])
    ];
    const summary = buildTenantIsolationSummary(
      projections,
      [],
      [],
      [],
      [],
      1,
      0,
      false
    );
    const items = buildTenantIsolationSummaryItems(ctx, summary, []);
    const keys = items.map((item) => item.key);
    assert.ok(keys.includes('locale'));
    assert.ok(keys.includes('tenant-count'));
    assert.ok(keys.includes('membership-count'));
    assert.ok(keys.includes('isolation-decision-count'));
    assert.ok(keys.includes('allow-count'));
    assert.ok(keys.includes('deny-count'));
    assert.ok(keys.includes('restrict-count'));
    assert.ok(keys.includes('actor-id'));
    assert.ok(keys.includes('success'));
  });

  it('includes tenant identity and decision filters', () => {
    const ctx = createTenantIsolationContext({
      tenantId: 'tenant-platform',
      identityId: 'identity-platform-owner-001',
      decisionOutcome: 'allow'
    });
    const summary = buildTenantIsolationSummary(
      [],
      [],
      [],
      [],
      [],
      0,
      0,
      false
    );
    const items = buildTenantIsolationSummaryItems(ctx, summary, []);
    assert.ok(items.some((item) => item.key === 'tenant-id'));
    assert.ok(items.some((item) => item.key === 'identity-id'));
    assert.ok(items.some((item) => item.key === 'decision-outcome-filter'));
  });

  it('reports has-errors from validation issues', () => {
    const summary = buildTenantIsolationSummary(
      [],
      [],
      [],
      [],
      [],
      0,
      0,
      true
    );
    const items = buildTenantIsolationSummaryItems(
      createTenantIsolationContext(),
      summary,
      [{ code: 'INVALID_LOCALE', message: 'x', severity: 'error' }]
    );
    const hasErrors = items.find((item) => item.key === 'has-errors');
    assert.equal(hasErrors.value, true);
  });
});

describe('TenantIsolationRuntime.execute', () => {
  it('executes full pipeline for default context', () => {
    const result = createTenantIsolationRuntime().execute(
      createTenantIsolationContext()
    );
    assert.equal(result.isolations.length, 9);
    assert.equal(result.identityProjections.length, 0);
    assert.equal(result.authenticationProjections.length, 0);
    assert.equal(result.sessionProjections.length, 0);
    assert.equal(result.authorizationProjections.length, 0);
    assert.equal(result.summary.success, true);
    assert.ok(result.summary.tenantCount >= 4);
    assert.ok(result.summary.membershipCount >= 6);
    assert.ok(result.summary.isolationDecisionCount >= 8);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.telemetry.durationMs >= 0);
    assert.equal(result.telemetry.tenantCount, result.summary.tenantCount);
    assert.equal(
      result.telemetry.membershipCount,
      result.summary.membershipCount
    );
    assert.equal(
      result.telemetry.isolationDecisionCount,
      result.summary.isolationDecisionCount
    );
    assert.ok(result.telemetry.summaryItemCount >= 10);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
  });

  it('projects full upstream chain then isolation', () => {
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
    const authorizationResult = createAuthorizationRuntime().execute(
      createAuthorizationContext({
        identityResult,
        authenticationResult,
        sessionResult,
        authorizationIds: ['authz-owner-001', 'authz-padmin-002']
      })
    );
    const result = createTenantIsolationRuntime().execute(
      createTenantIsolationContext({
        identityResult,
        authenticationResult,
        sessionResult,
        authorizationResult
      })
    );
    assert.equal(result.identityProjections.length, 2);
    assert.equal(result.authenticationProjections.length, 2);
    assert.equal(result.sessionProjections.length, 2);
    assert.equal(result.authorizationProjections.length, 2);
    assert.ok(result.isolations.length >= 2);
    assert.ok(
      result.isolations.every((item) =>
        ['authz-owner-001', 'authz-padmin-002'].includes(
          BUILTIN_TENANT_ISOLATION_MODULES.find((m) => m.id === item.isolationId)
            ?.authorizationId ?? ''
        )
      )
    );
  });

  it('projects only requested isolations', () => {
    const result = createTenantIsolationRuntime().execute(
      createTenantIsolationContext({
        isolationIds: ['iso-demo-member-005']
      })
    );
    assert.equal(result.isolations.length, 1);
    assert.equal(result.isolations[0].isolationId, 'iso-demo-member-005');
    assert.equal(result.summary.tenantCount, 1);
  });

  it('filters by decisionOutcome deny', () => {
    const result = createTenantIsolationRuntime().execute(
      createTenantIsolationContext({ decisionOutcome: 'deny' })
    );
    assert.ok(result.isolations.length >= 1);
    assert.ok(
      result.isolations.every((item) =>
        item.decisions.some((d) => d.outcome === 'deny')
      )
    );
  });

  it('reports warnings for unknown ids', () => {
    const result = createTenantIsolationRuntime().execute(
      createTenantIsolationContext({
        isolationIds: ['iso-platform-001', 'ghost']
      })
    );
    assert.equal(result.isolations.length, 1);
    assert.equal(result.summary.unavailableCount, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_ISOLATION_ID')
    );
  });

  it('fails summary on invalid locale error', () => {
    const result = createTenantIsolationRuntime().execute(
      createTenantIsolationContext({ locale: 'xx' })
    );
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some(
        (i) => i.code === 'INVALID_LOCALE' && i.severity === 'error'
      )
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(createTenantIsolationRuntime().getRegistry().count(), 9);
  });

  it('accepts custom empty registry', () => {
    const result = createTenantIsolationRuntime(
      createTenantIsolationRegistry(false)
    ).execute(createTenantIsolationContext());
    assert.equal(result.isolations.length, 0);
    assert.equal(result.summary.success, false);
    assert.equal(result.telemetry.isolationDecisionCount, 0);
  });

  it('all projections have projected true', () => {
    const result = createTenantIsolationRuntime().execute(
      createTenantIsolationContext()
    );
    assert.ok(result.isolations.every((item) => item.projected === true));
  });

  it('summaryItems align with telemetry counts', () => {
    const result = createTenantIsolationRuntime().execute(
      createTenantIsolationContext({ locale: 'en' })
    );
    const tenantCount = result.summaryItems.find(
      (item) => item.key === 'tenant-count'
    );
    const membershipCount = result.summaryItems.find(
      (item) => item.key === 'membership-count'
    );
    const decisionCount = result.summaryItems.find(
      (item) => item.key === 'isolation-decision-count'
    );
    assert.equal(tenantCount.value, result.telemetry.tenantCount);
    assert.equal(membershipCount.value, result.telemetry.membershipCount);
    assert.equal(
      decisionCount.value,
      result.telemetry.isolationDecisionCount
    );
  });

  it('TenantIsolationResult shape includes all pipeline outputs', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext()
    );
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({ identityResult })
    );
    const sessionResult = createSessionRuntime().execute(
      createSessionContext({ identityResult, authenticationResult })
    );
    const authorizationResult = createAuthorizationRuntime().execute(
      createAuthorizationContext({
        identityResult,
        authenticationResult,
        sessionResult
      })
    );
    const result = createTenantIsolationRuntime().execute(
      createTenantIsolationContext({
        identityResult,
        authenticationResult,
        sessionResult,
        authorizationResult,
        actorId: 'a1'
      })
    );
    assert.ok(Array.isArray(result.identityProjections));
    assert.ok(Array.isArray(result.authenticationProjections));
    assert.ok(Array.isArray(result.sessionProjections));
    assert.ok(Array.isArray(result.authorizationProjections));
    assert.ok(Array.isArray(result.isolations));
    assert.ok(result.summary);
    assert.ok(Array.isArray(result.summaryItems));
    assert.ok(Array.isArray(result.validationIssues));
    assert.ok(result.telemetry);
    assert.equal(typeof result.telemetry.durationMs, 'number');
  });
});

describe('Tenant Isolation telemetry helpers', () => {
  it('PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY is tenantIsolationResult', () => {
    assert.equal(
      PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY,
      'tenantIsolationResult'
    );
  });
});

describe('Tenant Isolation model shape', () => {
  it('builtin modules include Tenant Identity Boundary Membership Scope Rule Access Decision', () => {
    for (const module of BUILTIN_TENANT_ISOLATION_MODULES) {
      assert.ok(module.tenantIdentity.tenantId);
      assert.ok(module.tenantIdentity.slug);
      assert.ok(module.boundary.boundaryId);
      assert.equal(typeof module.boundary.strict, 'boolean');
      assert.ok(Array.isArray(module.memberships));
      assert.ok(Array.isArray(module.scopes));
      assert.ok(Array.isArray(module.isolationRules));
      assert.ok(module.accessScope.accessScopeId);
      assert.ok(Array.isArray(module.accessScope.allowedTenantIds));
      assert.ok(Array.isArray(module.decisions));
      for (const decision of module.decisions) {
        assert.ok(['allow', 'deny', 'restrict'].includes(decision.outcome));
        assert.ok(decision.sourceTenantId);
        assert.ok(decision.targetTenantId);
      }
    }
  });

  it('covers allow deny and restrict decisions', () => {
    const outcomes = new Set(
      BUILTIN_TENANT_ISOLATION_MODULES.flatMap((m) =>
        m.decisions.map((d) => d.outcome)
      )
    );
    assert.ok(outcomes.has('allow'));
    assert.ok(outcomes.has('deny'));
    assert.ok(outcomes.has('restrict'));
  });

  it('covers platform tenant membership and self scopes', () => {
    const levels = new Set(
      BUILTIN_TENANT_ISOLATION_MODULES.flatMap((m) =>
        m.scopes.map((s) => s.level)
      )
    );
    assert.ok(levels.has('platform'));
    assert.ok(levels.has('tenant'));
    assert.ok(levels.has('membership'));
    assert.ok(levels.has('self'));
  });

  it('suspended isolation has inactive membership and deny decision', () => {
    const suspended = getBuiltinTenantIsolationModule('iso-susp-004');
    assert.ok(suspended);
    assert.equal(suspended.memberships[0].active, false);
    assert.ok(suspended.decisions.every((d) => d.outcome === 'deny'));
    assert.equal(suspended.accessScope.allowedTenantIds.length, 0);
  });

  it('platform admin isolation allows cross-tenant restrict access', () => {
    const padmin = getBuiltinTenantIsolationModule('iso-padmin-006');
    assert.ok(padmin);
    assert.equal(padmin.accessScope.crossTenantAllowed, true);
    assert.ok(padmin.accessScope.allowedTenantIds.includes('tenant-demo-001'));
    assert.ok(padmin.decisions.some((d) => d.outcome === 'restrict'));
  });
});
