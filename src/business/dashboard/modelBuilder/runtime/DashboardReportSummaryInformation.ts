/**
 * İSTEBUL Business Dashboard Engine — Report Summary Information (PR-105B).
 *
 * Narrative üretmez; ReportModel.executiveSummary yapısal alanlarını taşır.
 */

/**
 * Rapor özeti projeksiyonu.
 */
export interface DashboardReportSummaryInformation {
  /** Headline mevcut mu */
  hasHeadline: boolean;
  /** Headline uzunluğu (karakter) */
  headlineLength: number;
  /** Body uzunluğu (karakter) */
  bodyLength: number;
  /** Highlight sayısı */
  highlightCount: number;
  /** Ham headline (nesnel kopya; yeni metin üretilmez) */
  headline: string;
  /** Ham body */
  body: string;
  /** Ham highlights */
  highlights: readonly string[];
  /** Özet var mı */
  present: boolean;
}
