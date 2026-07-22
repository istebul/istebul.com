/**
 * İSTEBUL Identity — SupabaseAuthenticationProvider (EPIC-301B).
 *
 * Authentication Adapter Foundation üzerine ilk gerçek provider.
 * Architecture Freeze — AuthenticationRuntime / IdentityRuntime değiştirilmez.
 * AuthenticationAdapter interface değiştirilmez.
 * Supabase client dependency injection ile alınır; singleton yoktur.
 */

import type { AuthenticationMethod } from '../../runtime/AuthenticationModule';
import type { AuthenticationProvider } from '../../adapters/AuthenticationProvider';
import type { AuthenticationProviderContext } from '../../adapters/AuthenticationProviderContext';
import type { AuthenticationProviderOperation } from '../../adapters/AuthenticationProviderContext';
import type { AuthenticationProviderResult } from '../../adapters/AuthenticationProviderResult';
import {
  endStageTimer,
  startStageTimer
} from '../../../runtime/timing';
import {
  AuthenticationError,
  InvalidCredentials
} from './AuthenticationError';
import {
  SUPABASE_AUTHENTICATION_PROVIDER_ID
} from './constants';
import {
  assertSupabaseAuthClient,
  type SupabaseAuthClientLike,
  type SupabaseAuthSessionLike,
  type SupabaseAuthUserLike
} from './SupabaseAuthClient';
import {
  fromAuthenticationProviderContext,
  validateSupabaseAuthenticateCredentials,
  type SupabaseAuthenticationContext
} from './SupabaseAuthenticationContext';
import {
  createSupabaseAuthenticationResult,
  toAuthenticationProviderResult,
  type SupabaseAuthSession,
  type SupabaseAuthUser,
  type SupabaseAuthenticationResult
} from './SupabaseAuthenticationResult';
import {
  mapSupabaseAuthError,
  mapUnknownProviderError
} from './supabaseErrorMapping';

/**
 * Provider bağımlılıkları — client DI; singleton yok.
 */
export interface SupabaseAuthenticationProviderDependencies {
  /** Enjekte edilen Supabase Auth client */
  client: SupabaseAuthClientLike;
  /** Opsiyonel provider kimliği */
  providerId?: string;
  /** Opsiyonel method (varsayılan password) */
  method?: AuthenticationMethod;
}

/**
 * Supabase Authentication Provider — AuthenticationProvider port implementasyonu.
 */
export class SupabaseAuthenticationProvider implements AuthenticationProvider {
  readonly id: string;
  readonly method: AuthenticationMethod;
  private readonly client: SupabaseAuthClientLike;

  constructor(deps: SupabaseAuthenticationProviderDependencies) {
    assertSupabaseAuthClient(deps.client);
    this.client = deps.client;
    this.id = deps.providerId ?? SUPABASE_AUTHENTICATION_PROVIDER_ID;
    this.method = deps.method ?? 'password';
  }

  getClient(): SupabaseAuthClientLike {
    return this.client;
  }

  authenticate(
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    return this.run('authenticate', context, (supabaseContext) =>
      this.executeAuthenticate(supabaseContext)
    );
  }

  refresh(
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    return this.run('refresh', context, (supabaseContext) =>
      this.executeRefresh(supabaseContext)
    );
  }

  logout(
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    return this.run('logout', context, () => this.executeLogout());
  }

  getCurrentUser(
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    return this.run('getCurrentUser', context, (supabaseContext) =>
      this.executeGetCurrentUser(supabaseContext)
    );
  }

  validateSession(
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    return this.run('validateSession', context, (supabaseContext) =>
      this.executeValidateSession(supabaseContext)
    );
  }

  /**
   * Provider-özel bağlam ile authenticate — test / entegrasyon kolaylığı.
   */
  async authenticateWithSupabaseContext(
    context: SupabaseAuthenticationContext
  ): Promise<SupabaseAuthenticationResult> {
    return this.executeWithTelemetry('authenticate', async () =>
      this.executeAuthenticate(context)
    );
  }

