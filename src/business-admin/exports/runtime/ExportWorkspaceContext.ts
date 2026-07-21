/**
 * İSTEBUL Business Admin — ExportWorkspaceContext (PR-202D).
 */

import type { BusinessAdminResult } from '../../runtime/BusinessAdminResult';
import type { ExportResult } from './ExportResult';
import type { ExportWorkspaceWidgetId } from './ExportWorkspaceWidget';

/**
 * Export Workspace yürütme girdi bağlamı.
 */
export interface ExportWorkspaceContext {
  /** Tenant (işletme) kimliği — zorunlu */
  tenantId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /**
   * Upstream Business Admin sonucu — opsiyonel.
   */
  businessAdminResult?: BusinessAdminResult;
  /**
   * Birincil Export Engine sonucu — overview/status/formats girdisi.
   */
  exportResult?: ExportResult;
  /**
   * Son export listesi — yoksa exportResult tek öğe olarak kullanılır.
   */
  recentExports?: readonly ExportResult[];
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı widget listesi — boş/undefined ise tüm kayıtlı widget'lar */
  widgetIds?: readonly ExportWorkspaceWidgetId[];
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * ExportWorkspaceContext üretir — locale varsayılanı `tr`.
 */
export function createExportWorkspaceContext(
  partial: Omit<ExportWorkspaceContext, 'locale' | 'tenantId'> & {
    tenantId: string;
    locale?: 'tr' | 'en';
  }
): ExportWorkspaceContext {
  const { locale, tenantId, ...rest } = partial;
  return {
    ...rest,
    tenantId,
    locale: locale ?? 'tr'
  };
}
