/**
 * İSTEBUL Business Admin — export workspace doğrulama (PR-202D).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — CRUD/API/DB yok.
 */

import type { ExportWorkspaceContext } from './ExportWorkspaceContext';
import type { ExportWorkspaceValidationIssue } from './ExportWorkspaceResult';
import type { ExportWorkspaceWidgetDefinition } from './ExportWorkspaceWidget';
import type { ExportWorkspaceRegistry } from './ExportWorkspaceRegistry';
import type { ExportResult } from './ExportResult';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

function validateExportShape(
  exportResult: ExportResult,
  prefix: string
): ExportWorkspaceValidationIssue[] {
  const issues: ExportWorkspaceValidationIssue[] = [];

  if (!exportResult.requestId || typeof exportResult.requestId !== 'string') {
    issues.push({
      code: 'INVALID_EXPORT_RESULT',
      message: `${prefix}.requestId zorunludur.`,
      severity: 'error'
    });
  }
  if (
    !exportResult.metadata ||
    typeof exportResult.metadata.title !== 'string'
  ) {
    issues.push({
      code: 'INVALID_EXPORT_METADATA',
      message: `${prefix}.metadata.title zorunludur.`,
      severity: 'error'
    });
  }
  if (
    !exportResult.summary ||
    typeof exportResult.summary.headline !== 'string'
  ) {
    issues.push({
      code: 'INVALID_EXPORT_SUMMARY',
      message: `${prefix}.summary.headline zorunludur.`,
      severity: 'error'
    });
  }
  if (
    exportResult.artifacts !== undefined &&
    !Array.isArray(exportResult.artifacts)
  ) {
    issues.push({
      code: 'INVALID_EXPORT_ARTIFACTS',
      message: `${prefix}.artifacts bir dizi olmalıdır.`,
      severity: 'error'
    });
  }
  if (
    exportResult.metadata?.formatIds !== undefined &&
    !Array.isArray(exportResult.metadata.formatIds)
  ) {
    issues.push({
      code: 'INVALID_EXPORT_FORMAT_IDS',
      message: `${prefix}.metadata.formatIds bir dizi olmalıdır.`,
      severity: 'error'
    });
  }

  return issues;
}

/**
 * Export Workspace bağlamını doğrular.
 */
export function validateExportWorkspaceContext(
  context: ExportWorkspaceContext,
  registry: ExportWorkspaceRegistry
): readonly ExportWorkspaceValidationIssue[] {
  const issues: ExportWorkspaceValidationIssue[] = [];

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

    const hasExportsModule = admin.modules?.some(
      (m) => m.moduleId === 'exports'
    );
    if (admin.modules && !hasExportsModule) {
      issues.push({
        code: 'EXPORTS_MODULE_NOT_PROJECTED',
        message:
          'BusinessAdminResult içinde exports modülü yok; registry ile devam edilir.',
        severity: 'warning'
      });
    }
  }

  if (context.exportResult !== undefined) {
    issues.push(...validateExportShape(context.exportResult, 'exportResult'));
  }

  if (context.recentExports !== undefined) {
    if (!Array.isArray(context.recentExports)) {
      issues.push({
        code: 'INVALID_RECENT_EXPORTS',
        message: 'recentExports bir dizi olmalıdır.',
        severity: 'error'
      });
    } else {
      context.recentExports.forEach((item, index) => {
        issues.push(...validateExportShape(item, `recentExports[${index}]`));
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
export function resolveRequestedExportWidgets(
  context: ExportWorkspaceContext,
  registry: ExportWorkspaceRegistry
): {
  widgets: readonly ExportWorkspaceWidgetDefinition[];
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
      (item): item is ExportWorkspaceWidgetDefinition => item !== undefined
    );

  return {
    widgets,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - widgets.length
  };
}
