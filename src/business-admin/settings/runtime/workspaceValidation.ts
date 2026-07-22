/**
 * İSTEBUL Business Admin — business settings workspace doğrulama (PR-202E).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — CRUD/API/DB yok.
 */

import type { BusinessSettingsWorkspaceContext } from './BusinessSettingsWorkspaceContext';
import type { BusinessSettingsWorkspaceValidationIssue } from './BusinessSettingsWorkspaceResult';
import type { BusinessSettingsWorkspaceWidgetDefinition } from './BusinessSettingsWorkspaceWidget';
import type { BusinessSettingsWorkspaceRegistry } from './BusinessSettingsWorkspaceRegistry';
import type { BusinessSettings } from './BusinessSettings';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

function validateBusinessSettingsShape(
  settings: BusinessSettings,
  prefix: string
): BusinessSettingsWorkspaceValidationIssue[] {
  const issues: BusinessSettingsWorkspaceValidationIssue[] = [];

  if (!settings.tenantId || typeof settings.tenantId !== 'string') {
    issues.push({
      code: 'INVALID_BUSINESS_SETTINGS_TENANT',
      message: `${prefix}.tenantId zorunludur.`,
      severity: 'error'
    });
  }

  if (
    !settings.profile ||
    typeof settings.profile.businessName !== 'string' ||
    settings.profile.businessName.trim() === ''
  ) {
    issues.push({
      code: 'INVALID_BUSINESS_SETTINGS_PROFILE',
      message: `${prefix}.profile.businessName zorunludur.`,
      severity: 'error'
    });
  }

  if (
    !settings.organization ||
    typeof settings.organization.organizationName !== 'string' ||
    settings.organization.organizationName.trim() === ''
  ) {
    issues.push({
      code: 'INVALID_BUSINESS_SETTINGS_ORGANIZATION',
      message: `${prefix}.organization.organizationName zorunludur.`,
      severity: 'error'
    });
  }

  if (
    !settings.organization ||
    typeof settings.organization.countryCode !== 'string' ||
    settings.organization.countryCode.trim() === ''
  ) {
    issues.push({
      code: 'INVALID_BUSINESS_SETTINGS_COUNTRY',
      message: `${prefix}.organization.countryCode zorunludur.`,
      severity: 'error'
    });
  }

  if (
    !settings.localization ||
    !VALID_LOCALES.has(settings.localization.defaultLocale)
  ) {
    issues.push({
      code: 'INVALID_BUSINESS_SETTINGS_LOCALIZATION',
      message: `${prefix}.localization.defaultLocale geçersiz.`,
      severity: 'error'
    });
  }

  if (!settings.notifications || typeof settings.notifications !== 'object') {
    issues.push({
      code: 'INVALID_BUSINESS_SETTINGS_NOTIFICATIONS',
      message: `${prefix}.notifications zorunludur.`,
      severity: 'error'
    });
  }

  if (!settings.aiPreferences || typeof settings.aiPreferences !== 'object') {
    issues.push({
      code: 'INVALID_BUSINESS_SETTINGS_AI',
      message: `${prefix}.aiPreferences zorunludur.`,
      severity: 'error'
    });
  }

  if (!settings.branding || typeof settings.branding !== 'object') {
    issues.push({
      code: 'INVALID_BUSINESS_SETTINGS_BRANDING',
      message: `${prefix}.branding zorunludur.`,
      severity: 'error'
    });
  }

  return issues;
}

/**
 * Business Settings Workspace bağlamını doğrular.
 */
