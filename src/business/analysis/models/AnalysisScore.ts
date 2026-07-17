/**
 * İSTEBUL Business Analysis Engine — skor modeli.
 */

/**
 * Birleşik analiz skoru (ör. sağlık / risk / performans).
 */
export interface AnalysisScore {
  /** Skor kimliği */
  id: string;
  /** Görünen ad */
  name: string;
  /** Skor değeri */
  value: number;
  /** Maksimum — varsayılan 100 */
  maxValue: number;
  /** Birim etiketi — örn. puan */
  unit: string;
}
