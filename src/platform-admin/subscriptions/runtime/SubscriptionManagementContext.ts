/**
 * İSTEBUL Platform Admin — SubscriptionManagementContext (PR-201D).
 */

import type { PlatformAdminResult } from '../../runtime/PlatformAdminResult';

/**
 * Subscription Management yürütme girdi bağlamı.
 */
export interface SubscriptionManagementContext {
  /** Dil */
  locale: 'tr' | 'en';
  /**
   * Upstream Platform Admin sonucu — projection pipeline girdisi.
   * Yoksa yalnızca registry üzerinden projeksiyon yapılır.
   */
  platformAdminResult?: PlatformAdminResult;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı abonelik listesi — boş/undefined ise tüm kayıtlı abonelikler */
  subscriptionIds?: readonly string[];
  /** Tenant filtresi — yalnızca bu tenant’a bağlı abonelikler */
  tenantId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * SubscriptionManagementContext üretir — locale varsayılanı `tr`.
 */
export function createSubscriptionManagementContext(
  partial: Omit<SubscriptionManagementContext, 'locale'> & {
    locale?: 'tr' | 'en';
  } = {}
): SubscriptionManagementContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
