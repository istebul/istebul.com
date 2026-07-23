/**
 * İSTEBUL Business Admin — business settings workspace projeksiyon (PR-202E).
 *
 * Pipeline aşaması 2: Workspace Projection.
 * BusinessSettings → section projeksiyonları.
 */

import type { BusinessSettings } from './BusinessSettings';
import type { BusinessSettingsWorkspaceContext } from './BusinessSettingsWorkspaceContext';
import type {
  BusinessSettingsWorkspaceFieldItem,
  BusinessSettingsWorkspaceWidgetDefinition,
  BusinessSettingsWorkspaceWidgetProjection
} from './BusinessSettingsWorkspaceWidget';
import { toEmptyBusinessSettingsWidgetProjection } from './BusinessSettingsWorkspaceWidget';

function field(
  id: string,
  label: string,
  value: string | number | boolean | undefined
): BusinessSettingsWorkspaceFieldItem | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  return { id, label, value };
}

function collectFields(
  entries: Array<BusinessSettingsWorkspaceFieldItem | undefined>
): readonly BusinessSettingsWorkspaceFieldItem[] {
  return Object.freeze(
    entries.filter(
      (item): item is BusinessSettingsWorkspaceFieldItem => item !== undefined
    )
  );
}

function countFilledSections(settings: BusinessSettings): number {
  let count = 0;
  if (settings.profile.businessName) count += 1;
  if (settings.organization.organizationName) count += 1;
  if (
    settings.branding.primaryColor ||
    settings.branding.logoLabel ||
    settings.branding.themeMode
  ) {
    count += 1;
  }
  if (settings.localization.defaultLocale) count += 1;
  if (typeof settings.notifications.emailEnabled === 'boolean') count += 1;
  if (typeof settings.aiPreferences.assistantEnabled === 'boolean') count += 1;
  return count;
}

/**
 * Tek bir section tanımını BusinessSettings ile projekte eder.
 */
export function projectBusinessSettingsWorkspaceWidget(
  definition: BusinessSettingsWorkspaceWidgetDefinition,
  context: BusinessSettingsWorkspaceContext
): BusinessSettingsWorkspaceWidgetProjection {
  const base = toEmptyBusinessSettingsWidgetProjection(definition);
  const settings = context.businessSettings;

  switch (definition.id) {
    case 'business-profile': {
      if (!settings) {
        return base;
      }
      const profile = { ...settings.profile };
      const fields = collectFields([
        field('businessName', 'Business Name', profile.businessName),
        field('displayName', 'Display Name', profile.displayName),
        field('legalName', 'Legal Name', profile.legalName),
        field('taxId', 'Tax ID', profile.taxId),
        field('industry', 'Industry', profile.industry),
        field('website', 'Website', profile.website)
      ]);
      return {
        ...base,
        title: profile.displayName ?? profile.businessName,
        itemCount: fields.length,
        fields,
        profile
      };
    }
    case 'organization': {
      if (!settings) {
        return base;
      }
      const organization = { ...settings.organization };
      const fields = collectFields([
        field(
          'organizationName',
          'Organization Name',
          organization.organizationName
        ),
        field('countryCode', 'Country', organization.countryCode),
        field('city', 'City', organization.city),
        field('addressLine', 'Address', organization.addressLine),
        field(
          'employeeCountBand',
          'Employees',
          organization.employeeCountBand
        )
      ]);
      return {
        ...base,
        title: organization.organizationName,
        itemCount: fields.length,
        fields,
        organization
      };
    }
    case 'branding': {
      if (!settings) {
        return base;
      }
      const branding = { ...settings.branding };
      const fields = collectFields([
        field('primaryColor', 'Primary Color', branding.primaryColor),
        field('secondaryColor', 'Secondary Color', branding.secondaryColor),
        field('logoLabel', 'Logo', branding.logoLabel),
        field('faviconLabel', 'Favicon', branding.faviconLabel),
        field('themeMode', 'Theme', branding.themeMode)
      ]);
      return {
        ...base,
        title: definition.name,
        itemCount: fields.length,
        fields,
        branding
      };
    }
    case 'localization': {
      if (!settings) {
        return base;
      }
      const localization = { ...settings.localization };
      const fields = collectFields([
        field('defaultLocale', 'Default Locale', localization.defaultLocale),
        field('timezone', 'Timezone', localization.timezone),
        field('currency', 'Currency', localization.currency),
        field('dateFormat', 'Date Format', localization.dateFormat)
      ]);
      return {
        ...base,
        title: definition.name,
        itemCount: fields.length,
        fields,
        localization
      };
    }
    case 'notification-preferences': {
      if (!settings) {
        return base;
      }
      const notifications = { ...settings.notifications };
      const fields = collectFields([
        field('emailEnabled', 'Email', notifications.emailEnabled),
        field('pushEnabled', 'Push', notifications.pushEnabled),
        field('weeklyDigest', 'Weekly Digest', notifications.weeklyDigest),
        field(
          'securityAlerts',
          'Security Alerts',
          notifications.securityAlerts
        )
      ]);
      return {
        ...base,
        title: definition.name,
        itemCount: fields.length,
        fields,
        notifications
      };
    }
    case 'ai-preferences': {
      if (!settings) {
        return base;
      }
      const aiPreferences = { ...settings.aiPreferences };
      const fields = collectFields([
        field(
          'assistantEnabled',
          'Assistant',
          aiPreferences.assistantEnabled
        ),
        field('autoSummarize', 'Auto Summarize', aiPreferences.autoSummarize),
        field('preferredTone', 'Tone', aiPreferences.preferredTone),
        field(
          'maxTokensPerRequest',
          'Max Tokens',
          aiPreferences.maxTokensPerRequest
        )
      ]);
      return {
        ...base,
        title: definition.name,
        itemCount: fields.length,
        fields,
        aiPreferences
      };
    }
    case 'workspace-summary': {
      const execution = {
        tenantId: context.tenantId,
        sectionCount: 6,
        filledSectionCount: settings ? countFilledSections(settings) : 0,
        hasBusinessSettings: settings !== undefined,
        updatedAt: settings?.updatedAt
      };
      return {
        ...base,
        itemCount: 1,
        execution
      };
    }
    default:
      return base;
  }
}

/**
 * Kayıtlı section tanımlarını projeksiyon listesine dönüştürür.
 */
export function projectBusinessSettingsWorkspaceWidgets(
  definitions: readonly BusinessSettingsWorkspaceWidgetDefinition[],
  context: BusinessSettingsWorkspaceContext
): readonly BusinessSettingsWorkspaceWidgetProjection[] {
  return Object.freeze(
    definitions.map((definition) =>
      projectBusinessSettingsWorkspaceWidget(definition, context)
    )
  );
}
