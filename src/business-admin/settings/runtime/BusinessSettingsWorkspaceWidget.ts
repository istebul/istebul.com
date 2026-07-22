/**
 * İSTEBUL Business Admin — Business Settings Workspace widget modeli (PR-202E).
 *
 * Projection-only iskelet. CRUD / API / DB / Realtime / Auth yok.
 */

/**
 * Workspace section / widget kimlikleri.
 */
export type BusinessSettingsWorkspaceWidgetId =
  | 'business-profile'
  | 'organization'
  | 'branding'
  | 'localization'
  | 'notification-preferences'
  | 'ai-preferences'
  | 'workspace-summary';

/**
 * Widget görsel türü — UI iskeleti için.
 */
export type BusinessSettingsWorkspaceWidgetKind =
  | 'profile'
  | 'organization'
  | 'branding'
  | 'localization'
  | 'notifications'
  | 'ai-preferences'
  | 'summary';

/**
 * Widget durumu.
 */
export type BusinessSettingsWorkspaceWidgetStatus = 'active' | 'coming-soon';

/**
 * Registry kaydı — yerleşik workspace section tanımı.
 */
export interface BusinessSettingsWorkspaceWidgetDefinition {
  id: BusinessSettingsWorkspaceWidgetId;
  name: string;
  description: string;
  order: number;
  kind: BusinessSettingsWorkspaceWidgetKind;
  status: BusinessSettingsWorkspaceWidgetStatus;
  /** Varsayılan görünürlük */
  visible: boolean;
}

/**
 * Ayar alanı projeksiyon öğesi.
 */
export interface BusinessSettingsWorkspaceFieldItem {
  id: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Profile projeksiyonu.
 */
export interface BusinessSettingsProfileProjection {
  businessName: string;
  displayName?: string;
  legalName?: string;
  taxId?: string;
  industry?: string;
  website?: string;
}

/**
 * Organization projeksiyonu.
 */
export interface BusinessSettingsOrganizationProjection {
  organizationName: string;
  countryCode: string;
  city?: string;
  addressLine?: string;
  employeeCountBand?: string;
}

/**
 * Branding projeksiyonu.
 */
export interface BusinessSettingsBrandingProjection {
  primaryColor?: string;
  secondaryColor?: string;
  logoLabel?: string;
  faviconLabel?: string;
  themeMode?: 'light' | 'dark' | 'system';
}

/**
 * Localization projeksiyonu.
 */
export interface BusinessSettingsLocalizationProjection {
  defaultLocale: 'tr' | 'en';
  timezone?: string;
  currency?: string;
  dateFormat?: string;
}

/**
 * Notifications projeksiyonu.
 */
export interface BusinessSettingsNotificationsProjection {
  emailEnabled: boolean;
  pushEnabled: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
}

/**
 * AI Preferences projeksiyonu.
 */
export interface BusinessSettingsAiPreferencesProjection {
  assistantEnabled: boolean;
  autoSummarize: boolean;
  preferredTone?: string;
  maxTokensPerRequest?: number;
}

/**
 * Workspace Summary projeksiyonu.
 */
export interface BusinessSettingsExecutionProjection {
  tenantId: string;
  sectionCount: number;
  filledSectionCount: number;
  hasBusinessSettings: boolean;
  updatedAt?: string;
}

/**
 * Widget projeksiyonu — runtime çıktısı.
 */
export interface BusinessSettingsWorkspaceWidgetProjection {
  widgetId: BusinessSettingsWorkspaceWidgetId;
  name: string;
  description: string;
  kind: BusinessSettingsWorkspaceWidgetKind;
  status: BusinessSettingsWorkspaceWidgetStatus;
  visible: boolean;
  order: number;
  title: string;
  itemCount: number;
  fields: readonly BusinessSettingsWorkspaceFieldItem[];
  profile?: BusinessSettingsProfileProjection;
  organization?: BusinessSettingsOrganizationProjection;
  branding?: BusinessSettingsBrandingProjection;
  localization?: BusinessSettingsLocalizationProjection;
  notifications?: BusinessSettingsNotificationsProjection;
  aiPreferences?: BusinessSettingsAiPreferencesProjection;
  execution?: BusinessSettingsExecutionProjection;
  /** Foundation katmanında her zaman true — CRUD yok */
  projected: true;
}

/**
 * Tanımı boş/iskelet projeksiyona dönüştürür.
 */
export function toEmptyBusinessSettingsWidgetProjection(
  definition: BusinessSettingsWorkspaceWidgetDefinition
): BusinessSettingsWorkspaceWidgetProjection {
  return {
    widgetId: definition.id,
    name: definition.name,
    description: definition.description,
    kind: definition.kind,
    status: definition.status,
    visible: definition.visible && definition.status === 'active',
    order: definition.order,
    title: definition.name,
    itemCount: 0,
    fields: Object.freeze([]),
    projected: true
  };
}
