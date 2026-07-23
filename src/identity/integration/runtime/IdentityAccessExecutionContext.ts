/**
 * İSTEBUL Identity — IdentityAccessExecutionContext (PR-203F).
 *
 * Shared bag/locale/actor fields from `@/core/execution` (PR-901A).
 * Public type names unchanged.
 */

import type {
  ExecutionContextBase,
  PipelineBag
} from '../../../core/execution/index';

/**
 * Pipeline bag — mevcut Identity bag anahtarları kullanılır.
 * Yeni global bag oluşturulmaz.
 */
export type IdentityAccessPipelineBag = PipelineBag;

/**
 * Uçtan uca Identity & Access yürütme bağlamı.
 */
export interface IdentityAccessExecutionContext extends ExecutionContextBase {
  /** Identity filtresi */
  identityIds?: readonly string[];
  /** Authentication filtresi */
  authenticationIds?: readonly string[];
  /** Session filtresi */
  sessionIds?: readonly string[];
  /** Authorization filtresi */
  authorizationIds?: readonly string[];
  /** Tenant isolation filtresi */
  isolationIds?: readonly string[];
  /** Tenant filtresi */
  tenantId?: string;
  /** Başlangıç pipeline bag — mevcut bag anahtarları */
  initialBag?: IdentityAccessPipelineBag;
}

/**
 * IdentityAccessExecutionContext fabrikası.
 */
export function createIdentityAccessExecutionContext(
  partial: IdentityAccessExecutionContext = {}
): IdentityAccessExecutionContext {
  return { ...partial };
}
