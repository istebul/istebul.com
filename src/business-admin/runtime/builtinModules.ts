/**
 * İSTEBUL Business Admin — yerleşik modül tanımları (PR-202A).
 */

import type { BusinessAdminModule } from './BusinessAdminModule';

/**
 * Yerleşik Business Admin modülleri — iskelet tanımlar.
 */
export const BUILTIN_BUSINESS_ADMIN_MODULES: readonly BusinessAdminModule[] =
  Object.freeze([
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'İşletme panosu modülü (iskelet)',
      order: 1,
      status: 'active',
      category: 'operations'
    },
    {
      id: 'reports',
      name: 'Reports',
      description: 'Raporlama modülü (iskelet)',
      order: 2,
      status: 'active',
      category: 'monitoring'
    },
    {
      id: 'exports',
      name: 'Exports',
      description: 'Dışa aktarım modülü (iskelet)',
      order: 3,
      status: 'active',
      category: 'operations'
    },
    {
      id: 'business-settings',
      name: 'Business Settings',
      description: 'İşletme ayarları modülü (iskelet)',
      order: 4,
      status: 'active',
      category: 'configuration'
    },
    {
      id: 'users',
      name: 'Users',
      description: 'Kullanıcı yönetimi modülü (iskelet)',
      order: 5,
      status: 'active',
      category: 'operations'
    },
    {
      id: 'activity',
      name: 'Activity',
      description: 'Aktivite izleme modülü (iskelet)',
      order: 6,
      status: 'active',
      category: 'monitoring'
    }
  ]);

/** Yerleşik modül sayısı */
export const BUILTIN_BUSINESS_ADMIN_MODULE_COUNT =
  BUILTIN_BUSINESS_ADMIN_MODULES.length;

/**
 * Yerleşik modül tanımını id ile döndürür.
 */
export function getBuiltinBusinessAdminModule(
  moduleId: string
): BusinessAdminModule | undefined {
  return BUILTIN_BUSINESS_ADMIN_MODULES.find((item) => item.id === moduleId);
}
