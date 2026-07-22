/**
 * İSTEBUL Identity — AuthenticationProviderContext (EPIC-301A).
 *
 * Adapter katmanı girdi bağlamı.
 * Supabase / JWT / OAuth / OIDC / API / DB yok.
 */

import type { AuthenticationMethod } from '../runtime/AuthenticationModule';

/**
 * Adapter operasyonu — provider arayüz yöntemleriyle hizalı.
 */
export type AuthenticationProviderOperation =
  | 'authenticate'
  | 'refresh'
  | 'logout'
  | 'getCurrentUser'
  | 'validateSession';

/**
 * Authentication provider yürütme girdi bağlamı.
 */
export interface AuthenticationProviderContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Hedef provider kimliği */
  providerId: string;
  /** Çalıştırılan operasyon */
  operation?: AuthenticationProviderOperation;
  /** Kimlik doğrulama yöntemi */
  method?: AuthenticationMethod;
  /** Opsiyonel identity kimliği */
  identityId?: string;
  /** Opsiyonel oturum kimliği */
  sessionId?: string;
  /** Opsiyonel credential referans kimliği */
  credentialId?: string;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * AuthenticationProviderContext üretir — locale varsayılanı `tr`.
 */
export function createAuthenticationProviderContext(
  partial: Omit<AuthenticationProviderContext, 'locale'> & {
    locale?: 'tr' | 'en';
  }
): AuthenticationProviderContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
