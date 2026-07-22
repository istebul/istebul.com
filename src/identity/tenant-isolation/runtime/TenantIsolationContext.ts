/**
 * İSTEBUL Identity — TenantIsolationContext (PR-203E).
 */

import type { IdentityResult } from '../../runtime/IdentityResult';
import type { AuthenticationResult } from '../../authentication/runtime/AuthenticationResult';
import type { SessionResult } from '../../session/runtime/SessionResult';
import type { AuthorizationResult } from '../../authorization/runtime/AuthorizationResult';
import type { TenantIsolationDecisionOutcome } from './TenantIsolationModule';

/**
 * Tenant Isolation yürütme girdi bağlamı.
 */
export interface TenantIsolationContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Upstream Identity sonucu */
  identityResult?: IdentityResult;
  /** Upstream Authentication sonucu */
  authenticationResult?: AuthenticationResult;
  /** Upstream Session sonucu */
  sessionResult?: SessionResult;
  /** Upstream Authorization sonucu */
  authorizationResult?: AuthorizationResult;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı isolation listesi */
  isolationIds?: readonly string[];
  /** Tenant filtresi */
  tenantId?: string;
  /** Identity filtresi (membership) */
  identityId?: string;
  /** Decision outcome filtresi */
  decisionOutcome?: TenantIsolationDecisionOutcome;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * TenantIsolationContext üretir — locale varsayılanı `tr`.
 */
export function createTenantIsolationContext(
  partial: Omit<TenantIsolationContext, 'locale'> & {
    locale?: 'tr' | 'en';
  } = {}
): TenantIsolationContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
