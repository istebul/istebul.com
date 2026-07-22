/**
 * Supabase Authentication Provider — EPIC-301B (en az 70 unit test)
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
  createSupabaseAuthenticationProvider,
  createSupabaseAuthenticationContext,
  toAuthenticationProviderContext,
  fromAuthenticationProviderContext,
  validateSupabaseAuthenticateCredentials,
  createSupabaseAuthenticationResult,
  toPrincipalFromSupabaseUser,
  toCredentialReferenceFromSupabaseSession,
  toAuthenticationProviderResult,
  assertSupabaseAuthClient,
  mapSupabaseErrorMessageToCode,
  mapSupabaseAuthError,
  mapUnknownProviderError,
  AuthenticationError,
  SessionExpired,
  InvalidCredentials,
  ProviderUnavailable,
  createAuthenticationErrorByCode,
  toAuthenticationError,
  SUPABASE_AUTHENTICATION_PROVIDER_ID,
  SUPABASE_AUTHENTICATION_PROVIDER_NAME,
  SUPABASE_CONTEXT_BAG_KEY,
  createSupabaseAuthenticationProviderRegistration,
  registerSupabaseAuthenticationProvider,
  createAuthenticationAdapterWithSupabaseProvider,
  attachSupabaseAuthenticationProvider,
  createAuthenticationProviderRegistry,
  createAuthenticationAdapter,
  SupabaseAuthenticationProvider
} = await import('../../src/identity/index.ts');

function createUser(overrides = {}) {
  return {
    id: 'user-001',
    email: 'user@example.com',
    user_metadata: { full_name: 'Demo User', tenant_id: 'tenant-1' },
    app_metadata: {},
    ...overrides
  };
}

function createSession(overrides = {}) {
  return {
    access_token: 'access-token-abc123',
    refresh_token: 'refresh-token-xyz',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: createUser(),
    ...overrides
  };
}

function createMockClient(overrides = {}) {
  return {
    auth: {
      signInWithPassword: async () => ({
        data: { user: createUser(), session: createSession() },
        error: null
      }),
      refreshSession: async () => ({
        data: { user: createUser(), session: createSession() },
        error: null
      }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({
        data: { user: createUser() },
        error: null
      }),
      getSession: async () => ({
        data: { session: createSession() },
        error: null
      }),
      ...overrides
    }
  };
}

describe('Provider initialization', () => {
  it('creates provider with injected client', () => {
    const client = createMockClient();
    const provider = createSupabaseAuthenticationProvider({ client });
    assert.equal(provider.id, SUPABASE_AUTHENTICATION_PROVIDER_ID);
    assert.equal(provider.method, 'password');
    assert.equal(provider.getClient(), client);
  });

  it('allows custom providerId and method', () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient(),
      providerId: 'custom-supabase',
      method: 'password'
    });
    assert.equal(provider.id, 'custom-supabase');
    assert.equal(provider.method, 'password');
  });

  it('throws when client is missing', () => {
    assert.throws(
      () => createSupabaseAuthenticationProvider({ client: null }),
      /Supabase Auth client zorunludur/
    );
  });

  it('throws when auth.signInWithPassword missing', () => {
    assert.throws(
      () =>
        createSupabaseAuthenticationProvider({
          client: { auth: { refreshSession: async () => ({}) } }
        }),
      /signInWithPassword zorunludur/
    );
  });

  it('assertSupabaseAuthClient accepts valid client', () => {
    assert.doesNotThrow(() => assertSupabaseAuthClient(createMockClient()));
  });

  it('assertSupabaseAuthClient rejects incomplete client', () => {
    assert.throws(
      () => assertSupabaseAuthClient({ auth: {} }),
      /zorunludur/
    );
  });

  it('does not create singleton — two factories are independent', () => {
    const a = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const b = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    assert.notEqual(a, b);
    assert.notEqual(a.getClient(), b.getClient());
  });

  it('SupabaseAuthenticationProvider is constructable', () => {
    const provider = new SupabaseAuthenticationProvider({
      client: createMockClient()
    });
    assert.ok(provider instanceof SupabaseAuthenticationProvider);
  });
});

describe('SupabaseAuthenticationContext', () => {
  it('defaults locale to tr', () => {
    const context = createSupabaseAuthenticationContext({
      email: 'a@b.com',
      password: 'secret'
    });
    assert.equal(context.locale, 'tr');
  });

  it('preserves optional fields', () => {
    const context = createSupabaseAuthenticationContext({
      locale: 'en',
      email: 'a@b.com',
      password: 'secret',
      refreshToken: 'r',
      accessToken: 'a',
      sessionId: 's',
      identityId: 'i',
      actorId: 'act',
      bag: { x: 1 }
    });
    assert.equal(context.refreshToken, 'r');
    assert.equal(context.bag.x, 1);
  });

  it('toAuthenticationProviderContext embeds credentials in bag', () => {
    const providerContext = toAuthenticationProviderContext(
      createSupabaseAuthenticationContext({
        email: 'a@b.com',
        password: 'secret'
      })
    );
    assert.equal(providerContext.providerId, SUPABASE_AUTHENTICATION_PROVIDER_ID);
    assert.equal(providerContext.method, 'password');
    assert.equal(
      providerContext.bag[SUPABASE_CONTEXT_BAG_KEY].email,
      'a@b.com'
    );
  });

  it('fromAuthenticationProviderContext restores credentials', () => {
    const roundTrip = fromAuthenticationProviderContext(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({
          email: 'a@b.com',
          password: 'secret',
          refreshToken: 'rt'
        })
      )
    );
    assert.equal(roundTrip.email, 'a@b.com');
    assert.equal(roundTrip.password, 'secret');
    assert.equal(roundTrip.refreshToken, 'rt');
  });

  it('validateSupabaseAuthenticateCredentials requires email', () => {
    assert.equal(
      validateSupabaseAuthenticateCredentials(
        createSupabaseAuthenticationContext({ password: 'x' })
      ),
      'email zorunludur.'
    );
  });

  it('validateSupabaseAuthenticateCredentials requires password', () => {
    assert.equal(
      validateSupabaseAuthenticateCredentials(
        createSupabaseAuthenticationContext({ email: 'a@b.com' })
      ),
      'password zorunludur.'
    );
  });

  it('validateSupabaseAuthenticateCredentials passes with both', () => {
    assert.equal(
      validateSupabaseAuthenticateCredentials(
        createSupabaseAuthenticationContext({
          email: 'a@b.com',
          password: 'x'
        })
      ),
      undefined
    );
  });
});

describe('SupabaseAuthenticationResult mapping', () => {
  const telemetry = {
    durationMs: 1,
    startedAt: '2026-07-22T00:00:00.000Z',
    endedAt: '2026-07-22T00:00:00.001Z',
    operation: 'authenticate',
    providerId: SUPABASE_AUTHENTICATION_PROVIDER_ID
  };

  it('createSupabaseAuthenticationResult freezes issues', () => {
    const result = createSupabaseAuthenticationResult({
      success: false,
      status: 'unauthenticated',
      operation: 'authenticate',
      validationIssues: [{ code: 'X', message: 'Y', severity: 'error' }],
      telemetry
    });
    assert.throws(() => {
      result.validationIssues.push({
        code: 'Z',
        message: 'W',
        severity: 'warning'
      });
    });
  });

  it('toPrincipalFromSupabaseUser maps fields', () => {
    const principal = toPrincipalFromSupabaseUser({
      id: 'u1',
      email: 'u@e.com',
      displayName: 'U',
      tenantId: 't1'
    });
    assert.equal(principal.identityId, 'u1');
    assert.equal(principal.displayName, 'U');
    assert.equal(principal.tenantId, 't1');
  });

  it('toCredentialReferenceFromSupabaseSession maps expiry', () => {
    const cred = toCredentialReferenceFromSupabaseSession(
      { expiresAt: 1700000000, sessionId: 'sess-1' },
      'u1'
    );
    assert.equal(cred.credentialId, 'sess-1');
    assert.equal(cred.method, 'password');
    assert.ok(cred.expiresAt);
  });

  it('toAuthenticationProviderResult maps success', () => {
    const mapped = toAuthenticationProviderResult(
      createSupabaseAuthenticationResult({
        success: true,
        status: 'authenticated',
        operation: 'authenticate',
        user: { id: 'u1', email: 'a@b.com', displayName: 'A' },
        session: { accessToken: 'a', refreshToken: 'r', expiresAt: 1700000000 },
        telemetry
      })
    );
    assert.equal(mapped.success, true);
    assert.equal(mapped.principal.identityId, 'u1');
    assert.ok(mapped.credentialReference);
  });

  it('toAuthenticationProviderResult maps error into validationIssues', () => {
    const mapped = toAuthenticationProviderResult(
      createSupabaseAuthenticationResult({
        success: false,
        status: 'unauthenticated',
        operation: 'authenticate',
        error: { code: 'InvalidCredentials', message: 'bad' },
        telemetry
      })
    );
    assert.equal(mapped.success, false);
    assert.ok(
      mapped.validationIssues.some((item) => item.code === 'InvalidCredentials')
    );
  });
});

describe('Error model', () => {
  it('AuthenticationError defaults code', () => {
    const error = new AuthenticationError('x');
    assert.equal(error.code, 'AuthenticationError');
    assert.equal(error.name, 'AuthenticationError');
  });

  it('SessionExpired uses SessionExpired code', () => {
    const error = new SessionExpired();
    assert.equal(error.code, 'SessionExpired');
    assert.ok(error instanceof AuthenticationError);
  });

  it('InvalidCredentials uses InvalidCredentials code', () => {
    const error = new InvalidCredentials();
    assert.equal(error.code, 'InvalidCredentials');
  });

  it('ProviderUnavailable uses ProviderUnavailable code', () => {
    const error = new ProviderUnavailable();
    assert.equal(error.code, 'ProviderUnavailable');
  });

  it('createAuthenticationErrorByCode covers all codes', () => {
    assert.ok(
      createAuthenticationErrorByCode('SessionExpired', 'a') instanceof
        SessionExpired
    );
    assert.ok(
      createAuthenticationErrorByCode('InvalidCredentials', 'a') instanceof
        InvalidCredentials
    );
    assert.ok(
      createAuthenticationErrorByCode('ProviderUnavailable', 'a') instanceof
        ProviderUnavailable
    );
    assert.ok(
      createAuthenticationErrorByCode('AuthenticationError', 'a') instanceof
        AuthenticationError
    );
  });

  it('toAuthenticationError wraps Error', () => {
    const mapped = toAuthenticationError(new Error('boom'));
    assert.equal(mapped.message, 'boom');
  });

  it('toAuthenticationError returns same AuthenticationError', () => {
    const original = new InvalidCredentials('x');
    assert.equal(toAuthenticationError(original), original);
  });

  it('toAuthenticationError handles string', () => {
    assert.equal(toAuthenticationError('oops').message, 'oops');
  });
});

describe('Error mapping', () => {
  it('maps invalid login credentials', () => {
    assert.equal(
      mapSupabaseErrorMessageToCode('Invalid login credentials'),
      'InvalidCredentials'
    );
  });

  it('maps jwt expired to SessionExpired', () => {
    assert.equal(
      mapSupabaseErrorMessageToCode('JWT expired'),
      'SessionExpired'
    );
  });

  it('maps network failure to ProviderUnavailable', () => {
    assert.equal(
      mapSupabaseErrorMessageToCode('Failed to fetch'),
      'ProviderUnavailable'
    );
  });

  it('maps 401 status to InvalidCredentials by default', () => {
    assert.equal(
      mapSupabaseErrorMessageToCode('unauthorized', 401),
      'InvalidCredentials'
    );
  });

  it('maps 503 status to ProviderUnavailable', () => {
    assert.equal(
      mapSupabaseErrorMessageToCode('down', 503),
      'ProviderUnavailable'
    );
  });

  it('mapSupabaseAuthError returns InvalidCredentials', () => {
    const error = mapSupabaseAuthError({
      message: 'Invalid login credentials',
      status: 400
    });
    assert.ok(error instanceof InvalidCredentials);
  });

  it('mapSupabaseAuthError returns SessionExpired', () => {
    const error = mapSupabaseAuthError({
      message: 'refresh_token_not_found'
    });
    assert.ok(error instanceof SessionExpired);
  });

  it('mapSupabaseAuthError returns ProviderUnavailable', () => {
    const error = mapSupabaseAuthError({ message: 'network timeout' });
    assert.ok(error instanceof ProviderUnavailable);
  });

  it('mapUnknownProviderError maps thrown Error with network text', () => {
    const error = mapUnknownProviderError(new Error('fetch failed'));
    assert.ok(error instanceof ProviderUnavailable);
  });

  it('mapUnknownProviderError maps plain object with message', () => {
    const error = mapUnknownProviderError({
      message: 'Invalid credentials'
    });
    assert.ok(error instanceof InvalidCredentials);
  });
});

describe('Authentication flow', () => {
  it('authenticate succeeds with valid credentials', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const result = await provider.authenticate(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({
          email: 'user@example.com',
          password: 'secret'
        })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.status, 'authenticated');
    assert.equal(result.principal.identityId, 'user-001');
    assert.equal(result.operation, 'authenticate');
  });

  it('authenticate fails without email/password', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const result = await provider.authenticate(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'InvalidCredentials'
      )
    );
  });

  it('authenticate maps supabase invalid credentials', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        signInWithPassword: async () => ({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials', status: 400 }
        })
      })
    });
    const result = await provider.authenticate(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({
          email: 'a@b.com',
          password: 'bad'
        })
      )
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'InvalidCredentials'
      )
    );
  });

  it('authenticate maps thrown network errors', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        signInWithPassword: async () => {
          throw new Error('Failed to fetch');
        }
      })
    });
    const result = await provider.authenticate(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({
          email: 'a@b.com',
          password: 'x'
        })
      )
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'ProviderUnavailable'
      )
    );
  });

  it('authenticateWithSupabaseContext returns supabase result shape', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const result = await provider.authenticateWithSupabaseContext(
      createSupabaseAuthenticationContext({
        email: 'user@example.com',
        password: 'secret'
      })
    );
    assert.equal(result.success, true);
    assert.equal(result.user.id, 'user-001');
    assert.ok(result.session.accessToken);
  });

  it('authenticate includes telemetry', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const result = await provider.authenticate(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({
          email: 'a@b.com',
          password: 'x'
        })
      )
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.equal(result.telemetry.providerId, SUPABASE_AUTHENTICATION_PROVIDER_ID);
  });
});

describe('Refresh flow', () => {
  it('refresh succeeds with refresh token', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const result = await provider.refresh(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({ refreshToken: 'rt' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'refresh');
    assert.equal(result.status, 'authenticated');
  });

  it('refresh maps expired token', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        refreshSession: async () => ({
          data: { user: null, session: null },
          error: { message: 'Invalid Refresh Token: Refresh Token Not Found' }
        })
      })
    });
    const result = await provider.refresh(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({ refreshToken: 'stale' })
      )
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some((item) => item.code === 'SessionExpired')
    );
    assert.equal(result.status, 'expired');
  });

  it('refresh fails when session missing in response', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        refreshSession: async () => ({
          data: { user: null, session: null },
          error: null
        })
      })
    });
    const result = await provider.refresh(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'AuthenticationError'
      )
    );
  });

  it('refresh maps thrown errors', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        refreshSession: async () => {
          throw new Error('network timeout');
        }
      })
    });
    const result = await provider.refresh(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'ProviderUnavailable'
      )
    );
  });
});

describe('Logout flow', () => {
  it('logout succeeds', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const result = await provider.logout(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.equal(result.success, true);
    assert.equal(result.status, 'unauthenticated');
    assert.equal(result.operation, 'logout');
  });

  it('logout maps supabase errors', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        signOut: async () => ({
          error: { message: 'service unavailable', status: 503 }
        })
      })
    });
    const result = await provider.logout(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'ProviderUnavailable'
      )
    );
  });

  it('logout maps thrown errors', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        signOut: async () => {
          throw new Error('Failed to fetch');
        }
      })
    });
    const result = await provider.logout(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'ProviderUnavailable'
      )
    );
  });
});

describe('getCurrentUser flow', () => {
  it('getCurrentUser succeeds', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const result = await provider.getCurrentUser(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({ accessToken: 'a' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.principal.displayName, 'Demo User');
  });

  it('getCurrentUser maps missing user', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        getUser: async () => ({ data: { user: null }, error: null })
      })
    });
    const result = await provider.getCurrentUser(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.equal(result.success, false);
  });

  it('getCurrentUser maps auth errors', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        getUser: async () => ({
          data: { user: null },
          error: { message: 'JWT expired' }
        })
      })
    });
    const result = await provider.getCurrentUser(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({ accessToken: 'stale' })
      )
    );
    assert.ok(
      result.validationIssues.some((item) => item.code === 'SessionExpired')
    );
  });
});

describe('Session validation', () => {
  it('validateSession succeeds with access token', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const result = await provider.validateSession(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({ accessToken: 'access' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'validateSession');
  });

  it('validateSession succeeds with active session', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const result = await provider.validateSession(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.equal(result.success, true);
    assert.ok(result.principal);
  });

  it('validateSession fails when no session', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        getSession: async () => ({ data: { session: null }, error: null })
      })
    });
    const result = await provider.validateSession(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.equal(result.success, false);
  });

  it('validateSession maps expired access token', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        getUser: async () => ({
          data: { user: null },
          error: { message: 'token has expired' }
        })
      })
    });
    const result = await provider.validateSession(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({ accessToken: 'expired' })
      )
    );
    assert.ok(
      result.validationIssues.some((item) => item.code === 'SessionExpired')
    );
  });

  it('validateSession maps getSession errors', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient({
        getSession: async () => ({
          data: { session: null },
          error: { message: 'AuthSessionMissingError' }
        })
      })
    });
    const result = await provider.validateSession(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.ok(
      result.validationIssues.some((item) => item.code === 'SessionExpired')
    );
  });
});

describe('Adapter integration', () => {
  it('createSupabaseAuthenticationProviderRegistration builds metadata', () => {
    const registration = createSupabaseAuthenticationProviderRegistration(12);
    assert.equal(registration.id, SUPABASE_AUTHENTICATION_PROVIDER_ID);
    assert.equal(registration.name, SUPABASE_AUTHENTICATION_PROVIDER_NAME);
    assert.equal(registration.method, 'password');
    assert.equal(registration.providerRegistered, false);
    assert.equal(registration.order, 12);
  });

  it('registerSupabaseAuthenticationProvider registers implementation', () => {
    const registry = createAuthenticationProviderRegistry(true);
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    registerSupabaseAuthenticationProvider(registry, provider);
    assert.equal(registry.hasRegistration(provider.id), true);
    assert.equal(registry.hasProvider(provider.id), true);
    assert.equal(
      registry.getRegistrationById(provider.id).providerRegistered,
      true
    );
  });

  it('registerSupabaseAuthenticationProvider is idempotent', () => {
    const registry = createAuthenticationProviderRegistry(false);
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    registerSupabaseAuthenticationProvider(registry, provider);
    registerSupabaseAuthenticationProvider(registry, provider);
    assert.equal(registry.registeredProviderCount(), 1);
  });

  it('createAuthenticationAdapterWithSupabaseProvider wires adapter', async () => {
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    const adapter = createAuthenticationAdapterWithSupabaseProvider(provider);
    const result = await adapter.authenticate(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({
          email: 'a@b.com',
          password: 'x'
        })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.providerId, SUPABASE_AUTHENTICATION_PROVIDER_ID);
  });

  it('attachSupabaseAuthenticationProvider binds to existing adapter', async () => {
    const adapter = createAuthenticationAdapter(
      createAuthenticationProviderRegistry(true)
    );
    const provider = createSupabaseAuthenticationProvider({
      client: createMockClient()
    });
    attachSupabaseAuthenticationProvider(adapter, provider);
    const result = await adapter.getCurrentUser(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({ accessToken: 'a' })
      )
    );
    assert.equal(result.success, true);
  });

  it('adapter refresh uses supabase provider', async () => {
    const adapter = createAuthenticationAdapterWithSupabaseProvider(
      createSupabaseAuthenticationProvider({ client: createMockClient() })
    );
    const result = await adapter.refresh(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({ refreshToken: 'rt' })
      )
    );
    assert.equal(result.success, true);
    assert.equal(result.operation, 'refresh');
  });

  it('adapter logout uses supabase provider', async () => {
    const adapter = createAuthenticationAdapterWithSupabaseProvider(
      createSupabaseAuthenticationProvider({ client: createMockClient() })
    );
    const result = await adapter.logout(
      toAuthenticationProviderContext(createSupabaseAuthenticationContext({}))
    );
    assert.equal(result.success, true);
    assert.equal(result.status, 'unauthenticated');
  });

  it('adapter validateSession uses supabase provider', async () => {
    const adapter = createAuthenticationAdapterWithSupabaseProvider(
      createSupabaseAuthenticationProvider({ client: createMockClient() })
    );
    const result = await adapter.validateSession(
      toAuthenticationProviderContext(
        createSupabaseAuthenticationContext({ accessToken: 'a' })
      )
    );
    assert.equal(result.success, true);
  });

  it('adapter still fails for unimplemented builtin slots', async () => {
    const adapter = createAuthenticationAdapterWithSupabaseProvider(
      createSupabaseAuthenticationProvider({ client: createMockClient() })
    );
    const result = await adapter.authenticate({
      locale: 'tr',
      providerId: 'provider-oauth-003'
    });
    assert.equal(result.success, false);
    assert.ok(
      result.validationIssues.some(
        (item) => item.code === 'PROVIDER_NOT_IMPLEMENTED'
      )
    );
  });
});

describe('Constants and display metadata', () => {
  it('exports stable supabase provider id', () => {
    assert.equal(SUPABASE_AUTHENTICATION_PROVIDER_ID, 'provider-supabase-001');
  });

  it('uses password method for supabase provider registration', () => {
    const registration = createSupabaseAuthenticationProviderRegistration();
    assert.equal(registration.method, 'password');
  });
});
