/**
 * İSTEBUL Identity — SupabaseAuthenticationContext (EPIC-301B).
 *
 * Provider-özel girdi bağlamı. Adapter contract'a bag üzerinden taşınır.
 */

import type { AuthenticationProviderContext } from '../../adapters/AuthenticationProviderContext';
import { createAuthenticationProviderContext } from '../../adapters/AuthenticationProviderContext';
import { SUPABASE_AUTHENTICATION_PROVIDER_ID } from './constants';

/**
 * Supabase kimlik doğrulama girdi bağlamı.
 */
export interface SupabaseAuthenticationContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** E-posta (authenticate) */
  email?: string;
  /** Parola (authenticate) */
  password?: string;
  /** Refresh token (refresh) */
  refreshToken?: string;
  /** Access token (getUser / validateSession) */
  accessToken?: string;
  /** Opsiyonel oturum kimliği */
  sessionId?: string;
  /** Opsiyonel identity kimliği */
  identityId?: string;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

export const SUPABASE_CONTEXT_BAG_KEY = 'supabaseAuthentication' as const;

/**
 * SupabaseAuthenticationContext üretir — locale varsayılanı `tr`.
 */
export function createSupabaseAuthenticationContext(
  partial: Omit<SupabaseAuthenticationContext, 'locale'> & {
    locale?: 'tr' | 'en';
  } = {}
): SupabaseAuthenticationContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}

/**
 * Provider context'i adapter AuthenticationProviderContext'e dönüştürür.
 */
export function toAuthenticationProviderContext(
  context: SupabaseAuthenticationContext,
  providerId: string = SUPABASE_AUTHENTICATION_PROVIDER_ID
): AuthenticationProviderContext {
  return createAuthenticationProviderContext({
    locale: context.locale,
    providerId,
    method: 'password',
    identityId: context.identityId,
    sessionId: context.sessionId,
    actorId: context.actorId,
    bag: {
      ...(context.bag ?? {}),
      [SUPABASE_CONTEXT_BAG_KEY]: {
        email: context.email,
        password: context.password,
        refreshToken: context.refreshToken,
        accessToken: context.accessToken
      }
    }
  });
}

/**
 * Adapter context bag'inden SupabaseAuthenticationContext çıkarır.
 */
export function fromAuthenticationProviderContext(
  context: AuthenticationProviderContext
): SupabaseAuthenticationContext {
  const bagPayload = context.bag?.[SUPABASE_CONTEXT_BAG_KEY];
  const payload =
    bagPayload && typeof bagPayload === 'object'
      ? (bagPayload as Record<string, unknown>)
      : {};

  return createSupabaseAuthenticationContext({
    locale: context.locale,
    identityId: context.identityId,
    sessionId: context.sessionId,
    actorId: context.actorId,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    password: typeof payload.password === 'string' ? payload.password : undefined,
    refreshToken:
      typeof payload.refreshToken === 'string'
        ? payload.refreshToken
        : undefined,
    accessToken:
      typeof payload.accessToken === 'string' ? payload.accessToken : undefined,
    bag: context.bag
  });
}

/**
 * Authenticate için e-posta/parola zorunluluğunu doğrular.
 */
export function validateSupabaseAuthenticateCredentials(
  context: SupabaseAuthenticationContext
): string | undefined {
  if (!context.email || typeof context.email !== 'string') {
    return 'email zorunludur.';
  }
  if (!context.password || typeof context.password !== 'string') {
    return 'password zorunludur.';
  }
  return undefined;
}
