/**
 * İSTEBUL Business Report Engine — Report Summary section tipleri (PR-104E).
 */

/**
 * Report Summary bölüm kimlikleri.
 */
export type ReportSummarySectionId =
  | 'report-metadata'
  | 'section-summary'
  | 'narrative-summary'
  | 'recommendation-summary'
  | 'action-plan-summary'
  | 'execution-summary';

/**
 * Tek bir Report Summary bölümü — yalnızca nesnel özet.
 */
export interface ReportSummarySection {
  /** Bölüm kimliği */
  id: ReportSummarySectionId;
  /** Başlık */
  title: string;
  /** Kısa nesnel özet satırları */
  items: readonly string[];
  /** Yapılandırılmış sayılar / etiketler */
  metrics: Readonly<Record<string, string | number | boolean | null>>;
  /** Sıra */
  order: number;
}

export const REPORT_SUMMARY_SECTION_LABELS: Readonly<
  Record<ReportSummarySectionId, string>
> = Object.freeze({
  'report-metadata': 'Report Metadata',
  'section-summary': 'Section Summary',
  'narrative-summary': 'Narrative Summary',
  'recommendation-summary': 'Recommendation Summary',
  'action-plan-summary': 'Action Plan Summary',
  'execution-summary': 'Execution Summary'
});

export const REPORT_SUMMARY_SECTION_ORDER: readonly ReportSummarySectionId[] =
  Object.freeze([
    'report-metadata',
    'section-summary',
    'narrative-summary',
    'recommendation-summary',
    'action-plan-summary',
    'execution-summary'
  ]);
