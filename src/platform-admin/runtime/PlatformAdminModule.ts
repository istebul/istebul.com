/**
 * İSTEBUL Platform Admin — modül tanımı (PR-201A).
 */

/**
 * Platform Admin modül kimlikleri.
 */
export type PlatformAdminModuleId =
  | 'tenant'
  | 'users'
  | 'subscriptions'
  | 'system'
  | 'logs'
  | 'support'
  | 'feature-flags'
  | 'ai-limits';

/**
 * Modül kategorisi.
 */
export type PlatformAdminModuleCategory =
  | 'operations'
  | 'configuration'
  | 'monitoring';

/**
 * Modül durumu — foundation katmanında yalnızca iskelet.
 */
export type PlatformAdminModuleStatus = 'active' | 'coming-soon';

/**
 * Platform Admin modül tanımı.
 */
export interface PlatformAdminModule {
  /** Benzersiz modül kimliği */
  id: PlatformAdminModuleId;
  /** Görünen ad */
  name: string;
  /** Kısa açıklama */
  description: string;
  /** Sıralama */
  order: number;
  /** Durum */
  status: PlatformAdminModuleStatus;
  /** Kategori */
  category: PlatformAdminModuleCategory;
}

/**
 * Modül projeksiyonu — runtime çıktısı.
 */
export interface PlatformAdminModuleProjection {
  moduleId: PlatformAdminModuleId;
  name: string;
  description: string;
  status: PlatformAdminModuleStatus;
  category: PlatformAdminModuleCategory;
  /** Foundation katmanında her zaman true — CRUD yok */
  available: boolean;
}

/**
 * Modül tanımını projeksiyona dönüştürür.
 */
export function toModuleProjection(
  module: PlatformAdminModule
): PlatformAdminModuleProjection {
  return {
    moduleId: module.id,
    name: module.name,
    description: module.description,
    status: module.status,
    category: module.category,
    available: module.status === 'active'
  };
}
