/**
 * İSTEBUL Business Admin — BusinessAdminExecutionContext (PR-202F).
 *
 * Mevcut Business Admin context / bag anahtarları kullanılır.
 * Yeni global bag oluşturulmaz.
 */

import type { BusinessAdminModuleId } from '../../runtime/BusinessAdminModule';
import type { DashboardResult } from '../../dashboard/runtime/DashboardResult';
import type { DashboardWorkspaceWidgetId } from '../../dashboard/runtime/DashboardWorkspaceWidget';
import type { ReportResult } from '../../reports/runtime/ReportResult';
import type { ReportsWorkspaceWidgetId } from '../../reports/runtime/ReportsWorkspaceWidget';
import type { ExportResult } from '../../exports/runtime/ExportResult';
import type { ExportWorkspaceWidgetId } from '../../exports/runtime/ExportWorkspaceWidget';
import type { BusinessSettings } from '../../settings/runtime/BusinessSettings';
import type { BusinessSettingsWorkspaceWidgetId } from '../../settings/runtime/BusinessSettingsWorkspaceWidget';

/**
 * Pipeline bag — yalnızca mevcut Business Admin bag anahtarları.
 */
export type BusinessAdminPipelineBag = Record<string, unknown>;

/**
 * Uçtan uca Business Admin yürütme bağlamı.
 */
export interface BusinessAdminExecutionContext {
  /**
   * Tenant kimliği — başarılı akış için zorunlu.
   * Boş/eksik değer validation aşamasında error üretir.
   */
  tenantId?: string;
  /**
   * Dil — varsayılan `tr`.
   * Geçersiz değerler validation aşamasında error üretir.
   */
  locale?: 'tr' | 'en' | (string & {});
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Foundation modül filtresi */
  moduleIds?: readonly BusinessAdminModuleId[];
  /** Dashboard workspace widget filtresi */
  dashboardWidgetIds?: readonly DashboardWorkspaceWidgetId[];
  /** Reports workspace widget filtresi */
  reportsWidgetIds?: readonly ReportsWorkspaceWidgetId[];
  /** Export workspace widget filtresi */
  exportWidgetIds?: readonly ExportWorkspaceWidgetId[];
  /** Settings workspace section filtresi */
  settingsWidgetIds?: readonly BusinessSettingsWorkspaceWidgetId[];
  /** Opsiyonel Dashboard Engine sonucu */
  dashboardResult?: DashboardResult;
  /** Opsiyonel Report Engine sonucu */
  reportResult?: ReportResult;
  /** Opsiyonel son raporlar */
  recentReports?: readonly ReportResult[];
  /** Opsiyonel Export Engine sonucu */
  exportResult?: ExportResult;
  /** Opsiyonel son exportlar */
  recentExports?: readonly ExportResult[];
  /** Opsiyonel Business Settings girdisi */
  businessSettings?: BusinessSettings;
  /** Başlangıç pipeline bag — mevcut bag anahtarları */
  initialBag?: BusinessAdminPipelineBag;
}

/**
 * BusinessAdminExecutionContext fabrikası.
 */
export function createBusinessAdminExecutionContext(
  partial: BusinessAdminExecutionContext = {}
): BusinessAdminExecutionContext {
  return { ...partial };
}
