/**
 * İSTEBUL Platform Admin — PlatformAdminExecutionContext (PR-201F).
 */

import type { PlatformAdminModuleId } from '../../runtime/PlatformAdminModule';

/**
 * Pipeline bag — mevcut Platform Admin bag anahtarları kullanılır.
 * Yeni global bag oluşturulmaz.
 */
export type PlatformAdminPipelineBag = Record<string, unknown>;

/**
 * Uçtan uca Platform Admin yürütme bağlamı.
 */
export interface PlatformAdminExecutionContext {
  /**
   * Dil — varsayılan `tr`.
   * Geçersiz değerler validation aşamasında error üretir.
   */
  locale?: 'tr' | 'en' | (string & {});
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Foundation modül filtresi */
  moduleIds?: readonly PlatformAdminModuleId[];
  /** Tenant filtresi */
  tenantIds?: readonly string[];
  /** User filtresi */
  userIds?: readonly string[];
  /** Subscription filtresi */
  subscriptionIds?: readonly string[];
  /** System monitoring servis filtresi */
  serviceIds?: readonly string[];
  /** Başlangıç pipeline bag — mevcut bag anahtarları */
  initialBag?: PlatformAdminPipelineBag;
}

/**
 * PlatformAdminExecutionContext fabrikası.
 */
export function createPlatformAdminExecutionContext(
  partial: PlatformAdminExecutionContext = {}
): PlatformAdminExecutionContext {
  return { ...partial };
}
