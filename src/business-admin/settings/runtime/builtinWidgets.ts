/**
 * İSTEBUL Business Admin — yerleşik Business Settings Workspace section tanımları (PR-202E).
 */

import type { BusinessSettingsWorkspaceWidgetDefinition } from './BusinessSettingsWorkspaceWidget';

/**
 * Yerleşik Business Settings Workspace section'ları.
 */
export const BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGETS: readonly BusinessSettingsWorkspaceWidgetDefinition[] =
  Object.freeze([
    {
      id: 'business-profile',
      name: 'Business Profile',
      description: 'İşletme profili (iskelet)',
      order: 1,
      kind: 'profile',
      status: 'active',
      visible: true
    },
    {
      id: 'organization',
      name: 'Organization',
      description: 'Organizasyon bilgileri (iskelet)',
      order: 2,
      kind: 'organization',
      status: 'active',
      visible: true
    },
    {
      id: 'branding',
      name: 'Branding',
      description: 'Marka / görünüm (iskelet)',
      order: 3,
      kind: 'branding',
      status: 'active',
      visible: true
    },
    {
      id: 'localization',
      name: 'Localization',
      description: 'Yerelleştirme tercihleri (iskelet)',
      order: 4,
      kind: 'localization',
      status: 'active',
      visible: true
    },
    {
      id: 'notification-preferences',
      name: 'Notification Preferences',
      description: 'Bildirim tercihleri (iskelet)',
      order: 5,
      kind: 'notifications',
      status: 'active',
      visible: true
    },
    {
      id: 'ai-preferences',
      name: 'AI Preferences',
      description: 'AI tercihleri (iskelet)',
      order: 6,
      kind: 'ai-preferences',
      status: 'active',
      visible: true
    },
    {
      id: 'workspace-summary',
      name: 'Workspace Summary',
      description: 'Ayar çalışma alanı özeti (iskelet)',
      order: 7,
      kind: 'summary',
      status: 'active',
      visible: true
    }
  ]);

/** Yerleşik section sayısı */
export const BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGET_COUNT =
  BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGETS.length;

/**
 * Yerleşik section tanımını id ile döndürür.
 */
export function getBuiltinBusinessSettingsWorkspaceWidget(
  widgetId: string
): BusinessSettingsWorkspaceWidgetDefinition | undefined {
  return BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGETS.find(
    (item) => item.id === widgetId
  );
}
