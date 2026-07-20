/**
 * İSTEBUL Business Dashboard Engine — Dashboard Summary section tipleri (PR-105E).
 */

/**
 * Dashboard Summary bölüm kimlikleri.
 */
export type DashboardSummarySectionId =
  | 'dashboard-metadata'
  | 'widget-summary'
  | 'kpi-summary'
  | 'dataset-summary'
  | 'report-summary'
  | 'execution-summary';

/**
 * Tek bir Dashboard Summary bölümü — yalnızca nesnel özet.
 */
export interface DashboardSummarySection {
  /** Bölüm kimliği */
  id: DashboardSummarySectionId;
  /** Başlık */
  title: string;
  /** Kısa nesnel özet satırları */
  items: readonly string[];
  /** Yapılandırılmış sayılar / etiketler */
  metrics: Readonly<Record<string, string | number | boolean | null>>;
  /** Sıra */
  order: number;
}

export const DASHBOARD_SUMMARY_SECTION_LABELS: Readonly<
  Record<DashboardSummarySectionId, string>
> = Object.freeze({
  'dashboard-metadata': 'Dashboard Metadata',
  'widget-summary': 'Widget Summary',
  'kpi-summary': 'KPI Summary',
  'dataset-summary': 'Dataset Summary',
  'report-summary': 'Report Summary',
  'execution-summary': 'Execution Summary'
});

export const DASHBOARD_SUMMARY_SECTION_ORDER: readonly DashboardSummarySectionId[] =
  Object.freeze([
    'dashboard-metadata',
    'widget-summary',
    'kpi-summary',
    'dataset-summary',
    'report-summary',
    'execution-summary'
  ]);
