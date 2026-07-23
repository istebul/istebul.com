/**
 * İSTEBUL Business Analysis Engine — summary section tipleri (PR-102E).
 */

/**
 * Summary bölüm kimlikleri.
 */
export type SummarySectionId =
  | 'analysis-metadata'
  | 'dataset-statistics'
  | 'kpi-summary'
  | 'rule-summary'
  | 'finding-summary'
  | 'severity-distribution'
  | 'category-distribution'
  | 'execution-summary';

/**
 * Tek bir summary bölümü.
 */
export interface SummarySection {
  /** Bölüm kimliği */
  id: SummarySectionId;
  /** Başlık */
  title: string;
  /** Kısa nesnel özet satırları */
  items: readonly string[];
  /** Yapılandırılmış sayılar / etiketler */
  metrics: Readonly<Record<string, string | number | boolean | null>>;
  /** Sıra */
  order: number;
}

export const SUMMARY_SECTION_LABELS: Readonly<
  Record<SummarySectionId, string>
> = Object.freeze({
  'analysis-metadata': 'Analysis Metadata',
  'dataset-statistics': 'Dataset Statistics',
  'kpi-summary': 'KPI Summary',
  'rule-summary': 'Rule Summary',
  'finding-summary': 'Finding Summary',
  'severity-distribution': 'Severity Distribution',
  'category-distribution': 'Category Distribution',
  'execution-summary': 'Execution Summary'
});

export const SUMMARY_SECTION_ORDER: readonly SummarySectionId[] = Object.freeze([
  'analysis-metadata',
  'dataset-statistics',
  'kpi-summary',
  'rule-summary',
  'finding-summary',
  'severity-distribution',
  'category-distribution',
  'execution-summary'
]);
