/**
 * İSTEBUL Business Admin — ReportsWorkspaceContext (PR-202C).
 */

import type { BusinessAdminResult } from '../../runtime/BusinessAdminResult';
import type { ReportResult } from './ReportResult';
import type { ReportsWorkspaceWidgetId } from './ReportsWorkspaceWidget';

/**
 * Reports Workspace yürütme girdi bağlamı.
 */
export interface ReportsWorkspaceContext {
  /** Tenant (işletme) kimliği — zorunlu */
  tenantId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /**
   * Upstream Business Admin sonucu — opsiyonel.
   */
  businessAdminResult?: BusinessAdminResult;
  /**
   * Birincil Report Engine sonucu (ReportModel) — detay/overview/status girdisi.
   */
  reportResult?: ReportResult;
  /**
   * Son raporlar listesi — yoksa reportResult tek öğe olarak kullanılır.
   */
  recentReports?: readonly ReportResult[];
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı widget listesi — boş/undefined ise tüm kayıtlı widget'lar */
  widgetIds?: readonly ReportsWorkspaceWidgetId[];
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * ReportsWorkspaceContext üretir — locale varsayılanı `tr`.
 */
export function createReportsWorkspaceContext(
  partial: Omit<ReportsWorkspaceContext, 'locale' | 'tenantId'> & {
    tenantId: string;
    locale?: 'tr' | 'en';
  }
): ReportsWorkspaceContext {
  const { locale, tenantId, ...rest } = partial;
  return {
    ...rest,
    tenantId,
    locale: locale ?? 'tr'
  };
}
