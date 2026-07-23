/**
 * İSTEBUL Identity — AuthenticationContext (PR-203B).
 */

import type { IdentityResult } from '../../runtime/IdentityResult';
import type { AuthenticationStatus } from './AuthenticationModule';

/**
 * Authentication yürütme girdi bağlamı.
 */
export interface AuthenticationContext {
  /** Dil */
  locale: 'tr' | 'en';
  /**
   * Upstream Identity sonucu — Identity Projection aşaması girdisi.
   * Yoksa yalnızca registry üzerinden authentication projeksiyonu yapılır.
   */
  identityResult?: IdentityResult;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı authentication listesi — boş/undefined ise tüm kayıtlı kayıtlar */
  authenticationIds?: readonly string[];
  /** Identity filtresi — yalnızca bu identity’ye bağlı kayıtlar */
  identityId?: string;
  /** Status filtresi */
  status?: AuthenticationStatus;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * AuthenticationContext üretir — locale varsayılanı `tr`.
 */
export function createAuthenticationContext(
  partial: Omit<AuthenticationContext, 'locale'> & {
    locale?: 'tr' | 'en';
  } = {}
): AuthenticationContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
