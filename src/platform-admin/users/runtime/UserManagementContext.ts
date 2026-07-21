/**
 * İSTEBUL Platform Admin — UserManagementContext (PR-201C).
 */

import type { PlatformAdminResult } from '../../runtime/PlatformAdminResult';

/**
 * User Management yürütme girdi bağlamı.
 */
export interface UserManagementContext {
  /** Dil */
  locale: 'tr' | 'en';
  /**
   * Upstream Platform Admin sonucu — projection pipeline girdisi.
   * Yoksa yalnızca registry üzerinden projeksiyon yapılır.
   */
  platformAdminResult?: PlatformAdminResult;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı kullanıcı listesi — boş/undefined ise tüm kayıtlı kullanıcılar */
  userIds?: readonly string[];
  /** Tenant filtresi — yalnızca bu tenant’a bağlı kullanıcılar */
  tenantId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * UserManagementContext üretir — locale varsayılanı `tr`.
 */
export function createUserManagementContext(
  partial: Omit<UserManagementContext, 'locale'> & {
    locale?: 'tr' | 'en';
  } = {}
): UserManagementContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
