/**
 * İSTEBUL Business Decision Engine — aksiyon modeli.
 */

/**
 * Önerilen operasyonel aksiyon.
 */
export type DecisionActionKind =
  | 'incele'
  | 'onayla'
  | 'durdur'
  | 'iyilestir'
  | 'eskalasyon'
  | 'izle';

export interface DecisionAction {
  /** Aksiyon kimliği */
  id: string;
  /** Tür */
  kind: DecisionActionKind;
  /** Başlık (Türkçe) */
  title: string;
  /** Açıklama */
  description: string;
  /** İlgili öneri kimliği */
  recommendationId?: string;
}
