/**
 * İSTEBUL Identity — SessionContext (PR-203C).
 */

import type { IdentityResult } from '../../runtime/IdentityResult';
import type { AuthenticationResult } from '../../authentication/runtime/AuthenticationResult';
import type { SessionState } from './SessionModule';

/**
 * Session yürütme girdi bağlamı.
 */
export interface SessionContext {
  /** Dil */
  locale: 'tr' | 'en';
  /**
   * Upstream Identity sonucu — Identity Projection aşaması girdisi.
   */
  identityResult?: IdentityResult;
  /**
   * Upstream Authentication sonucu — Authentication Projection aşaması girdisi.
   */
  authenticationResult?: AuthenticationResult;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı session listesi — boş/undefined ise tüm kayıtlı oturumlar */
  sessionIds?: readonly string[];
  /** Identity filtresi */
  identityId?: string;
  /** Authentication filtresi */
  authenticationId?: string;
  /** State filtresi */
  state?: SessionState;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * SessionContext üretir — locale varsayılanı `tr`.
 */
export function createSessionContext(
  partial: Omit<SessionContext, 'locale'> & {
    locale?: 'tr' | 'en';
  } = {}
): SessionContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
