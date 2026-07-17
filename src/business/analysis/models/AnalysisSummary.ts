/**
 * İSTEBUL Business Analysis Engine — özet modeli.
 */

/**
 * Yönetici / rapor yüzeyi için kısa özet.
 */
export interface AnalysisSummary {
  /** Tek paragraf özet (Türkçe) */
  headline: string;
  /** Madde madde öne çıkanlar */
  highlights: readonly string[];
  /** Önerilen aksiyonlar — kural motorundan türeyebilir */
  recommendations?: readonly string[];
}
