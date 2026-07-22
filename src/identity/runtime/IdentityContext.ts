/**
 * İSTEBUL Identity — runtime bağlamı (PR-203A).
 */

/**
 * Identity yürütme girdi bağlamı.
 */
export interface IdentityContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Opsiyonel aktör kimliği — izlenebilirlik */
  actorId?: string;
  /** Sınırlı kimlik listesi — boş/undefined ise tüm kayıtlı kimlikler */
  identityIds?: readonly string[];
  /** Opsiyonel tenant filtresi */
  tenantId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * IdentityContext üretir — locale varsayılanı `tr`.
 */
export function createIdentityContext(
  partial: Omit<IdentityContext, 'locale'> & { locale?: 'tr' | 'en' } = {}
): IdentityContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
