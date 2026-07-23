/**
 * İSTEBUL Business Admin — BusinessSettings girdi sözleşmesi (PR-202E).
 *
 * Projection-only ayar modeli. CRUD / API / DB yok.
 */

/**
 * İşletme profili.
 */
export interface BusinessSettingsProfile {
  businessName: string;
  displayName?: string;
  legalName?: string;
  taxId?: string;
  industry?: string;
  website?: string;
}

/**
 * Organizasyon bilgileri.
 */
export interface BusinessSettingsOrganization {
  organizationName: string;
  countryCode: string;
  city?: string;
  addressLine?: string;
  employeeCountBand?: string;
}

/**
 * Marka / görünüm tercihleri.
 */
export interface BusinessSettingsBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logoLabel?: string;
  faviconLabel?: string;
  themeMode?: 'light' | 'dark' | 'system';
}

/**
 * Yerelleştirme tercihleri.
 */
export interface BusinessSettingsLocalization {
  defaultLocale: 'tr' | 'en';
  timezone?: string;
  currency?: string;
  dateFormat?: string;
}

/**
 * Bildirim tercihleri.
 */
export interface BusinessSettingsNotifications {
  emailEnabled: boolean;
  pushEnabled: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
}

/**
 * AI tercihleri.
 */
export interface BusinessSettingsAiPreferences {
  assistantEnabled: boolean;
  autoSummarize: boolean;
  preferredTone?: string;
  maxTokensPerRequest?: number;
}

/**
 * Business Settings — workspace projeksiyon girdisi.
 */
export interface BusinessSettings {
  /** Tenant kimliği */
  tenantId: string;
  profile: BusinessSettingsProfile;
  organization: BusinessSettingsOrganization;
  branding: BusinessSettingsBranding;
  localization: BusinessSettingsLocalization;
  notifications: BusinessSettingsNotifications;
  aiPreferences: BusinessSettingsAiPreferences;
  /** Son güncelleme ISO */
  updatedAt?: string;
}
