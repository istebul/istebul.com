/**
 * İSTEBUL Business Export Engine — nesnel Export Summary (PR-106E).
 *
 * Foundation `models/ExportSummary` ile karıştırılmamalıdır.
 * Bu tip yalnızca Summary Runtime özet nesnesidir; dosya / AI üretmez.
 */

/**
 * Nesnel export özeti — sayılar ve kısa vurgular.
 */
export interface ExportSummary {
  /** Kısa başlık satırı */
  headline: string;
  /** Öne çıkan nesnel maddeler */
  highlights: readonly string[];
  /** Uyarı / dikkat kodları */
  cautions?: readonly string[];
  /** Toplam sayılar */
  counts: Readonly<{
    validationPassed: boolean | null;
    exportModelPresent: boolean;
    renderSectionCount: number;
    formatCount: number;
    summarySectionCount: number;
    summaryItemCount: number;
    warningCount: number;
  }>;
}
