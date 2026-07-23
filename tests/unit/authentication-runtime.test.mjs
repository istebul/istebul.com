/**
 * Authentication Runtime — PR-203B (en az 50 unit test)
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
  createAuthenticationRuntime,
  createAuthenticationRegistry,
  createAuthenticationRegistryRuntime,
  createAuthenticationContext,
  validateAuthenticationContext,
  resolveIdentityProjections,
  resolveRequestedAuthentications,
  buildAuthenticationSummary,
  buildAuthenticationSummaryItems,
  toAuthenticationProjection,
  BUILTIN_AUTHENTICATION_MODULES,
  BUILTIN_AUTHENTICATION_MODULE_COUNT,
  getBuiltinAuthenticationModule,
  PIPELINE_BAG_AUTHENTICATION_RESULT_KEY,
  AuthenticationRegistry,
  AuthenticationRegistryRuntime,
  createIdentityRuntime,
  createIdentityContext
} = await import('../../src/identity/index.ts');

describe('AuthenticationRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createAuthenticationRegistry(true);
  });

  it('seeds all 7 builtin authentication modules', () => {
    assert.equal(registry.count(), 7);
    assert.equal(BUILTIN_AUTHENTICATION_MODULE_COUNT, 7);
    assert.equal(BUILTIN_AUTHENTICATION_MODULES.length, 7);
  });

  it('returns authentications sorted by order', () => {
    const items = registry.getAll();
    assert.equal(items[0].id, 'auth-owner-001');
    assert.equal(items[items.length - 1].id, 'auth-anon-007');
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i].order >= items[i - 1].order);
    }
  });

  it('getById returns owner authentication', () => {
    const owner = registry.getById('auth-owner-001');
    assert.ok(owner);
    assert.equal(owner.state.status, 'authenticated');
    assert.equal(owner.state.principal.identityId, 'identity-platform-owner-001');
  });

  it('getBuiltinAuthenticationModule resolves business admin auth', () => {
    const mod = getBuiltinAuthenticationModule('auth-badmin-003');
    assert.ok(mod);
    assert.equal(mod.state.method, 'magic-link');
    assert.equal(mod.state.principal.tenantId, 'tenant-demo-001');
  });

  it('register adds a new authentication module', () => {
    registry.register({
      id: 'auth-custom-099',
      state: {
        stateId: 'state-custom-099',
        status: 'pending',
        principal: {
          principalId: 'principal-custom-099',
          identityId: 'identity-custom',
          displayName: 'Custom'
        },
        credentialReference: {
          credentialId: 'cred-custom',
          method: 'api-key'
        },
        method: 'api-key'
      },
      order: 99,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z'
    });
    assert.equal(registry.count(), 8);
    assert.ok(registry.getById('auth-custom-099'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_AUTHENTICATION_MODULES[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          id: '',
          state: {
            stateId: 's',
            status: 'pending',
            principal: {
              principalId: 'p',
              identityId: 'i',
              displayName: 'D'
            },
            credentialReference: { credentialId: 'c', method: 'password' },
            method: 'password'
          },
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /id zorunludur/
    );
  });

  it('register throws on missing principalId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'auth-bad-principal',
          state: {
            stateId: 's',
            status: 'pending',
            principal: {
              principalId: '',
              identityId: 'i',
              displayName: 'D'
            },
            credentialReference: { credentialId: 'c', method: 'password' },
            method: 'password'
          },
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /principalId zorunludur/
    );
  });

  it('register throws on missing identityId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'auth-bad-identity',
          state: {
            stateId: 's',
            status: 'pending',
            principal: {
              principalId: 'p',
              identityId: '',
              displayName: 'D'
            },
            credentialReference: { credentialId: 'c', method: 'password' },
            method: 'password'
          },
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /identityId zorunludur/
    );
  });

  it('unregister removes an authentication', () => {
    assert.ok(registry.unregister('auth-anon-007'));
    assert.equal(registry.count(), 6);
    assert.equal(registry.getById('auth-anon-007'), undefined);
  });

  it('getByIdentityId filters owner identity', () => {
    const items = registry.getByIdentityId('identity-platform-owner-001');
    assert.equal(items.length, 2);
    assert.ok(
      items.every(
        (item) => item.state.principal.identityId === 'identity-platform-owner-001'
      )
    );
  });

  it('getByStatus filters authenticated', () => {
    const items = registry.getByStatus('authenticated');
    assert.ok(items.length >= 3);
    assert.ok(items.every((item) => item.state.status === 'authenticated'));
  });

  it('authenticatedCount matches authenticated status', () => {
    assert.equal(
      registry.authenticatedCount(),
      registry.getByStatus('authenticated').length
    );
  });

  it('clear empties the registry', () => {
    registry.clear();
    assert.equal(registry.count(), 0);
  });

  it('createAuthenticationRegistryRuntime aliases createAuthenticationRegistry', () => {
    const aliased = createAuthenticationRegistryRuntime(false);
    assert.ok(aliased instanceof AuthenticationRegistry);
    assert.equal(aliased.count(), 0);
  });

  it('AuthenticationRegistryRuntime is an alias of AuthenticationRegistry', () => {
    assert.equal(AuthenticationRegistryRuntime, AuthenticationRegistry);
  });
});

describe('AuthenticationContext', () => {
  it('createAuthenticationContext defaults locale to tr', () => {
    const ctx = createAuthenticationContext();
    assert.equal(ctx.locale, 'tr');
  });

  it('createAuthenticationContext accepts en locale', () => {
    const ctx = createAuthenticationContext({ locale: 'en' });
    assert.equal(ctx.locale, 'en');
  });

  it('createAuthenticationContext accepts filters', () => {
    const ctx = createAuthenticationContext({
      authenticationIds: ['auth-owner-001'],
      identityId: 'identity-platform-owner-001',
      status: 'authenticated',
      actorId: 'actor-1'
    });
    assert.deepEqual(ctx.authenticationIds, ['auth-owner-001']);
    assert.equal(ctx.identityId, 'identity-platform-owner-001');
    assert.equal(ctx.status, 'authenticated');
    assert.equal(ctx.actorId, 'actor-1');
  });
});

describe('validateAuthenticationContext', () => {
  let registry;

  beforeEach(() => {
    registry = createAuthenticationRegistry(true);
  });

  it('passes for valid default context', () => {
    const ctx = createAuthenticationContext();
    const issues = validateAuthenticationContext(ctx, registry);
    assert.equal(issues.length, 0);
  });

  it('errors on invalid locale', () => {
    const ctx = createAuthenticationContext({ locale: 'de' });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(
      issues.some((i) => i.code === 'INVALID_LOCALE' && i.severity === 'error')
    );
  });

  it('warns on empty authenticationIds array', () => {
    const ctx = createAuthenticationContext({ authenticationIds: [] });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'EMPTY_AUTHENTICATION_IDS'));
  });

  it('warns on unknown authentication id', () => {
    const ctx = createAuthenticationContext({
      authenticationIds: ['auth-owner-001', 'ghost']
    });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_AUTHENTICATION_ID'));
  });

  it('warns on duplicate authentication id', () => {
    const ctx = createAuthenticationContext({
      authenticationIds: ['auth-owner-001', 'auth-owner-001']
    });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'DUPLICATE_AUTHENTICATION_ID'));
  });

  it('errors on blank authentication id', () => {
    const ctx = createAuthenticationContext({ authenticationIds: ['  '] });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'INVALID_AUTHENTICATION_ID'));
  });

  it('warns on empty actorId', () => {
    const ctx = createAuthenticationContext({ actorId: '   ' });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });

  it('errors on empty identityId', () => {
    const ctx = createAuthenticationContext({ identityId: '  ' });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'EMPTY_IDENTITY_ID'));
  });

  it('warns on unknown identityId', () => {
    const ctx = createAuthenticationContext({ identityId: 'identity-missing' });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_IDENTITY_ID'));
  });

  it('errors on invalid status filter', () => {
    const ctx = createAuthenticationContext({ status: 'bogus' });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'INVALID_STATUS'));
  });

  it('warns when upstream identityResult is unsuccessful', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({ locale: 'xx' })
    );
    const ctx = createAuthenticationContext({ identityResult });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'IDENTITY_NOT_SUCCESS'));
  });

  it('passes with successful upstream identityResult', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext()
    );
    const ctx = createAuthenticationContext({ identityResult });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.equal(
      issues.filter((i) => i.code === 'IDENTITY_NOT_SUCCESS').length,
      0
    );
  });

  it('errors on invalid identityResult summary', () => {
    const ctx = createAuthenticationContext({
      identityResult: { identities: [], summary: {} }
    });
    const issues = validateAuthenticationContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'INVALID_IDENTITY_RESULT'));
  });
});

describe('resolveIdentityProjections', () => {
  it('returns empty when identityResult omitted', () => {
    const projections = resolveIdentityProjections(createAuthenticationContext());
    assert.equal(projections.length, 0);
  });

  it('returns identity projections from upstream IdentityResult', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({
        identityIds: ['identity-platform-owner-001', 'identity-business-admin-003']
      })
    );
    const projections = resolveIdentityProjections(
      createAuthenticationContext({ identityResult })
    );
    assert.equal(projections.length, 2);
    assert.equal(projections[0].identityId, 'identity-platform-owner-001');
    assert.equal(projections[0].projected, true);
  });
});

describe('resolveRequestedAuthentications', () => {
  let registry;

  beforeEach(() => {
    registry = createAuthenticationRegistry(true);
  });

  it('returns all authentications when filters omitted', () => {
    const ctx = createAuthenticationContext();
    const { authentications, requestedCount, unavailableCount } =
      resolveRequestedAuthentications(ctx, registry);
    assert.equal(authentications.length, 7);
    assert.equal(requestedCount, 7);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested authentication ids', () => {
    const ctx = createAuthenticationContext({
      authenticationIds: ['auth-owner-001', 'auth-badmin-003']
    });
    const { authentications, requestedCount, unavailableCount } =
      resolveRequestedAuthentications(ctx, registry);
    assert.equal(authentications.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
  });

  it('counts unavailable authentications for unknown ids', () => {
    const ctx = createAuthenticationContext({
      authenticationIds: ['auth-owner-001', 'missing']
    });
    const { authentications, unavailableCount } =
      resolveRequestedAuthentications(ctx, registry);
    assert.equal(authentications.length, 1);
    assert.equal(unavailableCount, 1);
  });

  it('filters by identityId', () => {
    const ctx = createAuthenticationContext({
      identityId: 'identity-platform-owner-001'
    });
    const { authentications } = resolveRequestedAuthentications(ctx, registry);
    assert.equal(authentications.length, 2);
  });

  it('filters by status', () => {
    const ctx = createAuthenticationContext({ status: 'expired' });
    const { authentications } = resolveRequestedAuthentications(ctx, registry);
    assert.equal(authentications.length, 1);
    assert.equal(authentications[0].id, 'auth-viewer-005');
  });

  it('filters by upstream identity projections when authenticationIds omitted', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({
        identityIds: ['identity-business-admin-003']
      })
    );
    const ctx = createAuthenticationContext({ identityResult });
    const { authentications } = resolveRequestedAuthentications(ctx, registry);
    assert.equal(authentications.length, 1);
    assert.equal(authentications[0].id, 'auth-badmin-003');
  });

  it('combines identityId with authenticationIds', () => {
    const ctx = createAuthenticationContext({
      identityId: 'identity-platform-owner-001',
      authenticationIds: ['auth-owner-001', 'auth-badmin-003']
    });
    const { authentications, unavailableCount } =
      resolveRequestedAuthentications(ctx, registry);
    assert.equal(authentications.length, 1);
    assert.equal(authentications[0].id, 'auth-owner-001');
    assert.equal(unavailableCount, 1);
  });
});

describe('toAuthenticationProjection', () => {
  it('projects authentication module with projected flag', () => {
    const projection = toAuthenticationProjection(
      BUILTIN_AUTHENTICATION_MODULES[0]
    );
    assert.equal(projection.authenticationId, 'auth-owner-001');
    assert.equal(projection.projected, true);
    assert.equal(projection.status, 'authenticated');
    assert.equal(projection.method, 'session-ref');
    assert.equal(projection.principal.principalId, 'principal-owner-001');
    assert.equal(projection.credentialReference.credentialId, 'cred-owner-001');
    assert.equal(projection.state.stateId, 'state-owner-001');
  });

  it('copies principal without mutating source', () => {
    const source = BUILTIN_AUTHENTICATION_MODULES[2];
    const projection = toAuthenticationProjection(source);
    assert.notEqual(projection.principal, source.state.principal);
    assert.equal(projection.principal.displayName, 'Business Admin');
  });

  it('copies credential reference without mutating source', () => {
    const source = BUILTIN_AUTHENTICATION_MODULES[1];
    const projection = toAuthenticationProjection(source);
    assert.notEqual(
      projection.credentialReference,
      source.state.credentialReference
    );
    assert.equal(projection.credentialReference.method, 'password');
  });
});

describe('buildAuthenticationSummary', () => {
  it('builds summary with principal and state counts', () => {
    const projections = BUILTIN_AUTHENTICATION_MODULES.map((m) =>
      toAuthenticationProjection(m)
    );
    const summary = buildAuthenticationSummary(projections, [], 7, 0, false);
    assert.equal(summary.success, true);
    assert.equal(summary.authenticationStateCount, 7);
    assert.equal(summary.authenticatedPrincipalCount, 3);
    assert.equal(summary.statusCounts.authenticated, 3);
    assert.equal(summary.statusCounts.pending, 1);
    assert.equal(summary.statusCounts.expired, 1);
    assert.equal(summary.statusCounts.revoked, 1);
    assert.equal(summary.statusCounts.unauthenticated, 1);
  });

  it('includes identity projection count', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext()
    );
    const summary = buildAuthenticationSummary(
      [],
      identityResult.identities,
      0,
      0,
      false
    );
    assert.equal(summary.identityProjectionCount, 6);
    assert.equal(summary.success, false);
  });

  it('marks success false when hasErrors', () => {
    const summary = buildAuthenticationSummary([], [], 0, 0, true);
    assert.equal(summary.success, false);
  });
});

describe('buildAuthenticationSummaryItems', () => {
  it('includes telemetry-aligned keys', () => {
    const ctx = createAuthenticationContext({ actorId: 'actor-x' });
    const projections = [toAuthenticationProjection(BUILTIN_AUTHENTICATION_MODULES[0])];
    const summary = buildAuthenticationSummary(projections, [], 1, 0, false);
    const items = buildAuthenticationSummaryItems(ctx, summary, []);
    const keys = items.map((item) => item.key);
    assert.ok(keys.includes('locale'));
    assert.ok(keys.includes('authentication-state-count'));
    assert.ok(keys.includes('authenticated-principal-count'));
    assert.ok(keys.includes('identity-projection-count'));
    assert.ok(keys.includes('actor-id'));
    assert.ok(keys.includes('success'));
  });

  it('includes identity-id and status-filter when present', () => {
    const ctx = createAuthenticationContext({
      identityId: 'identity-platform-owner-001',
      status: 'authenticated'
    });
    const summary = buildAuthenticationSummary([], [], 0, 0, false);
    const items = buildAuthenticationSummaryItems(ctx, summary, []);
    assert.ok(items.some((item) => item.key === 'identity-id'));
    assert.ok(items.some((item) => item.key === 'status-filter'));
  });

  it('reports has-errors from validation issues', () => {
    const ctx = createAuthenticationContext();
    const summary = buildAuthenticationSummary([], [], 0, 0, true);
    const items = buildAuthenticationSummaryItems(ctx, summary, [
      { code: 'INVALID_LOCALE', message: 'x', severity: 'error' }
    ]);
    const hasErrors = items.find((item) => item.key === 'has-errors');
    assert.equal(hasErrors.value, true);
  });
});

describe('AuthenticationRuntime.execute', () => {
  it('executes full pipeline for default context', () => {
    const runtime = createAuthenticationRuntime();
    const result = runtime.execute(createAuthenticationContext());
    assert.equal(result.authentications.length, 7);
    assert.equal(result.identityProjections.length, 0);
    assert.equal(result.summary.success, true);
    assert.equal(result.summary.authenticatedPrincipalCount, 3);
    assert.equal(result.summary.authenticationStateCount, 7);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.telemetry.durationMs >= 0);
    assert.equal(result.telemetry.authenticatedPrincipalCount, 3);
    assert.equal(result.telemetry.authenticationStateCount, 7);
    assert.ok(result.telemetry.summaryItemCount >= 9);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
  });

  it('projects identity then authentication when identityResult provided', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({
        identityIds: [
          'identity-platform-owner-001',
          'identity-platform-admin-002'
        ]
      })
    );
    const runtime = createAuthenticationRuntime();
    const result = runtime.execute(
      createAuthenticationContext({ identityResult })
    );
    assert.equal(result.identityProjections.length, 2);
    assert.equal(result.summary.identityProjectionCount, 2);
    assert.ok(result.authentications.length >= 2);
    assert.ok(
      result.authentications.every((item) =>
        [
          'identity-platform-owner-001',
          'identity-platform-admin-002'
        ].includes(item.principal.identityId)
      )
    );
  });

  it('projects only requested authentications', () => {
    const runtime = createAuthenticationRuntime();
    const result = runtime.execute(
      createAuthenticationContext({
        authenticationIds: ['auth-member-004']
      })
    );
    assert.equal(result.authentications.length, 1);
    assert.equal(result.authentications[0].authenticationId, 'auth-member-004');
    assert.equal(result.summary.authenticationStateCount, 1);
    assert.equal(result.summary.authenticatedPrincipalCount, 0);
  });

  it('filters by status authenticated', () => {
    const runtime = createAuthenticationRuntime();
    const result = runtime.execute(
      createAuthenticationContext({ status: 'authenticated' })
    );
    assert.equal(result.authentications.length, 3);
    assert.equal(result.summary.authenticatedPrincipalCount, 3);
    assert.ok(
      result.authentications.every((item) => item.status === 'authenticated')
    );
  });

  it('reports warnings for unknown ids', () => {
    const runtime = createAuthenticationRuntime();
    const result = runtime.execute(
      createAuthenticationContext({
        authenticationIds: ['auth-owner-001', 'ghost']
      })
    );
    assert.equal(result.authentications.length, 1);
    assert.equal(result.summary.unavailableCount, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_AUTHENTICATION_ID')
    );
  });

  it('fails summary on invalid locale error', () => {
    const runtime = createAuthenticationRuntime();
    const result = runtime.execute(createAuthenticationContext({ locale: 'xx' }));
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some(
        (i) => i.code === 'INVALID_LOCALE' && i.severity === 'error'
      )
    );
  });

  it('exposes registry via getRegistry', () => {
    const runtime = createAuthenticationRuntime();
    assert.equal(runtime.getRegistry().count(), 7);
  });

  it('accepts custom empty registry', () => {
    const empty = createAuthenticationRegistry(false);
    const runtime = createAuthenticationRuntime(empty);
    const result = runtime.execute(createAuthenticationContext());
    assert.equal(result.authentications.length, 0);
    assert.equal(result.summary.success, false);
    assert.equal(result.telemetry.authenticationStateCount, 0);
  });

  it('all projections have projected true', () => {
    const runtime = createAuthenticationRuntime();
    const result = runtime.execute(createAuthenticationContext());
    assert.ok(result.authentications.every((item) => item.projected === true));
  });

  it('summaryItems align with telemetry counts', () => {
    const runtime = createAuthenticationRuntime();
    const result = runtime.execute(createAuthenticationContext({ locale: 'en' }));
    const stateCount = result.summaryItems.find(
      (item) => item.key === 'authentication-state-count'
    );
    const principalCount = result.summaryItems.find(
      (item) => item.key === 'authenticated-principal-count'
    );
    assert.equal(stateCount.value, result.telemetry.authenticationStateCount);
    assert.equal(
      principalCount.value,
      result.telemetry.authenticatedPrincipalCount
    );
  });

  it('AuthenticationResult includes identityProjections authentications summary telemetry', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext()
    );
    const result = createAuthenticationRuntime().execute(
      createAuthenticationContext({ identityResult, actorId: 'a1' })
    );
    assert.ok(Array.isArray(result.identityProjections));
    assert.ok(Array.isArray(result.authentications));
    assert.ok(result.summary);
    assert.ok(Array.isArray(result.summaryItems));
    assert.ok(Array.isArray(result.validationIssues));
    assert.ok(result.telemetry);
    assert.equal(typeof result.telemetry.durationMs, 'number');
  });
});

describe('Authentication telemetry helpers', () => {
  it('PIPELINE_BAG_AUTHENTICATION_RESULT_KEY is authenticationResult', () => {
    assert.equal(PIPELINE_BAG_AUTHENTICATION_RESULT_KEY, 'authenticationResult');
  });
});

describe('Authentication model shape', () => {
  it('builtin modules include State Principal Credential Method Status', () => {
    for (const module of BUILTIN_AUTHENTICATION_MODULES) {
      assert.ok(module.state.stateId);
      assert.ok(module.state.status);
      assert.ok(module.state.principal.principalId);
      assert.ok(module.state.principal.identityId);
      assert.ok(module.state.credentialReference.credentialId);
      assert.ok(module.state.method);
      assert.equal(module.state.method, module.state.credentialReference.method);
    }
  });

  it('covers all authentication statuses', () => {
    const statuses = new Set(
      BUILTIN_AUTHENTICATION_MODULES.map((m) => m.state.status)
    );
    assert.ok(statuses.has('authenticated'));
    assert.ok(statuses.has('unauthenticated'));
    assert.ok(statuses.has('expired'));
    assert.ok(statuses.has('revoked'));
    assert.ok(statuses.has('pending'));
  });

  it('covers multiple authentication methods', () => {
    const methods = new Set(
      BUILTIN_AUTHENTICATION_MODULES.map((m) => m.state.method)
    );
    assert.ok(methods.has('session-ref'));
    assert.ok(methods.has('password'));
    assert.ok(methods.has('magic-link'));
    assert.ok(methods.has('oauth'));
    assert.ok(methods.has('oidc'));
    assert.ok(methods.has('api-key'));
  });

  it('revoked authentication links to suspended identity', () => {
    const revoked = getBuiltinAuthenticationModule('auth-susp-006');
    assert.ok(revoked);
    assert.equal(revoked.state.status, 'revoked');
    assert.equal(
      revoked.state.principal.identityId,
      'identity-suspended-006'
    );
  });
});