export function validateBusinessSettingsWorkspaceContext(
  context: BusinessSettingsWorkspaceContext,
  registry: BusinessSettingsWorkspaceRegistry
): readonly BusinessSettingsWorkspaceValidationIssue[] {
  const issues: BusinessSettingsWorkspaceValidationIssue[] = [];

  if (
    typeof context.tenantId !== 'string' ||
    context.tenantId.trim() === ''
  ) {
    issues.push({
      code: 'MISSING_TENANT_ID',
      message: 'tenantId zorunludur.',
      severity: 'error'
    });
  }

  if (!VALID_LOCALES.has(context.locale)) {
    issues.push({
      code: 'INVALID_LOCALE',
      message: `Geçersiz locale: ${String(context.locale)}`,
      severity: 'error'
    });
  }

  if (context.businessAdminResult !== undefined) {
    const admin = context.businessAdminResult;
    if (!admin.summary || typeof admin.summary.success !== 'boolean') {
      issues.push({
        code: 'INVALID_BUSINESS_ADMIN_RESULT',
        message: 'businessAdminResult.summary.success zorunludur.',
        severity: 'error'
      });
    } else if (!admin.summary.success) {
      issues.push({
        code: 'BUSINESS_ADMIN_NOT_SUCCESS',
        message:
          'Upstream BusinessAdminResult başarısız; workspace projection devam eder.',
        severity: 'warning'
      });
    }

    const hasSettingsModule = admin.modules?.some(
      (m) => m.moduleId === 'business-settings'
    );
    if (admin.modules && !hasSettingsModule) {
      issues.push({
        code: 'BUSINESS_SETTINGS_MODULE_NOT_PROJECTED',
        message:
          'BusinessAdminResult içinde business-settings modülü yok; registry ile devam edilir.',
        severity: 'warning'
      });
    }
  }

  if (context.businessSettings !== undefined) {
    issues.push(
      ...validateBusinessSettingsShape(
        context.businessSettings,
        'businessSettings'
      )
    );

    if (
      context.businessSettings.tenantId &&
      context.tenantId &&
      context.businessSettings.tenantId !== context.tenantId
    ) {
      issues.push({
        code: 'TENANT_ID_MISMATCH',
        message:
          'businessSettings.tenantId context.tenantId ile eşleşmiyor.',
        severity: 'warning'
      });
    }
  }

  if (context.widgetIds !== undefined) {
    if (!Array.isArray(context.widgetIds)) {
      issues.push({
        code: 'INVALID_WIDGET_IDS',
        message: 'widgetIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.widgetIds.length === 0) {
      issues.push({
        code: 'EMPTY_WIDGET_IDS',
        message:
          'widgetIds boş olamaz; tüm section\'lar için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const widgetId of context.widgetIds) {
        if (typeof widgetId !== 'string' || widgetId.trim() === '') {
          issues.push({
            code: 'INVALID_WIDGET_ID',
            message: 'Geçersiz section kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(widgetId)) {
          issues.push({
            code: 'DUPLICATE_WIDGET_ID',
            message: `Yinelenen section kimliği: ${widgetId}`,
            severity: 'warning'
          });
        }
        seen.add(widgetId);
        if (!registry.getById(widgetId)) {
          issues.push({
            code: 'UNKNOWN_WIDGET_ID',
            message: `Kayıtlı olmayan section: ${widgetId}`,
            severity: 'warning'
          });
        }
      }
    }
  }

  if (context.actorId !== undefined && context.actorId.trim() === '') {
    issues.push({
      code: 'EMPTY_ACTOR_ID',
      message: 'actorId boş string olamaz.',
      severity: 'warning'
    });
  }

  return Object.freeze(issues);
}

/**
 * İstenen section kimliklerini kayıtlı section'larla eşleştirir.
 */
export function resolveRequestedBusinessSettingsWidgets(
  context: BusinessSettingsWorkspaceContext,
  registry: BusinessSettingsWorkspaceRegistry
): {
  widgets: readonly BusinessSettingsWorkspaceWidgetDefinition[];
  requestedCount: number;
  unavailableCount: number;
} {
  const allWidgets = registry.getAll();

  if (!context.widgetIds || context.widgetIds.length === 0) {
    return {
      widgets: allWidgets,
      requestedCount: allWidgets.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.widgetIds;
  const widgets = requestedIds
    .map((id) => registry.getById(id))
    .filter(
      (item): item is BusinessSettingsWorkspaceWidgetDefinition =>
        item !== undefined
    );

  return {
    widgets,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - widgets.length
  };
}
