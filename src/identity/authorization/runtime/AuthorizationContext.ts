/**
 * İSTEBUL Identity — AuthorizationContext (PR-203D).
 */

import type { IdentityResult } from '../../runtime/IdentityResult';
import type { AuthenticationResult } from '../../authentication/runtime/AuthenticationResult';
import type { SessionResult } from '../../session/runtime/SessionResult';
import type { AuthorizationDecisionOutcome } from './AuthorizationModule';

/**
 * Authorization yürütme girdi bağlamı.
 */
export interface AuthorizationContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Upstream Identity sonucu */
  identityResult?: IdentityResult;
  /** Upstream Authentication sonucu */
  authenticationResult?: AuthenticationResult;
  /** Upstream Session sonucu */
  sessionResult?: SessionResult;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı authorization listesi */
  authorizationIds?: readonly string[];
  /** Identity filtresi */
  identityId?: string;
  /** Session filtresi */
  sessionId?: string;
  /** Decision outcome filtresi */
  decisionOutcome?: AuthorizationDecisionOutcome;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * AuthorizationContext üretir — locale varsayılanı `tr`.
 */
export function createAuthorizationContext(
  partial: Omit<AuthorizationContext, 'locale'> & {
    locale?: 'tr' | 'en';
  } = {}
): AuthorizationContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
