/**
 * İSTEBUL Business Report Engine — Summary Information (PR-104B).
 *
 * Narrative üretmez; DecisionSummary yapısal alanlarını taşır.
 */

/**
 * Özet bilgisi bölümü.
 */
export interface ReportSummaryInformation {
  /** Headline mevcut mu */
  hasHeadline: boolean;
  /** Headline uzunluğu (karakter) */
  headlineLength: number;
  /** Highlight sayısı */
  highlightCount: number;
  /** Caution sayısı */
  cautionCount: number;
  /** Ham headline (nesnel kopya; yeni metin üretilmez) */
  headline: string;
  /** Ham highlights */
  highlights: readonly string[];
  /** Ham cautions */
  cautions: readonly string[];
  /** Özet var mı */
  present: boolean;
}
