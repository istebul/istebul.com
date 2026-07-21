/**
 * İSTEBUL Business Admin — Export Workspace Summary (PR-202D).
 */

import type { ExportWorkspaceWidgetProjection } from './ExportWorkspaceWidget';

/**
 * Workspace Summary — yürütme özeti.
 */
export interface ExportWorkspaceSummary {
  /** Genel başarı */
  success: boolean;
  /** Projeksiyon üretilen widget sayısı */
  widgetCount: number;
  /** Görünür widget sayısı */
  visibleWidgetCount: number;
  /** Görünür export sayısı (recent-exports) */
  visibleExportCount: number;
  /** İstenen widget sayısı */
  requestedCount: number;
  /** Bulunamayan widget sayısı */
  unavailableCount: number;
  /** Tenant kimliği */
  tenantId: string;
  /** Export sonucu var mı */
  hasExportResult: boolean;
}

/**
 * Özet öğesi — telemetry / UI için düz liste.
 */
export interface ExportWorkspaceSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Widget projeksiyonlarından ExportWorkspaceSummary üretir.
 */
export function buildExportWorkspaceSummary(
  projections: readonly ExportWorkspaceWidgetProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean,
  tenantId: string,
  hasExportResult: boolean
): ExportWorkspaceSummary {
  const visibleWidgetCount = projections.filter((item) => item.visible).length;
  const recentExports = projections.find(
    (item) => item.widgetId === 'recent-exports'
  );
  const visibleExportCount = recentExports?.itemCount ?? 0;

  return {
    success: !hasErrors && projections.length > 0,
    widgetCount: projections.length,
    visibleWidgetCount,
    visibleExportCount,
    requestedCount,
    unavailableCount,
    tenantId,
    hasExportResult
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildExportWorkspaceSummaryItems(
  summary: ExportWorkspaceSummary,
  locale: 'tr' | 'en',
  actorId?: string
): readonly ExportWorkspaceSummaryItem[] {
  const items: ExportWorkspaceSummaryItem[] = [
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
      key: 'visible-export-count',
      label: 'Visible Export Count',
      value: summary.visibleExportCount
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
      key: 'has-export-result',
      label: 'Has Export Result',
      value: summary.hasExportResult
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
