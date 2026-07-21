/**
 * İSTEBUL Business Admin — runtime bağlamı (PR-202A).
 *
 * Tek bir tenant'ın (işletmenin) Business Runtime yönetim bağlamı.
 */

import type { BusinessAdminModuleId } from './BusinessAdminModule';

/**
 * Business Admin yürütme girdi bağlamı.
 */
export interface BusinessAdminContext {
  /** Tenant (işletme) kimliği — zorunlu */
  tenantId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Opsiyonel aktör kimliği — izlenebilirlik */
  actorId?: string;
  /** Sınırlı modül listesi — boş/undefined ise tüm kayıtlı modüller */
  moduleIds?: readonly BusinessAdminModuleId[];
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * BusinessAdminContext üretir — locale varsayılanı `tr`.
 */
export function createBusinessAdminContext(
  partial: Omit<BusinessAdminContext, 'locale' | 'tenantId'> & {
    tenantId: string;
    locale?: 'tr' | 'en';
  }
): BusinessAdminContext {
  const { locale, tenantId, ...rest } = partial;
  return {
    ...rest,
    tenantId,
    locale: locale ?? 'tr'
  };
}
