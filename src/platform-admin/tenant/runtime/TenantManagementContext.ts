/**
 * İSTEBUL Platform Admin — TenantManagementContext (PR-201B).
 */

import type { PlatformAdminResult } from '../../runtime/PlatformAdminResult';

/**
 * Tenant Management yürütme girdi bağlamı.
 */
export interface TenantManagementContext {
  /** Dil */
  locale: 'tr' | 'en';
  /**
   * Upstream Platform Admin sonucu — projection pipeline girdisi.
   * Yoksa yalnızca registry üzerinden projeksiyon yapılır.
   */
  platformAdminResult?: PlatformAdminResult;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı tenant listesi — boş/undefined ise tüm kayıtlı tenantlar */
  tenantIds?: readonly string[];
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * TenantManagementContext üretir — locale varsayılanı `tr`.
 */
export function createTenantManagementContext(
  partial: Omit<TenantManagementContext, 'locale'> & {
    locale?: 'tr' | 'en';
  } = {}
): TenantManagementContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
