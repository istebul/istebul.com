/**
 * İSTEBUL Business Decision Engine — skor modeli.
 */

/**
 * Birleşik karar skoru (ör. genel sağlık, risk marjı).
 */
export interface DecisionScore {
  /** Skor kimliği */
  id: string;
  /** Görünen ad */
  name: string;
  /** Değer */
  value: number;
  /** Maksimum */
  maxValue: number;
  /** Birim */
  unit: string;
}
