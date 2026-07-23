/**
 * İSTEBUL Business Decision Engine — fırsat modeli.
 */

/**
 * Karar destek fırsat kaydı.
 */
export interface DecisionOpportunity {
  /** Fırsat kimliği */
  id: string;
  /** Fırsat kodu */
  code: string;
  /** Başlık */
  title: string;
  /** Açıklama */
  description: string;
  /** Potansiyel değer skoru 0–100 */
  valueScore: number;
  /** Uygulanabilirlik skoru 0–100 */
  feasibilityScore: number;
  /** İlgili KPI kimliği */
  kpiId?: string;
}
