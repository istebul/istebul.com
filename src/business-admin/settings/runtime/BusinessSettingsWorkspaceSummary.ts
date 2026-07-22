/**
 * İSTEBUL Business Admin — Business Settings Workspace Summary (PR-202E).
 */

import type {
  BusinessSettingsWorkspaceWidgetId,
  BusinessSettingsWorkspaceWidgetProjection
} from './BusinessSettingsWorkspaceWidget';

const SETTINGS_SECTION_IDS: ReadonlySet<BusinessSettingsWorkspaceWidgetId> =
  new Set([
    'business-profile',
    'organization',
    'branding',
    'localization',
    'notification-preferences',
    'ai-preferences'
  ]);

/**
 * Workspace Summary — yürütme özeti.
 */
export interface BusinessSettingsWorkspaceSummary {
  /** Genel başarı */
  success: boolean;
  /** Projeksiyon üretilen widget sayısı */
  widgetCount: number;
  /** Görünür widget sayısı */
  visibleWidgetCount: number;
  /** Görünür ayar section sayısı */
  visibleSettingsSectionCount: number;
  /** İstenen widget sayısı */
  requestedCount: number;
  /** Bulunamayan widget sayısı */
  unavailableCount: number;
  /** Tenant kimliği */
  tenantId: string;
  /** BusinessSettings girdisi var mı */
  hasBusinessSettings: boolean;
}

/**
 * Özet öğesi — telemetry / UI için düz liste.
 */
export interface BusinessSettingsWorkspaceSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Widget projeksiyonlarından BusinessSettingsWorkspaceSummary üretir.
 */
export function buildBusinessSettingsWorkspaceSummary(
  projections: readonly BusinessSettingsWorkspaceWidgetProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean,
  tenantId: string,
  hasBusinessSettings: boolean
): BusinessSettingsWorkspaceSummary {
  const visibleWidgetCount = projections.filter((item) => item.visible).length;
  const visibleSettingsSectionCount = projections.filter(
    (item) => item.visible && SETTINGS_SECTION_IDS.has(item.widgetId)
  ).length;

  return {
    success: !hasErrors && projections.length > 0,
    widgetCount: projections.length,
    visibleWidgetCount,
    visibleSettingsSectionCount,
    requestedCount,
    unavailableCount,
    tenantId,
    hasBusinessSettings
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildBusinessSettingsWorkspaceSummaryItems(
  summary: BusinessSettingsWorkspaceSummary,
  locale: 'tr' | 'en',
  actorId?: string
): readonly BusinessSettingsWorkspaceSummaryItem[] {
  const items: BusinessSettingsWorkspaceSummaryItem[] = [
    { key: 'locale', label: 'Locale', value: locale },
    { key: 'tenant-id', label: 'Tenant ID', value: summary.tenantId },
    {
      key: 'widget-count',
      label: 'Widget Count',
      value: summary.widgetCount
    },
    {
      key: 'visible-widget-count',
      label: 'Visible Widget Count',
      value: summary.visibleWidgetCount
    },
    {
      key: 'visible-settings-section-count',
      label: 'Visible Settings Section Count',
      value: summary.visibleSettingsSectionCount
    },
    {
      key: 'requested-count',
      label: 'Requested Count',
      value: summary.requestedCount
    },
    {
      key: 'unavailable-count',
      label: 'Unavailable Count',
      value: summary.unavailableCount
    },
    {
      key: 'has-business-settings',
      label: 'Has Business Settings',
      value: summary.hasBusinessSettings
    },
    {
      key: 'success',
      label: 'Success',
      value: summary.success
    }
  ];

  if (actorId) {
    items.push({ key: 'actor-id', label: 'Actor ID', value: actorId });
  }

  return Object.freeze(items);
}
