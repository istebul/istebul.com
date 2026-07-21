/**
 * İSTEBUL Business Admin — reports workspace doğrulama (PR-202C).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — CRUD/API/DB yok.
 */

import type { ReportsWorkspaceContext } from './ReportsWorkspaceContext';
import type { ReportsWorkspaceValidationIssue } from './ReportsWorkspaceResult';
import type { ReportsWorkspaceWidgetDefinition } from './ReportsWorkspaceWidget';
import type { ReportsWorkspaceRegistry } from './ReportsWorkspaceRegistry';
import type { ReportResult } from './ReportResult';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

function validateReportShape(
  report: ReportResult,
  prefix: string
): ReportsWorkspaceValidationIssue[] {
  const issues: ReportsWorkspaceValidationIssue[] = [];

  if (!report.id || typeof report.id !== 'string') {
    issues.push({
      code: 'INVALID_REPORT_RESULT',
      message: `${prefix}.id zorunludur.`,
      severity: 'error'
    });
  }
  if (!report.metadata || typeof report.metadata.title !== 'string') {
    issues.push({
      code: 'INVALID_REPORT_METADATA',
      message: `${prefix}.metadata.title zorunludur.`,
      severity: 'error'
    });
  }
  if (
    !report.executiveSummary ||
    typeof report.executiveSummary.headline !== 'string'
  ) {
    issues.push({
      code: 'INVALID_REPORT_EXECUTIVE_SUMMARY',
      message: `${prefix}.executiveSummary.headline zorunludur.`,
      severity: 'error'
    });
  }
  if (report.sections !== undefined && !Array.isArray(report.sections)) {
    issues.push({
      code: 'INVALID_REPORT_SECTIONS',
      message: `${prefix}.sections bir dizi olmalıdır.`,
      severity: 'error'
    });
  }

  return issues;
}

/**
 * Reports Workspace bağlamını doğrular.
 */
export function validateReportsWorkspaceContext(
  context: ReportsWorkspaceContext,
  registry: ReportsWorkspaceRegistry
): readonly ReportsWorkspaceValidationIssue[] {
  const issues: ReportsWorkspaceValidationIssue[] = [];

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

    const hasReportsModule = admin.modules?.some(
      (m) => m.moduleId === 'reports'
    );
    if (admin.modules && !hasReportsModule) {
      issues.push({
        code: 'REPORTS_MODULE_NOT_PROJECTED',
        message:
          'BusinessAdminResult içinde reports modülü yok; registry ile devam edilir.',
        severity: 'warning'
      });
    }
  }

  if (context.reportResult !== undefined) {
    issues.push(...validateReportShape(context.reportResult, 'reportResult'));
  }

  if (context.recentReports !== undefined) {
    if (!Array.isArray(context.recentReports)) {
      issues.push({
        code: 'INVALID_RECENT_REPORTS',
        message: 'recentReports bir dizi olmalıdır.',
        severity: 'error'
      });
    } else {
      context.recentReports.forEach((report, index) => {
        issues.push(
          ...validateReportShape(report, `recentReports[${index}]`)
        );
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
export function resolveRequestedReportsWidgets(
  context: ReportsWorkspaceContext,
  registry: ReportsWorkspaceRegistry
): {
  widgets: readonly ReportsWorkspaceWidgetDefinition[];
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
      (item): item is ReportsWorkspaceWidgetDefinition => item !== undefined
    );

  return {
    widgets,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - widgets.length
  };
}