  private async run(
    operation: AuthenticationProviderOperation,
    context: AuthenticationProviderContext,
    executor: (
      supabaseContext: SupabaseAuthenticationContext
    ) => Promise<Omit<SupabaseAuthenticationResult, 'telemetry' | 'operation' | 'providerId'> & {
      telemetry?: SupabaseAuthenticationResult['telemetry'];
    }>
  ): Promise<AuthenticationProviderResult> {
    const supabaseContext = fromAuthenticationProviderContext(context);
    const result = await this.executeWithTelemetry(operation, () =>
      executor(supabaseContext)
    );
    return toAuthenticationProviderResult(result);
  }

  private async executeWithTelemetry(
    operation: AuthenticationProviderOperation,
    executor: () => Promise<
      Omit<SupabaseAuthenticationResult, 'telemetry' | 'operation' | 'providerId'> & {
        telemetry?: SupabaseAuthenticationResult['telemetry'];
      }
    >
  ): Promise<SupabaseAuthenticationResult> {
    const timer = startStageTimer();
    try {
      const partial = await executor();
      const { endedAt, durationMs } = endStageTimer(timer);
      return createSupabaseAuthenticationResult({
        ...partial,
        operation,
        providerId: this.id,
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          operation,
          providerId: this.id
        }
      });
    } catch (error) {
      const mapped = mapUnknownProviderError(error);
      const { endedAt, durationMs } = endStageTimer(timer);
      return createSupabaseAuthenticationResult({
        success: false,
        status: mapped.code === 'SessionExpired' ? 'expired' : 'unauthenticated',
        operation,
        providerId: this.id,
        error: { code: mapped.code, message: mapped.message },
        validationIssues: [
          {
            code: mapped.code,
            message: mapped.message,
            severity: 'error'
          }
        ],
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          operation,
          providerId: this.id
        }
      });
    }
  }

  private async executeAuthenticate(
    context: SupabaseAuthenticationContext
  ): Promise<
    Omit<SupabaseAuthenticationResult, 'telemetry' | 'operation' | 'providerId'>
  > {
    const validationMessage = validateSupabaseAuthenticateCredentials(context);
    if (validationMessage) {
      throw new InvalidCredentials(validationMessage);
    }

    let response;
    try {
      response = await this.client.auth.signInWithPassword({
        email: context.email!,
        password: context.password!
      });
    } catch (error) {
      throw mapUnknownProviderError(error);
    }

    if (response.error) {
      throw mapSupabaseAuthError(response.error);
    }
    if (!response.data?.user) {
      throw new AuthenticationError('Supabase kullanıcı döndürmedi.');
    }

    const user = toSupabaseAuthUser(response.data.user);
    const session = toSupabaseAuthSession(response.data.session ?? undefined);

    return {
      success: true,
      status: 'authenticated',
      user,
      session,
      validationIssues: [],
      summaryItems: [
        { key: 'provider', label: 'Provider', value: 'supabase' },
        { key: 'userId', label: 'User ID', value: user.id }
      ],
      bag: context.bag
    };
  }

  private async executeRefresh(
    context: SupabaseAuthenticationContext
  ): Promise<
    Omit<SupabaseAuthenticationResult, 'telemetry' | 'operation' | 'providerId'>
  > {
    let response;
    try {
      response = await this.client.auth.refreshSession(
        context.refreshToken
          ? { refresh_token: context.refreshToken }
          : undefined
      );
    } catch (error) {
      throw mapUnknownProviderError(error);
    }

    if (response.error) {
      throw mapSupabaseAuthError(response.error);
    }
    if (!response.data?.session || !response.data?.user) {
      throw new AuthenticationError('Supabase oturum yenilemedi.');
    }

    const user = toSupabaseAuthUser(response.data.user);
    const session = toSupabaseAuthSession(response.data.session);

    return {
      success: true,
      status: 'authenticated',
      user,
      session,
      validationIssues: [],
      summaryItems: [
        { key: 'provider', label: 'Provider', value: 'supabase' },
        { key: 'refreshed', label: 'Refreshed', value: true }
      ],
      bag: context.bag
    };
  }

  private async executeLogout(): Promise<
    Omit<SupabaseAuthenticationResult, 'telemetry' | 'operation' | 'providerId'>
  > {
    let response;
    try {
      response = await this.client.auth.signOut();
    } catch (error) {
      throw mapUnknownProviderError(error);
    }

    if (response.error) {
      throw mapSupabaseAuthError(response.error);
    }

    return {
      success: true,
      status: 'unauthenticated',
      validationIssues: [],
      summaryItems: [
        { key: 'provider', label: 'Provider', value: 'supabase' },
        { key: 'loggedOut', label: 'Logged Out', value: true }
      ]
    };
  }

  private async executeGetCurrentUser(
    context: SupabaseAuthenticationContext
  ): Promise<
    Omit<SupabaseAuthenticationResult, 'telemetry' | 'operation' | 'providerId'>
  > {
    let response;
    try {
      response = await this.client.auth.getUser(context.accessToken);
    } catch (error) {
      throw mapUnknownProviderError(error);
    }

    if (response.error) {
      throw mapSupabaseAuthError(response.error);
    }
    if (!response.data?.user) {
      throw new AuthenticationError('Mevcut kullanıcı bulunamadı.');
    }

    const user = toSupabaseAuthUser(response.data.user);

    return {
      success: true,
      status: 'authenticated',
      user,
      validationIssues: [],
      summaryItems: [
        { key: 'provider', label: 'Provider', value: 'supabase' },
        { key: 'userId', label: 'User ID', value: user.id }
      ],
      bag: context.bag
    };
  }

  private async executeValidateSession(
    context: SupabaseAuthenticationContext
  ): Promise<
    Omit<SupabaseAuthenticationResult, 'telemetry' | 'operation' | 'providerId'>
  > {
    let response;
    try {
      if (context.accessToken) {
        const userResponse = await this.client.auth.getUser(context.accessToken);
        if (userResponse.error) {
          throw mapSupabaseAuthError(userResponse.error);
        }
        if (!userResponse.data?.user) {
          throw new AuthenticationError('Oturum kullanıcısı bulunamadı.');
        }
        const sessionResponse = await this.client.auth.getSession();
        const user = toSupabaseAuthUser(userResponse.data.user);
        const session = toSupabaseAuthSession(
          sessionResponse.data?.session ?? undefined
        );
        return {
          success: true,
          status: 'authenticated',
          user,
          session,
          validationIssues: [],
          summaryItems: [
            { key: 'provider', label: 'Provider', value: 'supabase' },
            { key: 'sessionValid', label: 'Session Valid', value: true }
          ],
          bag: context.bag
        };
      }

      response = await this.client.auth.getSession();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw mapUnknownProviderError(error);
    }

    if (response.error) {
      throw mapSupabaseAuthError(response.error);
    }
    if (!response.data?.session) {
      throw new AuthenticationError('Aktif oturum bulunamadı.');
    }

    const sessionLike = response.data.session;
    if (!sessionLike.user) {
      throw new AuthenticationError('Oturum kullanıcısı bulunamadı.');
    }

    const user = toSupabaseAuthUser(sessionLike.user);
    const session = toSupabaseAuthSession(sessionLike);

    return {
      success: true,
      status: 'authenticated',
      user,
      session,
      validationIssues: [],
      summaryItems: [
        { key: 'provider', label: 'Provider', value: 'supabase' },
        { key: 'sessionValid', label: 'Session Valid', value: true }
      ],
      bag: context.bag
    };
  }
}

function toSupabaseAuthUser(user: SupabaseAuthUserLike): SupabaseAuthUser {
  const metadata = user.user_metadata ?? {};
  const displayName =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : undefined;
  const tenantId =
    typeof metadata.tenant_id === 'string'
      ? metadata.tenant_id
      : typeof user.app_metadata?.tenant_id === 'string'
        ? (user.app_metadata.tenant_id as string)
        : undefined;

  return {
    id: user.id,
    email: user.email ?? undefined,
    displayName,
    tenantId
  };
}

function toSupabaseAuthSession(
  session: SupabaseAuthSessionLike | undefined
): SupabaseAuthSession | undefined {
  if (!session) {
    return undefined;
  }
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    sessionId: session.access_token
      ? `sess-${session.access_token.slice(0, 12)}`
      : undefined
  };
}

/**
 * SupabaseAuthenticationProvider üretir — singleton yok.
 */
export function createSupabaseAuthenticationProvider(
  deps: SupabaseAuthenticationProviderDependencies
): SupabaseAuthenticationProvider {
  return new SupabaseAuthenticationProvider(deps);
}

export default SupabaseAuthenticationProvider;
