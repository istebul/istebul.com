/**
 * İSTEBUL Business Decision Engine — risk modeli.
 */

/**
 * Karar destek risk kaydı.
 */
export interface DecisionRisk {
  /** Risk kimliği */
  id: string;
  /** Risk kodu — RiskRegistry ile eşleşebilir */
  code: string;
  /** Başlık */
  title: string;
  /** Açıklama */
  description: string;
  /** Etki skoru 0–100 */
  impactScore: number;
  /** Olasılık skoru 0–100 */
  likelihoodScore: number;
  /** İlgili analiz bulgu kimliği */
  findingId?: string;
}
