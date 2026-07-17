/**
 * İSTEBUL Business Decision Engine — öncelik modeli.
 */

/**
 * Karar önceliği seviyesi.
 */
export type DecisionPriorityLevel =
  | 'dusuk'
  | 'orta'
  | 'yuksek'
  | 'kritik';

/**
 * Öncelik skoru ve etiket.
 */
export interface DecisionPriority {
  /** Öncelik kimliği */
  id: string;
  /** Seviye */
  level: DecisionPriorityLevel;
  /** Sayısal skor — sıralama için */
  score: number;
  /** Gerekçe (Türkçe) */
  rationale: string;
}
