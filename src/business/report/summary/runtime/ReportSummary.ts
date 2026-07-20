/**
 * İSTEBUL Business Report Engine — nesnel Report Summary (PR-104E).
 *
 * Foundation modellerine eklenmez; yalnızca runtime özet nesnesidir.
 * Narrative / PDF / Export üretmez.
 */

/**
 * Nesnel rapor özeti — sayılar ve kısa vurgular.
 */
export interface ReportSummary {
  /** Kısa başlık satırı */
  headline: string;
  /** Öne çıkan nesnel maddeler */
  highlights: readonly string[];
  /** Uyarı / dikkat kodları */
  cautions?: readonly string[];
  /** Toplam sayılar */
  counts: Readonly<{
    sectionCount: number;
    narrativeCount: number;
    recommendationCount: number;
    actionCount: number;
  }>;
}
