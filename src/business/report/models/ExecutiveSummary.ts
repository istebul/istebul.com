/**
 * İSTEBUL Business Report Engine — yönetici özeti bölümü.
 */

/**
 * Rapor yönetici özeti.
 */
export interface ExecutiveSummary {
  /** Özet başlığı */
  headline: string;
  /** Ana metin */
  body: string;
  /** Öne çıkan maddeler */
  highlights: readonly string[];
}
