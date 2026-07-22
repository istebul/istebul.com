/**
 * Session Management Runtime — PR-203C (en az 60 unit test)
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
  createSessionRuntime,
  createSessionRegistry,
  createSessionRegistryRuntime,
  createSessionContext,
  validateSessionContext,
  resolveSessionIdentityProjections,
  resolveSessionAuthenticationProjections,
  resolveRequestedSessions,
  buildSessionSummary,
  buildSessionSummaryItems,
  toSessionProjection,
  BUILTIN_SESSION_MODULES,
  BUILTIN_SESSION_MODULE_COUNT,
  getBuiltinSessionModule,
  PIPELINE_BAG_SESSION_RESULT_KEY,
  SessionRegistry,
  SessionRegistryRuntime,
  createIdentityRuntime,
  createIdentityContext,
  createAuthenticationRuntime,
  createAuthenticationContext
} = await import('../../src/identity/index.ts');

describe('SessionRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createSessionRegistry(true);
  });

  it('seeds all 8 builtin session modules', () => {
    assert.equal(registry.count(), 8);
    assert.equal(BUILTIN_SESSION_MODULE_COUNT, 8);
    assert.equal(BUILTIN_SESSION_MODULES.length, 8);
  });

  it('returns sessions sorted by order', () => {
    const items = registry.getAll();
    assert.equal(items[0].id, 'session-owner-001');
    assert.equal(items[items.length - 1].id, 'session-anon-008');
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i].order >= items[i - 1].order);
    }
  });

  it('getById returns owner session', () => {
    const owner = registry.getById('session-owner-001');
    assert.ok(owner);
    assert.equal(owner.session.state, 'active');
    assert.equal(owner.session.identityId, 'identity-platform-owner-001');
  });

  it('getBySessionId resolves sess-badmin-003', () => {
    const mod = registry.getBySessionId('sess-badmin-003');
    assert.ok(mod);
    assert.equal(mod.id, 'session-badmin-003');
  });

  it('getBuiltinSessionModule resolves viewer session', () => {
    const mod = getBuiltinSessionModule('session-viewer-005');
    assert.ok(mod);
    assert.equal(mod.session.state, 'expired');
    assert.equal(mod.session.expiration.isExpired, true);
  });

  it('register adds a new session module', () => {
    registry.register({
      id: 'session-custom-099',
      session: {
        sessionId: 'sess-custom-099',
        identityId: 'identity-custom',
        authenticationId: 'auth-custom',
        principalId: 'principal-custom',
        state: 'pending',
        lifetime: { startedAt: '2026-07-22T00:00:00.000Z' },
        expiration: {
          expiresAt: '2026-07-22T01:00:00.000Z',
          isExpired: false
        },
        renewalReference: { renewalId: 'renew-custom' },
        activity: {
          lastActivityAt: '2026-07-22T00:00:00.000Z',
          activityCount: 0
        },
        deviceReference: { deviceId: 'device-custom', platform: 'web' }
      },
      order: 99,
      createdAt: '2026-07-22T00:00:00.000Z',
      updatedAt: '2026-07-22T00:00:00.000Z'
    });
    assert.equal(registry.count(), 9);
    assert.ok(registry.getById('session-custom-099'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_SESSION_MODULES[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          id: '',
          session: {
            sessionId: 's',
            identityId: 'i',
            authenticationId: 'a',
            principalId: 'p',
            state: 'pending',
            lifetime: { startedAt: '2026-01-01T00:00:00.000Z' },
            expiration: {
              expiresAt: '2026-01-01T01:00:00.000Z',
              isExpired: false
            },
            renewalReference: { renewalId: 'r' },
            activity: {
              lastActivityAt: '2026-01-01T00:00:00.000Z',
              activityCount: 0
            },
            deviceReference: { deviceId: 'd' }
          },
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /id zorunludur/
    );
  });

  it('register throws on missing sessionId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'session-bad-sid',
          session: {
            sessionId: '',
            identityId: 'i',
            authenticationId: 'a',
            principalId: 'p',
            state: 'pending',
            lifetime: { startedAt: '2026-01-01T00:00:00.000Z' },
            expiration: {
              expiresAt: '2026-01-01T01:00:00.000Z',
              isExpired: false
            },
            renewalReference: { renewalId: 'r' },
            activity: {
              lastActivityAt: '2026-01-01T00:00:00.000Z',
              activityCount: 0
            },
            deviceReference: { deviceId: 'd' }
          },
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /sessionId zorunludur/
    );
  });

  it('register throws on missing identityId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'session-bad-identity',
          session: {
            sessionId: 's',
            identityId: '',
            authenticationId: 'a',
            principalId: 'p',
            state: 'pending',
            lifetime: { startedAt: '2026-01-01T00:00:00.000Z' },
            expiration: {
              expiresAt: '2026-01-01T01:00:00.000Z',
              isExpired: false
            },
            renewalReference: { renewalId: 'r' },
            activity: {
              lastActivityAt: '2026-01-01T00:00:00.000Z',
              activityCount: 0
            },
            deviceReference: { deviceId: 'd' }
          },
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /identityId zorunludur/
    );
  });

  it('register throws on missing authenticationId', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'session-bad-auth',
          session: {
            sessionId: 's',
            identityId: 'i',
            authenticationId: '',
            principalId: 'p',
            state: 'pending',
            lifetime: { startedAt: '2026-01-01T00:00:00.000Z' },
            expiration: {
              expiresAt: '2026-01-01T01:00:00.000Z',
              isExpired: false
            },
            renewalReference: { renewalId: 'r' },
            activity: {
              lastActivityAt: '2026-01-01T00:00:00.000Z',
              activityCount: 0
            },
            deviceReference: { deviceId: 'd' }
          },
          order: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
      /authenticationId zorunludur/
    );
  });

  it('unregister removes a session', () => {
    assert.ok(registry.unregister('session-anon-008'));
    assert.equal(registry.count(), 7);
    assert.equal(registry.getById('session-anon-008'), undefined);
  });

  it('getByIdentityId filters owner identity sessions', () => {
    const items = registry.getByIdentityId('identity-platform-owner-001');
    assert.equal(items.length, 3);
  });

  it('getByAuthenticationId filters auth-owner-001', () => {
    const items = registry.getByAuthenticationId('auth-owner-001');
    assert.equal(items.length, 2);
  });

  it('getByState filters active', () => {
    const items = registry.getByState('active');
    assert.ok(items.length >= 3);
    assert.ok(items.every((item) => item.session.state === 'active'));
  });

  it('activeCount and expiredCount aggregate correctly', () => {
    assert.equal(registry.activeCount(), registry.getByState('active').length);
    assert.ok(registry.expiredCount() >= 2);
  });

  it('clear empties the registry', () => {
    registry.clear();
    assert.equal(registry.count(), 0);
  });

  it('createSessionRegistryRuntime aliases createSessionRegistry', () => {
    const aliased = createSessionRegistryRuntime(false);
    assert.ok(aliased instanceof SessionRegistry);
    assert.equal(aliased.count(), 0);
  });

  it('SessionRegistryRuntime is an alias of SessionRegistry', () => {
    assert.equal(SessionRegistryRuntime, SessionRegistry);
  });
});

describe('SessionContext', () => {
  it('createSessionContext defaults locale to tr', () => {
    const ctx = createSessionContext();
    assert.equal(ctx.locale, 'tr');
  });

  it('createSessionContext accepts en locale', () => {
    const ctx = createSessionContext({ locale: 'en' });
    assert.equal(ctx.locale, 'en');
  });

  it('createSessionContext accepts filters', () => {
    const ctx = createSessionContext({
      sessionIds: ['session-owner-001'],
      identityId: 'identity-platform-owner-001',
      authenticationId: 'auth-owner-001',
      state: 'active',
      actorId: 'actor-1'
    });
    assert.deepEqual(ctx.sessionIds, ['session-owner-001']);
    assert.equal(ctx.identityId, 'identity-platform-owner-001');
    assert.equal(ctx.authenticationId, 'auth-owner-001');
    assert.equal(ctx.state, 'active');
    assert.equal(ctx.actorId, 'actor-1');
  });
});

describe('validateSessionContext', () => {
  let registry;

  beforeEach(() => {
    registry = createSessionRegistry(true);
  });

  it('passes for valid default context', () => {
    const issues = validateSessionContext(createSessionContext(), registry);
    assert.equal(issues.length, 0);
  });

  it('errors on invalid locale', () => {
    const issues = validateSessionContext(
      createSessionContext({ locale: 'de' }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'INVALID_LOCALE' && i.severity === 'error')
    );
  });

  it('warns on empty sessionIds array', () => {
    const issues = validateSessionContext(
      createSessionContext({ sessionIds: [] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_SESSION_IDS'));
  });

  it('warns on unknown session id', () => {
    const issues = validateSessionContext(
      createSessionContext({ sessionIds: ['session-owner-001', 'ghost'] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_SESSION_ID'));
  });

  it('warns on duplicate session id', () => {
    const issues = validateSessionContext(
      createSessionContext({
        sessionIds: ['session-owner-001', 'session-owner-001']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'DUPLICATE_SESSION_ID'));
  });

  it('errors on blank session id', () => {
    const issues = validateSessionContext(
      createSessionContext({ sessionIds: ['  '] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_SESSION_ID'));
  });

  it('warns on empty actorId', () => {
    const issues = validateSessionContext(
      createSessionContext({ actorId: '   ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });

  it('errors on empty identityId', () => {
    const issues = validateSessionContext(
      createSessionContext({ identityId: '  ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_IDENTITY_ID'));
  });

  it('warns on unknown identityId', () => {
    const issues = validateSessionContext(
      createSessionContext({ identityId: 'identity-missing' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_IDENTITY_ID'));
  });

  it('errors on empty authenticationId', () => {
    const issues = validateSessionContext(
      createSessionContext({ authenticationId: '  ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_AUTHENTICATION_ID'));
  });

  it('warns on unknown authenticationId', () => {
    const issues = validateSessionContext(
      createSessionContext({ authenticationId: 'auth-missing' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_AUTHENTICATION_ID'));
  });

  it('errors on invalid state filter', () => {
    const issues = validateSessionContext(
      createSessionContext({ state: 'bogus' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_STATE'));
  });

  it('warns when upstream identityResult is unsuccessful', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({ locale: 'xx' })
    );
    const issues = validateSessionContext(
      createSessionContext({ identityResult }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'IDENTITY_NOT_SUCCESS'));
  });

  it('warns when upstream authenticationResult is unsuccessful', () => {
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({ locale: 'xx' })
    );
    const issues = validateSessionContext(
      createSessionContext({ authenticationResult }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'AUTHENTICATION_NOT_SUCCESS'));
  });

  it('errors on invalid identityResult summary', () => {
    const issues = validateSessionContext(
      createSessionContext({
        identityResult: { identities: [], summary: {} }
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_IDENTITY_RESULT'));
  });

  it('errors on invalid authenticationResult summary', () => {
    const issues = validateSessionContext(
      createSessionContext({
        authenticationResult: { authentications: [], summary: {} }
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_AUTHENTICATION_RESULT'));
  });

  it('accepts sessionId via sess-* form', () => {
    const issues = validateSessionContext(
      createSessionContext({ sessionIds: ['sess-owner-001'] }),
      registry
    );
    assert.equal(
      issues.filter((i) => i.code === 'UNKNOWN_SESSION_ID').length,
      0
    );
  });
});

describe('resolveSessionIdentityProjections', () => {
  it('returns empty when identityResult omitted', () => {
    assert.equal(
      resolveSessionIdentityProjections(createSessionContext()).length,
      0
    );
  });

  it('returns identity projections from upstream', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({
        identityIds: ['identity-platform-owner-001']
      })
    );
    const projections = resolveSessionIdentityProjections(
      createSessionContext({ identityResult })
    );
    assert.equal(projections.length, 1);
    assert.equal(projections[0].projected, true);
  });
});

describe('resolveSessionAuthenticationProjections', () => {
  it('returns empty when authenticationResult omitted', () => {
    assert.equal(
      resolveSessionAuthenticationProjections(createSessionContext()).length,
      0
    );
  });

  it('returns authentication projections from upstream', () => {
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({
        authenticationIds: ['auth-owner-001']
      })
    );
    const projections = resolveSessionAuthenticationProjections(
      createSessionContext({ authenticationResult })
    );
    assert.equal(projections.length, 1);
    assert.equal(projections[0].projected, true);
  });
});

describe('resolveRequestedSessions', () => {
  let registry;

  beforeEach(() => {
    registry = createSessionRegistry(true);
  });

  it('returns all sessions when filters omitted', () => {
    const { sessions, requestedCount, unavailableCount } =
      resolveRequestedSessions(createSessionContext(), registry);
    assert.equal(sessions.length, 8);
    assert.equal(requestedCount, 8);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested session module ids', () => {
    const { sessions, requestedCount, unavailableCount } =
      resolveRequestedSessions(
        createSessionContext({
          sessionIds: ['session-owner-001', 'session-badmin-003']
        }),
        registry
      );
    assert.equal(sessions.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
  });

  it('resolves by sess-* sessionId', () => {
    const { sessions } = resolveRequestedSessions(
      createSessionContext({ sessionIds: ['sess-viewer-005'] }),
      registry
    );
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].id, 'session-viewer-005');
  });

  it('counts unavailable sessions for unknown ids', () => {
    const { sessions, unavailableCount } = resolveRequestedSessions(
      createSessionContext({
        sessionIds: ['session-owner-001', 'missing']
      }),
      registry
    );
    assert.equal(sessions.length, 1);
    assert.equal(unavailableCount, 1);
  });

  it('filters by identityId', () => {
    const { sessions } = resolveRequestedSessions(
      createSessionContext({ identityId: 'identity-platform-owner-001' }),
      registry
    );
    assert.equal(sessions.length, 3);
  });

  it('filters by authenticationId', () => {
    const { sessions } = resolveRequestedSessions(
      createSessionContext({ authenticationId: 'auth-owner-001' }),
      registry
    );
    assert.equal(sessions.length, 2);
  });

  it('filters by state', () => {
    const { sessions } = resolveRequestedSessions(
      createSessionContext({ state: 'expired' }),
      registry
    );
    assert.equal(sessions.length, 2);
  });

  it('filters by upstream identity projections', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext({
        identityIds: ['identity-business-admin-003']
      })
    );
    const { sessions } = resolveRequestedSessions(
      createSessionContext({ identityResult }),
      registry
    );
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].id, 'session-badmin-003');
  });

  it('filters by upstream authentication projections', () => {
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({
        authenticationIds: ['auth-member-004']
      })
    );
    const { sessions } = resolveRequestedSessions(
      createSessionContext({ authenticationResult }),
      registry
    );
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].id, 'session-member-004');
  });

  it('combines identityId with sessionIds', () => {
    const { sessions, unavailableCount } = resolveRequestedSessions(
      createSessionContext({
        identityId: 'identity-platform-owner-001',
        sessionIds: ['session-owner-001', 'session-badmin-003']
      }),
      registry
    );
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].id, 'session-owner-001');
    assert.equal(unavailableCount, 1);
  });
});

describe('toSessionProjection', () => {
  it('projects session module with projected flag', () => {
    const projection = toSessionProjection(BUILTIN_SESSION_MODULES[0]);
    assert.equal(projection.sessionId, 'sess-owner-001');
    assert.equal(projection.projected, true);
    assert.equal(projection.state, 'active');
    assert.equal(projection.identityId, 'identity-platform-owner-001');
    assert.equal(projection.authenticationId, 'auth-owner-001');
    assert.equal(projection.lifetime.durationSeconds, 86400);
    assert.equal(projection.expiration.isExpired, false);
    assert.equal(projection.renewalReference.renewalId, 'renew-owner-001');
    assert.equal(projection.activity.activityCount, 12);
    assert.equal(projection.deviceReference.platform, 'web');
  });

  it('copies nested objects without mutating source', () => {
    const source = BUILTIN_SESSION_MODULES[2];
    const projection = toSessionProjection(source);
    assert.notEqual(projection.lifetime, source.session.lifetime);
    assert.notEqual(projection.activity, source.session.activity);
    assert.equal(projection.deviceReference.platform, 'ios');
  });
});

describe('buildSessionSummary', () => {
  it('builds summary with session active expired counts', () => {
    const projections = BUILTIN_SESSION_MODULES.map((m) =>
      toSessionProjection(m)
    );
    const summary = buildSessionSummary(projections, [], [], 8, 0, false);
    assert.equal(summary.success, true);
    assert.equal(summary.sessionCount, 8);
    assert.equal(summary.activeSessionCount, 3);
    assert.ok(summary.expiredSessionCount >= 2);
    assert.equal(summary.stateCounts.active, 3);
    assert.equal(summary.stateCounts.idle, 1);
    assert.equal(summary.stateCounts.pending, 1);
    assert.equal(summary.stateCounts.revoked, 1);
  });

  it('includes identity and authentication projection counts', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext()
    );
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext()
    );
    const summary = buildSessionSummary(
      [],
      identityResult.identities,
      authenticationResult.authentications,
      0,
      0,
      false
    );
    assert.equal(summary.identityProjectionCount, 6);
    assert.equal(summary.authenticationProjectionCount, 7);
    assert.equal(summary.success, false);
  });

  it('marks success false when hasErrors', () => {
    const summary = buildSessionSummary([], [], [], 0, 0, true);
    assert.equal(summary.success, false);
  });

  it('counts expired via isExpired even if state differs', () => {
    const projections = [
      toSessionProjection(BUILTIN_SESSION_MODULES[5]) // revoked + isExpired
    ];
    const summary = buildSessionSummary(projections, [], [], 1, 0, false);
    assert.equal(summary.expiredSessionCount, 1);
    assert.equal(summary.stateCounts.revoked, 1);
  });
});

describe('buildSessionSummaryItems', () => {
  it('includes telemetry-aligned keys', () => {
    const ctx = createSessionContext({ actorId: 'actor-x' });
    const projections = [toSessionProjection(BUILTIN_SESSION_MODULES[0])];
    const summary = buildSessionSummary(projections, [], [], 1, 0, false);
    const items = buildSessionSummaryItems(ctx, summary, []);
    const keys = items.map((item) => item.key);
    assert.ok(keys.includes('locale'));
    assert.ok(keys.includes('session-count'));
    assert.ok(keys.includes('active-session-count'));
    assert.ok(keys.includes('expired-session-count'));
    assert.ok(keys.includes('actor-id'));
    assert.ok(keys.includes('success'));
  });

  it('includes identity authentication and state filters', () => {
    const ctx = createSessionContext({
      identityId: 'identity-platform-owner-001',
      authenticationId: 'auth-owner-001',
      state: 'active'
    });
    const summary = buildSessionSummary([], [], [], 0, 0, false);
    const items = buildSessionSummaryItems(ctx, summary, []);
    assert.ok(items.some((item) => item.key === 'identity-id'));
    assert.ok(items.some((item) => item.key === 'authentication-id'));
    assert.ok(items.some((item) => item.key === 'state-filter'));
  });

  it('reports has-errors from validation issues', () => {
    const summary = buildSessionSummary([], [], [], 0, 0, true);
    const items = buildSessionSummaryItems(createSessionContext(), summary, [
      { code: 'INVALID_LOCALE', message: 'x', severity: 'error' }
    ]);
    const hasErrors = items.find((item) => item.key === 'has-errors');
    assert.equal(hasErrors.value, true);
  });
});

describe('SessionRuntime.execute', () => {
  it('executes full pipeline for default context', () => {
    const result = createSessionRuntime().execute(createSessionContext());
    assert.equal(result.sessions.length, 8);
    assert.equal(result.identityProjections.length, 0);
    assert.equal(result.authenticationProjections.length, 0);
    assert.equal(result.summary.success, true);
    assert.equal(result.summary.sessionCount, 8);
    assert.equal(result.summary.activeSessionCount, 3);
    assert.ok(result.summary.expiredSessionCount >= 2);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.telemetry.durationMs >= 0);
    assert.equal(result.telemetry.sessionCount, 8);
    assert.equal(result.telemetry.activeSessionCount, 3);
    assert.ok(result.telemetry.expiredSessionCount >= 2);
    assert.ok(result.telemetry.summaryItemCount >= 10);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
  });

  it('projects identity authentication then sessions when upstream provided', () => {
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
    const result = createSessionRuntime().execute(
      createSessionContext({ identityResult, authenticationResult })
    );
    assert.equal(result.identityProjections.length, 2);
    assert.equal(result.authenticationProjections.length, 2);
    assert.ok(result.sessions.length >= 2);
    assert.ok(
      result.sessions.every((item) =>
        ['auth-owner-001', 'auth-padmin-002'].includes(item.authenticationId)
      )
    );
  });

  it('projects only requested sessions', () => {
    const result = createSessionRuntime().execute(
      createSessionContext({ sessionIds: ['session-member-004'] })
    );
    assert.equal(result.sessions.length, 1);
    assert.equal(result.sessions[0].sessionId, 'sess-member-004');
    assert.equal(result.summary.sessionCount, 1);
    assert.equal(result.summary.activeSessionCount, 0);
  });

  it('filters by state active', () => {
    const result = createSessionRuntime().execute(
      createSessionContext({ state: 'active' })
    );
    assert.equal(result.sessions.length, 3);
    assert.equal(result.summary.activeSessionCount, 3);
    assert.ok(result.sessions.every((item) => item.state === 'active'));
  });

  it('reports warnings for unknown ids', () => {
    const result = createSessionRuntime().execute(
      createSessionContext({
        sessionIds: ['session-owner-001', 'ghost']
      })
    );
    assert.equal(result.sessions.length, 1);
    assert.equal(result.summary.unavailableCount, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_SESSION_ID')
    );
  });

  it('fails summary on invalid locale error', () => {
    const result = createSessionRuntime().execute(
      createSessionContext({ locale: 'xx' })
    );
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some(
        (i) => i.code === 'INVALID_LOCALE' && i.severity === 'error'
      )
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(createSessionRuntime().getRegistry().count(), 8);
  });

  it('accepts custom empty registry', () => {
    const result = createSessionRuntime(
      createSessionRegistry(false)
    ).execute(createSessionContext());
    assert.equal(result.sessions.length, 0);
    assert.equal(result.summary.success, false);
    assert.equal(result.telemetry.sessionCount, 0);
  });

  it('all projections have projected true', () => {
    const result = createSessionRuntime().execute(createSessionContext());
    assert.ok(result.sessions.every((item) => item.projected === true));
  });

  it('summaryItems align with telemetry counts', () => {
    const result = createSessionRuntime().execute(
      createSessionContext({ locale: 'en' })
    );
    const sessionCount = result.summaryItems.find(
      (item) => item.key === 'session-count'
    );
    const activeCount = result.summaryItems.find(
      (item) => item.key === 'active-session-count'
    );
    const expiredCount = result.summaryItems.find(
      (item) => item.key === 'expired-session-count'
    );
    assert.equal(sessionCount.value, result.telemetry.sessionCount);
    assert.equal(activeCount.value, result.telemetry.activeSessionCount);
    assert.equal(expiredCount.value, result.telemetry.expiredSessionCount);
  });

  it('SessionResult shape includes all pipeline outputs', () => {
    const identityResult = createIdentityRuntime().execute(
      createIdentityContext()
    );
    const authenticationResult = createAuthenticationRuntime().execute(
      createAuthenticationContext({ identityResult })
    );
    const result = createSessionRuntime().execute(
      createSessionContext({
        identityResult,
        authenticationResult,
        actorId: 'a1'
      })
    );
    assert.ok(Array.isArray(result.identityProjections));
    assert.ok(Array.isArray(result.authenticationProjections));
    assert.ok(Array.isArray(result.sessions));
    assert.ok(result.summary);
    assert.ok(Array.isArray(result.summaryItems));
    assert.ok(Array.isArray(result.validationIssues));
    assert.ok(result.telemetry);
    assert.equal(typeof result.telemetry.durationMs, 'number');
  });
});

describe('Session telemetry helpers', () => {
  it('PIPELINE_BAG_SESSION_RESULT_KEY is sessionResult', () => {
    assert.equal(PIPELINE_BAG_SESSION_RESULT_KEY, 'sessionResult');
  });
});

describe('Session model shape', () => {
  it('builtin modules include Session State Lifetime Expiration Renewal Activity Device', () => {
    for (const module of BUILTIN_SESSION_MODULES) {
      const s = module.session;
      assert.ok(s.sessionId);
      assert.ok(s.identityId);
      assert.ok(s.authenticationId);
      assert.ok(s.principalId);
      assert.ok(s.state);
      assert.ok(s.lifetime.startedAt);
      assert.ok(s.expiration.expiresAt);
      assert.equal(typeof s.expiration.isExpired, 'boolean');
      assert.ok(s.renewalReference.renewalId);
      assert.ok(s.activity.lastActivityAt);
      assert.ok(typeof s.activity.activityCount === 'number');
      assert.ok(s.deviceReference.deviceId);
    }
  });

  it('covers all session states', () => {
    const states = new Set(BUILTIN_SESSION_MODULES.map((m) => m.session.state));
    assert.ok(states.has('active'));
    assert.ok(states.has('idle'));
    assert.ok(states.has('expired'));
    assert.ok(states.has('revoked'));
    assert.ok(states.has('pending'));
  });

  it('covers multiple device platforms', () => {
    const platforms = new Set(
      BUILTIN_SESSION_MODULES.map((m) => m.session.deviceReference.platform)
    );
    assert.ok(platforms.has('web'));
    assert.ok(platforms.has('ios'));
    assert.ok(platforms.has('android'));
    assert.ok(platforms.has('desktop'));
    assert.ok(platforms.has('unknown'));
  });

  it('lifetime duration is projection-only numeric field', () => {
    const owner = getBuiltinSessionModule('session-owner-001');
    assert.ok(owner);
    assert.equal(owner.session.lifetime.durationSeconds, 86400);
    assert.equal(owner.session.expiration.isExpired, false);
  });

  it('revoked session links to suspended identity and auth', () => {
    const revoked = getBuiltinSessionModule('session-susp-006');
    assert.ok(revoked);
    assert.equal(revoked.session.state, 'revoked');
    assert.equal(revoked.session.identityId, 'identity-suspended-006');
    assert.equal(revoked.session.authenticationId, 'auth-susp-006');
  });
});
