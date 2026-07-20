/**
 * İSTEBUL Business Dashboard Engine — nesnel Dashboard Summary (PR-105E).
 *
 * Foundation modellerine eklenmez; yalnızca runtime özet nesnesidir.
 * React / Charts / UI / Export / AI üretmez.
 */

/**
 * Nesnel dashboard özeti — sayılar ve kısa vurgular.
 */
export interface DashboardSummary {
  /** Kısa başlık satırı */
  headline: string;
  /** Öne çıkan nesnel maddeler */
  highlights: readonly string[];
  /** Uyarı / dikkat kodları */
  cautions?: readonly string[];
  /** Toplam sayılar */
  counts: Readonly<{
    widgetCount: number;
    kpiCount: number;
    summarySectionCount: number;
    datasetPresent: boolean;
  }>;
}
