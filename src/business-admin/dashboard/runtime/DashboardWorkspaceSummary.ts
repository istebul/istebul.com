/**
 * İSTEBUL Business Admin — Dashboard Workspace Summary (PR-202B).
 */

import type { DashboardWorkspaceWidgetProjection } from './DashboardWorkspaceWidget';

/**
 * Workspace Summary — yürütme özeti.
 */
export interface DashboardWorkspaceSummary {
  /** Genel başarı */
  success: boolean;
  /** Projeksiyon üretilen widget sayısı */
  widgetCount: number;
  /** Görünür widget sayısı */
  visibleWidgetCount: number;
  /** İstenen widget sayısı */
  requestedCount: number;
  /** Bulunamayan widget sayısı */
  unavailableCount: number;
  /** Tenant kimliği */
  tenantId: string;
  /** Dashboard sonucu var mı */
  hasDashboardResult: boolean;
}

/**
 * Özet öğesi — telemetry / UI için düz liste.
 */
export interface DashboardWorkspaceSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Widget projeksiyonlarından DashboardWorkspaceSummary üretir.
 */
export function buildDashboardWorkspaceSummary(
  projections: readonly DashboardWorkspaceWidgetProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean,
  tenantId: string,
  hasDashboardResult: boolean
): DashboardWorkspaceSummary {
  const visibleWidgetCount = projections.filter((item) => item.visible).length;

  return {
    success: !hasErrors && projections.length > 0,
    widgetCount: projections.length,
    visibleWidgetCount,
    requestedCount,
    unavailableCount,
    tenantId,
    hasDashboardResult
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildDashboardWorkspaceSummaryItems(
  summary: DashboardWorkspaceSummary,
  locale: 'tr' | 'en',
  actorId?: string
): readonly DashboardWorkspaceSummaryItem[] {
  const items: DashboardWorkspaceSummaryItem[] = [
    { key: 'locale', label: 'Locale', value: locale },
    { key: 'tenant-id', label: 'Tenant ID', value: summary.tenantId },
    {
      key: 'widget-count',
      label: 'Widget Count',
      value: summary.widgetCount
    },
    {
      key: 'visible-widget-count',
      label: 'Visible Widget Count',
      value: summary.visibleWidgetCount
    },
    {
      key: 'requested-count',
      label: 'Requested Count',
      value: summary.requestedCount
    },
    {
      key: 'unavailable-count',
      label: 'Unavailable Count',
      value: summary.unavailableCount
    },
    {
      key: 'has-dashboard-result',
      label: 'Has Dashboard Result',
      value: summary.hasDashboardResult
    },
    {
      key: 'success',
      label: 'Success',
      value: summary.success
    }
  ];

  if (actorId) {
    items.push({ key: 'actor-id', label: 'Actor ID', value: actorId });
  }

  return Object.freeze(items);
}
