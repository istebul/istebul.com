/**
 * İSTEBUL Platform Admin — yerleşik modül tanımları (PR-201A).
 */

import type { PlatformAdminModule } from './PlatformAdminModule';

/**
 * Yerleşik Platform Admin modülleri — iskelet tanımlar.
 */
export const BUILTIN_PLATFORM_ADMIN_MODULES: readonly PlatformAdminModule[] =
  Object.freeze([
    {
      id: 'tenant',
      name: 'Tenant',
      description: 'Kiracı yönetimi modülü (iskelet)',
      order: 1,
      status: 'active',
      category: 'operations'
    },
    {
      id: 'users',
      name: 'Users',
      description: 'Kullanıcı yönetimi modülü (iskelet)',
      order: 2,
      status: 'active',
      category: 'operations'
    },
    {
      id: 'subscriptions',
      name: 'Subscriptions',
      description: 'Abonelik yönetimi modülü (iskelet)',
      order: 3,
      status: 'active',
      category: 'operations'
    },
    {
      id: 'system',
      name: 'System',
      description: 'Sistem yapılandırması modülü (iskelet)',
      order: 4,
      status: 'active',
      category: 'configuration'
    },
    {
      id: 'logs',
      name: 'Logs',
      description: 'Log izleme modülü (iskelet)',
      order: 5,
      status: 'active',
      category: 'monitoring'
    },
    {
      id: 'support',
      name: 'Support',
      description: 'Destek yönetimi modülü (iskelet)',
      order: 6,
      status: 'active',
      category: 'operations'
    },
    {
      id: 'feature-flags',
      name: 'Feature Flags',
      description: 'Özellik bayrağı yönetimi modülü (iskelet)',
      order: 7,
      status: 'active',
      category: 'configuration'
    },
    {
      id: 'ai-limits',
      name: 'AI Limits',
      description: 'AI limit yönetimi modülü (iskelet)',
      order: 8,
      status: 'active',
      category: 'configuration'
    }
  ]);

/** Yerleşik modül sayısı */
export const BUILTIN_PLATFORM_ADMIN_MODULE_COUNT =
  BUILTIN_PLATFORM_ADMIN_MODULES.length;

/**
 * Yerleşik modül tanımını id ile döndürür.
 */
export function getBuiltinPlatformAdminModule(
  moduleId: string
): PlatformAdminModule | undefined {
  return BUILTIN_PLATFORM_ADMIN_MODULES.find((item) => item.id === moduleId);
}
