/**
 * Authentication Adapter Foundation — EPIC-301A (en az 60 unit test)
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
  createAuthenticationAdapter,
  createAuthenticationProviderRegistry,
  createAuthenticationProviderRegistryRuntime,
  createAuthenticationProviderContext,
  createAuthenticationProviderResult,
  createAuthenticationProviderFailure,
  createAuthenticationProviderSuccess,
  validateAuthenticationProviderContext,
  resolveAuthenticationProvider,
  resolveAuthenticationProviderRegistration,
  hasAuthenticationProviderValidationErrors,
  BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS,
  BUILTIN_AUTHENTICATION_PROVIDER_COUNT,
  getBuiltinAuthenticationProviderRegistration,
  AuthenticationProviderRegistry,
  AuthenticationProviderRegistryRuntime,
  AuthenticationAdapter
} = await import('../../src/identity/index.ts');

function createMockProvider(overrides = {}) {
  const baseResult = (operation, context) =>
    createAuthenticationProviderSuccess(
      operation,
      context.providerId,
      {
        durationMs: 1,
        startedAt: '2026-07-22T00:00:00.000Z',
        endedAt: '2026-07-22T00:00:00.001Z',
        operation,
        providerId: context.providerId
      },
      {
        principalId: 'principal-mock-001',
        identityId: 'identity-mock-001',
        displayName: 'Mock User'
      },
      {
        credentialId: 'cred-mock-001',
        method: 'password'
      }
    );

  return {
    id: 'provider-password-001',
    method: 'password',
    authenticate: (context) => baseResult('authenticate', context),
    refresh: (context) => baseResult('refresh', context),
    logout: async (context) =>
      createAuthenticationProviderResult({
        success: true,
        status: 'unauthenticated',
        operation: 'logout',
        providerId: context.providerId,
        telemetry: {
          durationMs: 1,
          startedAt: '2026-07-22T00:00:00.000Z',
          endedAt: '2026-07-22T00:00:00.001Z',
          operation: 'logout',
          providerId: context.providerId
        }
      }),
    getCurrentUser: (context) => baseResult('getCurrentUser', context),
    validateSession: (context) => baseResult('validateSession', context),
    ...overrides
  };
}

describe('AuthenticationProviderRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createAuthenticationProviderRegistry(true);
  });

  it('seeds all 6 builtin provider registrations', () => {
    assert.equal(registry.registrationCount(), 6);
    assert.equal(BUILTIN_AUTHENTICATION_PROVIDER_COUNT, 6);
    assert.equal(BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS.length, 6);
  });

  it('returns registrations sorted by order', () => {
    const items = registry.getAllRegistrations();
    assert.equal(items[0].id, 'provider-password-001');
    assert.equal(items[items.length - 1].id, 'provider-session-ref-006');
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i].order >= items[i - 1].order);
    }
  });

  it('getRegistrationById returns password provider metadata', () => {
    const entry = registry.getRegistrationById('provider-password-001');
    assert.ok(entry);
    assert.equal(entry.method, 'password');
    assert.equal(entry.providerRegistered, false);
  });

  it('getBuiltinAuthenticationProviderRegistration resolves oauth slot', () => {
    const entry = getBuiltinAuthenticationProviderRegistration('provider-oauth-003');
    assert.ok(entry);
    assert.equal(entry.name, 'OAuth');
    assert.equal(entry.method, 'oauth');
  });

  it('registerRegistration adds a new metadata entry', () => {
    registry.registerRegistration({
      id: 'provider-custom-099',
      name: 'Custom',
      description: 'Custom provider slot',
      method: 'api-key',
      providerRegistered: false,
      order: 99
    });
    assert.equal(registry.registrationCount(), 7);
    assert.ok(registry.getRegistrationById('provider-custom-099'));
  });

  it('registerRegistration throws on duplicate id', () => {
    assert.throws(
      () =>
        registry.registerRegistration(BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS[0]),
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
          method: 'password',
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
          id: 'provider-no-name',
          name: '',
          description: 'X',
          method: 'password',
          providerRegistered: false,
          order: 1
        }),
      /name zorunludur/
    );
  });

  it('registerProvider attaches implementation to metadata', () => {
    const provider = createMockProvider();
    registry.registerProvider(provider);
    assert.equal(registry.registeredProviderCount(), 1);
    assert.equal(
      registry.getRegistrationById('provider-password-001')?.providerRegistered,
      true
    );
    assert.ok(registry.getProviderById('provider-password-001'));
  });

  it('registerProvider throws when metadata missing', () => {
    assert.throws(
      () =>
        registry.registerProvider({
          ...createMockProvider(),
          id: 'provider-unknown'
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

  it('registerProvider throws on method mismatch', () => {
    assert.throws(
      () =>
        registry.registerProvider(
          createMockProvider({ method: 'oauth' })
        ),
      /method uyuşmazlığı/
    );
  });

  it('unregisterProvider removes implementation but keeps metadata', () => {
    registry.registerProvider(createMockProvider());
    assert.equal(registry.unregisterProvider('provider-password-001'), true);
    assert.equal(registry.registeredProviderCount(), 0);
    assert.equal(
      registry.getRegistrationById('provider-password-001')?.providerRegistered,
      false
    );
  });

  it('unregisterRegistration throws when implementation exists', () => {
    registry.registerProvider(createMockProvider());
    assert.throws(
      () => registry.unregisterRegistration('provider-password-001'),
      /metadata silinemez/
    );
  });

  it('unregisterRegistration removes metadata when no implementation', () => {
    registry.registerRegistration({
      id: 'provider-temp-100',
      name: 'Temp',
      description: 'Temp',
      method: 'password',
      providerRegistered: false,
      order: 100
    });
    assert.equal(registry.unregisterRegistration('provider-temp-100'), true);
    assert.equal(registry.registrationCount(), 6);
  });

  it('getByMethod returns oauth and oidc slots separately', () => {
    const oauth = registry.getByMethod('oauth');
    assert.equal(oauth.length, 1);
    assert.equal(oauth[0].id, 'provider-oauth-003');
    const oidc = registry.getByMethod('oidc');
    assert.equal(oidc.length, 1);
    assert.equal(oidc[0].id, 'provider-oidc-004');
  });

  it('hasRegistration and hasProvider reflect state', () => {
    assert.equal(registry.hasRegistration('provider-password-001'), true);
    assert.equal(registry.hasProvider('provider-password-001'), false);
    registry.registerProvider(createMockProvider());
    assert.equal(registry.hasProvider('provider-password-001'), true);
  });

  it('isMethodSupported validates method for provider', () => {
    assert.equal(
      registry.isMethodSupported('provider-password-001', 'password'),
      true
    );
    assert.equal(
      registry.isMethodSupported('provider-password-001', 'oauth'),
      false
    );
  });

  it('getRegisteredProviders returns sorted implementations', () => {
    registry.registerProvider(createMockProvider());
    const providers = registry.getRegisteredProviders();
    assert.equal(providers.length, 1);
    assert.equal(providers[0].id, 'provider-password-001');
  });

  it('clear removes all registrations and providers', () => {
    registry.registerProvider(createMockProvider());
    registry.clear();
    assert.equal(registry.registrationCount(), 0);
    assert.equal(registry.registeredProviderCount(), 0);
  });

  it('AuthenticationProviderRegistryRuntime alias matches registry', () => {
    const runtime = createAuthenticationProviderRegistryRuntime(true);
    assert.ok(runtime instanceof AuthenticationProviderRegistryRuntime);
    assert.equal(runtime.registrationCount(), 6);
  });
});

describe('AuthenticationProviderContext', () => {
  it('createAuthenticationProviderContext defaults locale to tr', () => {
    const context = createAuthenticationProviderContext({
      providerId: 'provider-password-001'
    });
    assert.equal(context.locale, 'tr');
    assert.equal(context.providerId, 'provider-password-001');
  });

  it('createAuthenticationProviderContext preserves optional fields', () => {
    const context = createAuthenticationProviderContext({
      locale: 'en',
      providerId: 'provider-password-001',
      operation: 'authenticate',
      method: 'password',
      identityId: 'identity-001',
      sessionId: 'session-001',
      credentialId: 'cred-001',
      actorId: 'actor-001',
      bag: { traceId: 't-1' }
    });
    assert.equal(context.locale, 'en');
    assert.equal(context.operation, 'authenticate');
    assert.equal(context.identityId, 'identity-001');
    assert.equal(context.bag?.traceId, 't-1');
  });
});

describe('AuthenticationProviderResult factories', () => {
  const telemetry = {
    durationMs: 5,
    startedAt: '2026-07-22T00:00:00.000Z',
    endedAt: '2026-07-22T00:00:00.005Z',
    operation: 'authenticate',
    providerId: 'provider-password-001'
  };

  it('createAuthenticationProviderResult freezes validation issues', () => {
    const result = createAuthenticationProviderResult({
      success: false,
      status: 'unauthenticated',
      operation: 'authenticate',
      providerId: 'provider-password-001',
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

  it('createAuthenticationProviderFailure returns unauthenticated by default', () => {
    const result = createAuthenticationProviderFailure(
      'authenticate',
      'provider-password-001',
      telemetry,
      [{ code: 'FAIL', message: 'failed', severity: 'error' }]
    );
    assert.equal(result.success, false);
    assert.equal(result.status, 'unauthenticated');
  });

  it('createAuthenticationProviderSuccess includes principal and credential', () => {
    const result = createAuthenticationProviderSuccess(
      'authenticate',
      'provider-password-001',
      telemetry,
      {
        principalId: 'p1',
        identityId: 'i1',
        displayName: 'User'
      },
      { credentialId: 'c1', method: 'password' }
    );
    assert.equal(result.success, true);
    assert.equal(result.status, 'authenticated');
    assert.equal(result.principal?.principalId, 'p1');
    assert.equal(result.credentialReference?.credentialId, 'c1');
  });
});

describe('validateAuthenticationProviderContext', () => {
  let registry;

  beforeEach(() => {
    registry = createAuthenticationProviderRegistry(true);
  });

  it('returns error when providerId missing', () => {
    const issues = validateAuthenticationProviderContext(
      createAuthenticationProviderContext({ providerId: '' }),
      registry
    );
    assert.ok(issues.some((item) => item.code === 'PROVIDER_ID_REQUIRED'));
  });

  it('returns error when provider not found', () => {
    const issues = validateAuthenticationProviderContext(
      createAuthenticationProviderContext({ providerId: 'missing' }),
      registry
    );
    assert.ok(issues.some((item) => item.code === 'PROVIDER_NOT_FOUND'));
  });

  it('returns warning on method mismatch', () => {
    const issues = validateAuthenticationProviderContext(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001',
        method: 'oauth'
      }),
      registry
    );
    assert.ok(issues.some((item) => item.code === 'METHOD_MISMATCH'));
  });

  it('hasAuthenticationProviderValidationErrors detects errors only', () => {
    assert.equal(
      hasAuthenticationProviderValidationErrors([
        { code: 'W', message: 'w', severity: 'warning' }
      ]),
      false
    );
    assert.equal(
      hasAuthenticationProviderValidationErrors([
        { code: 'E', message: 'e', severity: 'error' }
      ]),
      true
    );
  });

  it('resolveAuthenticationProvider returns undefined without implementation', () => {
    const context = createAuthenticationProviderContext({
      providerId: 'provider-password-001'
    });
    assert.equal(resolveAuthenticationProvider(context, registry), undefined);
  });

  it('resolveAuthenticationProviderRegistration returns metadata', () => {
    const context = createAuthenticationProviderContext({
      providerId: 'provider-magic-link-002'
    });
    const registration = resolveAuthenticationProviderRegistration(
      context,
      registry
    );
    assert.ok(registration);
    assert.equal(registration.method, 'magic-link');
  });
});

describe('AuthenticationAdapter without provider implementation', () => {
  let adapter;

  beforeEach(() => {
    adapter = createAuthenticationAdapter(
      createAuthenticationProviderRegistry(true)
    );
  });

  it('authenticate returns PROVIDER_NOT_IMPLEMENTED for builtin slot', async () => {
    const result = await adapter.authenticate(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.operation, 'authenticate');
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'PROVIDER_NOT_IMPLEMENTED'
      )
    );
  });

  it('refresh returns failure when provider not implemented', async () => {
    const result = await adapter.refresh(
      createAuthenticationProviderContext({
        providerId: 'provider-oauth-003'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.operation, 'refresh');
  });

  it('logout returns failure when provider not implemented', async () => {
    const result = await adapter.logout(
      createAuthenticationProviderContext({
        providerId: 'provider-oidc-004'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.operation, 'logout');
  });

  it('getCurrentUser returns failure when provider not implemented', async () => {
    const result = await adapter.getCurrentUser(
      createAuthenticationProviderContext({
        providerId: 'provider-api-key-005'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.operation, 'getCurrentUser');
  });

  it('validateSession returns failure when provider not implemented', async () => {
    const result = await adapter.validateSession(
      createAuthenticationProviderContext({
        providerId: 'provider-session-ref-006'
      })
    );
    assert.equal(result.success, false);
    assert.equal(result.operation, 'validateSession');
  });

  it('returns PROVIDER_ID_REQUIRED when providerId empty', async () => {
    const result = await adapter.authenticate(
      createAuthenticationProviderContext({ providerId: '' })
    );
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'PROVIDER_ID_REQUIRED'
      )
    );
  });

  it('returns PROVIDER_NOT_FOUND for unknown provider', async () => {
    const result = await adapter.authenticate(
      createAuthenticationProviderContext({ providerId: 'provider-unknown' })
    );
    assert.ok(
      result.validationIssues.some((item) => item.code === 'PROVIDER_NOT_FOUND')
    );
  });

  it('includes telemetry on failure results', async () => {
    const result = await adapter.authenticate(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.equal(result.telemetry.providerId, 'provider-password-001');
    assert.equal(result.telemetry.operation, 'authenticate');
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
  });

  it('getRegistry returns injected registry', () => {
    const registry = createAuthenticationProviderRegistry(false);
    const localAdapter = createAuthenticationAdapter(registry);
    assert.equal(localAdapter.getRegistry(), registry);
  });
});

describe('AuthenticationAdapter with mock provider', () => {
  let adapter;
  let registry;

  beforeEach(() => {
    registry = createAuthenticationProviderRegistry(true);
    registry.registerProvider(createMockProvider());
    adapter = createAuthenticationAdapter(registry);
  });

  it('authenticate delegates to provider and succeeds', async () => {
    const result = await adapter.authenticate(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001',
        identityId: 'identity-mock-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.status, 'authenticated');
    assert.equal(result.principal?.identityId, 'identity-mock-001');
  });

  it('refresh delegates to provider', async () => {
    const result = await adapter.refresh(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'refresh');
  });

  it('logout delegates to provider and returns unauthenticated', async () => {
    const result = await adapter.logout(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.status, 'unauthenticated');
  });

  it('getCurrentUser delegates to provider', async () => {
    const result = await adapter.getCurrentUser(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'getCurrentUser');
    assert.equal(result.principal?.displayName, 'Mock User');
  });

  it('validateSession delegates to provider', async () => {
    const result = await adapter.validateSession(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001',
        sessionId: 'session-001'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'validateSession');
  });

  it('merges adapter summary items with provider summary items', async () => {
    const customProvider = createMockProvider({
      authenticate: (context) =>
        createAuthenticationProviderSuccess(
          'authenticate',
          context.providerId,
          {
            durationMs: 1,
            startedAt: '2026-07-22T00:00:00.000Z',
            endedAt: '2026-07-22T00:00:00.001Z',
            operation: 'authenticate',
            providerId: context.providerId
          },
          {
            principalId: 'p',
            identityId: 'i',
            displayName: 'U'
          },
          { credentialId: 'c', method: 'password' },
          'authenticated',
          [{ key: 'custom', label: 'Custom', value: true }]
        )
    });
    registry.unregisterProvider('provider-password-001');
    registry.registerProvider(customProvider);

    const result = await adapter.authenticate(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.ok(result.summaryItems.some((item) => item.key === 'operation'));
    assert.ok(result.summaryItems.some((item) => item.key === 'custom'));
  });

  it('supports async provider implementations', async () => {
    const asyncProvider = createMockProvider({
      authenticate: async (context) =>
        createAuthenticationProviderSuccess(
          'authenticate',
          context.providerId,
          {
            durationMs: 2,
            startedAt: '2026-07-22T00:00:00.000Z',
            endedAt: '2026-07-22T00:00:00.002Z',
            operation: 'authenticate',
            providerId: context.providerId
          },
          {
            principalId: 'async-p',
            identityId: 'async-i',
            displayName: 'Async'
          },
          { credentialId: 'async-c', method: 'password' }
        )
    });
    registry.unregisterProvider('provider-password-001');
    registry.registerProvider(asyncProvider);

    const result = await adapter.authenticate(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.equal(result.principal?.displayName, 'Async');
  });

  it('preserves context bag on successful operations when provider has no bag', async () => {
    const result = await adapter.authenticate(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001',
        bag: { requestId: 'req-42' }
      })
    );
    assert.equal(result.bag?.requestId, 'req-42');
  });
});

describe('Builtin provider metadata coverage', () => {
  it('covers all authentication methods in builtin registrations', () => {
    const methods = BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS.map(
      (entry) => entry.method
    );
    assert.deepEqual(methods, [
      'password',
      'magic-link',
      'oauth',
      'oidc',
      'api-key',
      'session-ref'
    ]);
  });

  it('all builtin registrations start unregistered', () => {
    for (const entry of BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS) {
      assert.equal(entry.providerRegistered, false);
    }
  });

  it('AuthenticationAdapter is constructable via class', () => {
    const registry = createAuthenticationProviderRegistry(true);
    const instance = new AuthenticationAdapter(registry);
    assert.ok(instance instanceof AuthenticationAdapter);
    assert.equal(instance.getRegistry().registrationCount(), 6);
  });

  it('each builtin registration has non-empty name and description', () => {
    for (const entry of BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS) {
      assert.ok(entry.name.length > 0);
      assert.ok(entry.description.length > 0);
    }
  });

  it('builtin registration orders are unique', () => {
    const orders = BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS.map(
      (entry) => entry.order
    );
    assert.equal(new Set(orders).size, orders.length);
  });
});

describe('AuthenticationAdapter operation edge cases', () => {
  let adapter;
  let registry;

  beforeEach(() => {
    registry = createAuthenticationProviderRegistry(true);
    registry.registerProvider(createMockProvider());
    adapter = createAuthenticationAdapter(registry);
  });

  it('sets operation on context during authenticate', async () => {
    const result = await adapter.authenticate(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.equal(result.telemetry.operation, 'authenticate');
  });

  it('sets operation on context during refresh', async () => {
    const result = await adapter.refresh(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.equal(result.telemetry.operation, 'refresh');
  });

  it('sets operation on context during logout', async () => {
    const result = await adapter.logout(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.equal(result.telemetry.operation, 'logout');
  });

  it('sets operation on context during getCurrentUser', async () => {
    const result = await adapter.getCurrentUser(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.equal(result.telemetry.operation, 'getCurrentUser');
  });

  it('sets operation on context during validateSession', async () => {
    const result = await adapter.validateSession(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.equal(result.telemetry.operation, 'validateSession');
  });

  it('propagates provider validation issues on success path', async () => {
    const warningProvider = createMockProvider({
      authenticate: (context) =>
        createAuthenticationProviderResult({
          success: true,
          status: 'authenticated',
          operation: 'authenticate',
          providerId: context.providerId,
          validationIssues: [
            { code: 'WARN', message: 'soft warning', severity: 'warning' }
          ],
          telemetry: {
            durationMs: 1,
            startedAt: '2026-07-22T00:00:00.000Z',
            endedAt: '2026-07-22T00:00:00.001Z',
            operation: 'authenticate',
            providerId: context.providerId
          }
        })
    });
    registry.unregisterProvider('provider-password-001');
    registry.registerProvider(warningProvider);

    const result = await adapter.authenticate(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001'
      })
    );
    assert.ok(result.validationIssues.some((item) => item.code === 'WARN'));
  });

  it('returns method mismatch warning without blocking when provider exists', async () => {
    const result = await adapter.authenticate(
      createAuthenticationProviderContext({
        providerId: 'provider-password-001',
        method: 'oauth'
      })
    );
    assert.equal(result.success, true);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'METHOD_MISMATCH')
    );
  });

  it('createAuthenticationAdapter uses default seeded registry', () => {
    const defaultAdapter = createAuthenticationAdapter();
    assert.equal(defaultAdapter.getRegistry().registrationCount(), 6);
  });

  it('registry exposes AuthenticationProviderRegistry class', () => {
    const instance = new AuthenticationProviderRegistry(true);
    assert.ok(instance instanceof AuthenticationProviderRegistry);
    assert.equal(instance.registrationCount(), 6);
  });

  it('failure result summary items remain empty by default', async () => {
    const result = await adapter.authenticate(
      createAuthenticationProviderContext({ providerId: 'provider-oauth-003' })
    );
    assert.equal(result.success, false);
    assert.equal(result.summaryItems.length, 0);
  });
});
