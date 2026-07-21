/**
 * İSTEBUL Platform Admin — SystemMonitoringContext (PR-201E).
 */

import type { PlatformAdminResult } from '../../runtime/PlatformAdminResult';

/**
 * System Monitoring yürütme girdi bağlamı.
 */
export interface SystemMonitoringContext {
  /** Dil */
  locale: 'tr' | 'en';
  /**
   * Upstream Platform Admin sonucu — projection pipeline girdisi.
   * Yoksa yalnızca registry üzerinden projeksiyon yapılır.
   */
  platformAdminResult?: PlatformAdminResult;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı servis listesi — boş/undefined ise tüm kayıtlı servisler */
  serviceIds?: readonly string[];
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * SystemMonitoringContext üretir — locale varsayılanı `tr`.
 */
export function createSystemMonitoringContext(
  partial: Omit<SystemMonitoringContext, 'locale'> & {
    locale?: 'tr' | 'en';
  } = {}
): SystemMonitoringContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
