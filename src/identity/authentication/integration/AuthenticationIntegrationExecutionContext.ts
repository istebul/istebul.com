/**
 * İSTEBUL Identity — AuthenticationIntegrationExecutionContext (EPIC-301E).
 *
 * Shared bag/locale/actor fields from core execution contracts (PR-901A).
 * Public type names unchanged.
 */

import type { AuthenticationProviderContext } from '../adapters/AuthenticationProviderContext';
import type {
  ExecutionContextBase,
  PipelineBag
} from '../../../core/execution/index';

/**
 * Pipeline bag — instance bazlı; yeni global bag yok.
 */
export type AuthenticationIntegrationPipelineBag = PipelineBag;

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
export interface AuthenticationIntegrationExecutionContext
  extends ExecutionContextBase {
  /** Integration operasyonu — varsayılan synchronize */
  operation?: AuthenticationIntegrationOperation;
  /** Adapter'a iletilecek provider bağlamı */
  providerContext?: AuthenticationProviderContext;
  /** Provider kimliği (providerContext yoksa) */
  providerId?: string;
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
