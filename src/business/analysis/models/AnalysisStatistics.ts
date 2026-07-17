/**
 * İSTEBUL Business Analysis Engine — istatistik özeti.
 */

/**
 * Dataset üzerinden türetilen üst düzey istatistik alanları.
 */
export interface AnalysisStatistics {
  /** Entity sayısı */
  entityCount: number;
  /** Toplam satır sayısı */
  rowCount: number;
  /** İlişki sayısı */
  relationCount: number;
  /** Hesaplanan KPI sayısı */
  kpiResultCount: number;
  /** Üretilen bulgu sayısı */
  findingCount: number;
}
