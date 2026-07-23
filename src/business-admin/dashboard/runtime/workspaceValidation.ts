/**
 * İSTEBUL Business Admin — dashboard workspace doğrulama (PR-202B).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — CRUD/API/DB yok.
 */

import type { DashboardWorkspaceContext } from './DashboardWorkspaceContext';
import type { DashboardWorkspaceValidationIssue } from './DashboardWorkspaceResult';
import type { DashboardWorkspaceWidgetDefinition } from './DashboardWorkspaceWidget';
import type { DashboardWorkspaceRegistry } from './DashboardWorkspaceRegistry';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

/**
 * Dashboard Workspace bağlamını doğrular.
 */
export function validateDashboardWorkspaceContext(
  context: DashboardWorkspaceContext,
  registry: DashboardWorkspaceRegistry
): readonly DashboardWorkspaceValidationIssue[] {
  const issues: DashboardWorkspaceValidationIssue[] = [];

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

    const hasDashboardModule = admin.modules?.some(
      (m) => m.moduleId === 'dashboard'
    );
    if (admin.modules && !hasDashboardModule) {
      issues.push({
        code: 'DASHBOARD_MODULE_NOT_PROJECTED',
        message:
          'BusinessAdminResult içinde dashboard modülü yok; registry ile devam edilir.',
        severity: 'warning'
      });
    }
  }

  if (context.dashboardResult !== undefined) {
    const dashboard = context.dashboardResult;
    if (!dashboard.id || typeof dashboard.id !== 'string') {
      issues.push({
        code: 'INVALID_DASHBOARD_RESULT',
        message: 'dashboardResult.id zorunludur.',
        severity: 'error'
      });
    }
    if (!dashboard.metadata || typeof dashboard.metadata.title !== 'string') {
      issues.push({
        code: 'INVALID_DASHBOARD_METADATA',
        message: 'dashboardResult.metadata.title zorunludur.',
        severity: 'error'
      });
    }
    if (dashboard.kpis !== undefined && !Array.isArray(dashboard.kpis)) {
      issues.push({
        code: 'INVALID_DASHBOARD_KPIS',
        message: 'dashboardResult.kpis bir dizi olmalıdır.',
        severity: 'error'
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
          'widgetIds boş olamaz; tüm widget\'lar için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const widgetId of context.widgetIds) {
        if (typeof widgetId !== 'string' || widgetId.trim() === '') {
          issues.push({
            code: 'INVALID_WIDGET_ID',
            message: 'Geçersiz widget kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(widgetId)) {
          issues.push({
            code: 'DUPLICATE_WIDGET_ID',
            message: `Yinelenen widget kimliği: ${widgetId}`,
            severity: 'warning'
          });
        }
        seen.add(widgetId);
        if (!registry.getById(widgetId)) {
          issues.push({
            code: 'UNKNOWN_WIDGET_ID',
            message: `Kayıtlı olmayan widget: ${widgetId}`,
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
 * İstenen widget kimliklerini kayıtlı widget'larla eşleştirir.
 */
export function resolveRequestedWidgets(
  context: DashboardWorkspaceContext,
  registry: DashboardWorkspaceRegistry
): {
  widgets: readonly DashboardWorkspaceWidgetDefinition[];
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
      (item): item is DashboardWorkspaceWidgetDefinition => item !== undefined
    );

  return {
    widgets,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - widgets.length
  };
}
