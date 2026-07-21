/**
 * İSTEBUL Business Admin — Reports Workspace Summary (PR-202C).
 */

import type { ReportsWorkspaceWidgetProjection } from './ReportsWorkspaceWidget';

/**
 * Workspace Summary — yürütme özeti.
 */
export interface ReportsWorkspaceSummary {
  /** Genel başarı */
  success: boolean;
  /** Projeksiyon üretilen widget sayısı */
  widgetCount: number;
  /** Görünür widget sayısı */
  visibleWidgetCount: number;
  /** Görünür rapor sayısı (recent-reports) */
  visibleReportCount: number;
  /** İstenen widget sayısı */
  requestedCount: number;
  /** Bulunamayan widget sayısı */
  unavailableCount: number;
  /** Tenant kimliği */
  tenantId: string;
  /** Report sonucu var mı */
  hasReportResult: boolean;
}

/**
 * Özet öğesi — telemetry / UI için düz liste.
 */
export interface ReportsWorkspaceSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Widget projeksiyonlarından ReportsWorkspaceSummary üretir.
 */
export function buildReportsWorkspaceSummary(
  projections: readonly ReportsWorkspaceWidgetProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean,
  tenantId: string,
  hasReportResult: boolean
): ReportsWorkspaceSummary {
  const visibleWidgetCount = projections.filter((item) => item.visible).length;
  const recentReports = projections.find(
    (item) => item.widgetId === 'recent-reports'
  );
  const visibleReportCount = recentReports?.itemCount ?? 0;

  return {
    success: !hasErrors && projections.length > 0,
    widgetCount: projections.length,
    visibleWidgetCount,
    visibleReportCount,
    requestedCount,
    unavailableCount,
    tenantId,
    hasReportResult
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildReportsWorkspaceSummaryItems(
  summary: ReportsWorkspaceSummary,
  locale: 'tr' | 'en',
  actorId?: string
): readonly ReportsWorkspaceSummaryItem[] {
  const items: ReportsWorkspaceSummaryItem[] = [
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
      key: 'visible-report-count',
      label: 'Visible Report Count',
      value: summary.visibleReportCount
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
      key: 'has-report-result',
      label: 'Has Report Result',
      value: summary.hasReportResult
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
