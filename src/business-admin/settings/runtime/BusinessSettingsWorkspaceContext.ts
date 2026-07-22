/**
 * İSTEBUL Business Admin — BusinessSettingsWorkspaceContext (PR-202E).
 */

import type { BusinessAdminResult } from '../../runtime/BusinessAdminResult';
import type { BusinessSettings } from './BusinessSettings';
import type { BusinessSettingsWorkspaceWidgetId } from './BusinessSettingsWorkspaceWidget';

/**
 * Business Settings Workspace yürütme girdi bağlamı.
 */
export interface BusinessSettingsWorkspaceContext {
  /** Tenant (işletme) kimliği — zorunlu */
  tenantId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /**
   * Upstream Business Admin sonucu — opsiyonel.
   */
  businessAdminResult?: BusinessAdminResult;
  /**
   * Business Settings projeksiyon girdisi — yoksa iskelet section'lar üretilir.
   */
  businessSettings?: BusinessSettings;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Sınırlı section listesi — boş/undefined ise tüm kayıtlı section'lar */
  widgetIds?: readonly BusinessSettingsWorkspaceWidgetId[];
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * BusinessSettingsWorkspaceContext üretir — locale varsayılanı `tr`.
 */
export function createBusinessSettingsWorkspaceContext(
  partial: Omit<BusinessSettingsWorkspaceContext, 'locale' | 'tenantId'> & {
    tenantId: string;
    locale?: 'tr' | 'en';
  }
): BusinessSettingsWorkspaceContext {
  const { locale, tenantId, ...rest } = partial;
  return {
    ...rest,
    tenantId,
    locale: locale ?? 'tr'
  };
}
