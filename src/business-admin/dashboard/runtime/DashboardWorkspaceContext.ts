/**
 * İSTEBUL Business Admin — DashboardWorkspaceContext (PR-202B).
 */

import type { BusinessAdminResult } from '../../runtime/BusinessAdminResult';
import type { DashboardResult } from './DashboardResult';
import type { DashboardWorkspaceWidgetId } from './DashboardWorkspaceWidget';

/**
 * Dashboard Workspace yürütme girdi bağlamı.
 */
export interface DashboardWorkspaceContext {
  /** Tenant (işletme) kimliği — zorunlu */
  tenantId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /**
   * Upstream Business Admin sonucu — opsiyonel.
   * Yoksa yalnızca registry + DashboardResult üzerinden projeksiyon yapılır.
   */
  businessAdminResult?: BusinessAdminResult;
  /**
   * Dashboard Engine sonucu (DashboardModel) — workspace projeksiyon girdisi.
   * Yoksa iskelet/boş widget projeksiyonları üretilir.
   */
  dashboardResult?: DashboardResult;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı widget listesi — boş/undefined ise tüm kayıtlı widget'lar */
  widgetIds?: readonly DashboardWorkspaceWidgetId[];
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * DashboardWorkspaceContext üretir — locale varsayılanı `tr`.
 */
export function createDashboardWorkspaceContext(
  partial: Omit<DashboardWorkspaceContext, 'locale' | 'tenantId'> & {
    tenantId: string;
    locale?: 'tr' | 'en';
  }
): DashboardWorkspaceContext {
  const { locale, tenantId, ...rest } = partial;
  return {
    ...rest,
    tenantId,
    locale: locale ?? 'tr'
  };
}
