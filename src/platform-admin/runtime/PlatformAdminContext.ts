/**
 * İSTEBUL Platform Admin — runtime bağlamı (PR-201A).
 */

import type { PlatformAdminModuleId } from './PlatformAdminModule';

/**
 * Platform Admin yürütme girdi bağlamı.
 */
export interface PlatformAdminContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Opsiyonel aktör kimliği — izlenebilirlik */
  actorId?: string;
  /** Sınırlı modül listesi — boş/undefined ise tüm kayıtlı modüller */
  moduleIds?: readonly PlatformAdminModuleId[];
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * PlatformAdminContext üretir — locale varsayılanı `tr`.
 */
export function createPlatformAdminContext(
  partial: Omit<PlatformAdminContext, 'locale'> & { locale?: 'tr' | 'en' } = {}
): PlatformAdminContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
