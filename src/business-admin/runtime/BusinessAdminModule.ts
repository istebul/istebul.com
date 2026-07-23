/**
 * İSTEBUL Business Admin — modül tanımı (PR-202A).
 */

/**
 * Business Admin modül kimlikleri.
 */
export type BusinessAdminModuleId =
  | 'dashboard'
  | 'reports'
  | 'exports'
  | 'business-settings'
  | 'users'
  | 'activity';

/**
 * Modül kategorisi.
 */
export type BusinessAdminModuleCategory =
  | 'operations'
  | 'configuration'
  | 'monitoring';

/**
 * Modül durumu — foundation katmanında yalnızca iskelet.
 */
export type BusinessAdminModuleStatus = 'active' | 'coming-soon';

/**
 * Business Admin modül tanımı.
 */
export interface BusinessAdminModule {
  /** Benzersiz modül kimliği */
  id: BusinessAdminModuleId;
  /** Görünen ad */
  name: string;
  /** Kısa açıklama */
  description: string;
  /** Sıralama */
  order: number;
  /** Durum */
  status: BusinessAdminModuleStatus;
  /** Kategori */
  category: BusinessAdminModuleCategory;
}

/**
 * Modül projeksiyonu — runtime çıktısı.
 */
export interface BusinessAdminModuleProjection {
  moduleId: BusinessAdminModuleId;
  name: string;
  description: string;
  status: BusinessAdminModuleStatus;
  category: BusinessAdminModuleCategory;
  /** Foundation katmanında her zaman true — CRUD yok */
  available: boolean;
}

/**
 * Modül tanımını projeksiyona dönüştürür.
 */
export function toModuleProjection(
  module: BusinessAdminModule
): BusinessAdminModuleProjection {
  return {
    moduleId: module.id,
    name: module.name,
    description: module.description,
    status: module.status,
    category: module.category,
    available: module.status === 'active'
  };
}
