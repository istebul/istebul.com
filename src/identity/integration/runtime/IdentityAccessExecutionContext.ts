/**
 * İSTEBUL Identity — IdentityAccessExecutionContext (PR-203F).
 */

/**
 * Pipeline bag — mevcut Identity bag anahtarları kullanılır.
 * Yeni global bag oluşturulmaz.
 */
export type IdentityAccessPipelineBag = Record<string, unknown>;

/**
 * Uçtan uca Identity & Access yürütme bağlamı.
 */
export interface IdentityAccessExecutionContext {
  /**
   * Dil — varsayılan `tr`.
   * Geçersiz değerler validation aşamasında error üretir.
   */
  locale?: 'tr' | 'en' | (string & {});
  /** Opsiyonel aktör kimliği */
  actorId?: string;
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
