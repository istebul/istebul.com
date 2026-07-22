/**
 * İSTEBUL Identity — AuthenticationIntegrationExecutionContext (EPIC-301E).
 */

import type { AuthenticationProviderContext } from '../adapters/AuthenticationProviderContext';

/**
 * Pipeline bag — instance bazlı; yeni global bag yok.
 */
export type AuthenticationIntegrationPipelineBag = Record<string, unknown>;

/**
 * Integration operasyonu — alt katmanlara iletilir.
 */
export type AuthenticationIntegrationOperation =
  | 'synchronize'
  | 'refresh'
  | 'logout'
  | 'validate';

/**
 * Uçtan uca Authentication Integration yürütme bağlamı.
 */
export interface AuthenticationIntegrationExecutionContext {
  /**
   * Dil — varsayılan `tr`.
   * Geçersiz değerler validation aşamasında error üretir.
   */
  locale?: 'tr' | 'en' | (string & {});
  /** Integration operasyonu — varsayılan synchronize */
  operation?: AuthenticationIntegrationOperation;
  /** Adapter'a iletilecek provider bağlamı */
  providerContext?: AuthenticationProviderContext;
  /** Provider kimliği (providerContext yoksa) */
  providerId?: string;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Opsiyonel identity kimliği */
  identityId?: string;
  /** Opsiyonel oturum kimliği */
  sessionId?: string;
  /** Opsiyonel identity bridge binding */
  identityBridgeBindingId?: string;
  /** Opsiyonel session bridge binding */
  sessionBridgeBindingId?: string;
  /** Başlangıç pipeline bag */
  initialBag?: AuthenticationIntegrationPipelineBag;
}

/**
 * AuthenticationIntegrationExecutionContext fabrikası.
 */
export function createAuthenticationIntegrationExecutionContext(
  partial: AuthenticationIntegrationExecutionContext = {}
): AuthenticationIntegrationExecutionContext {
  return { ...partial };
}
