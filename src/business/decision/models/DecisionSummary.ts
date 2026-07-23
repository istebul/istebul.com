/**
 * İSTEBUL Business Decision Engine — özet modeli.
 */

/**
 * Üst yönetim karar özeti.
 */
export interface DecisionSummary {
  /** Tek cümle karar özeti */
  headline: string;
  /** Öne çıkan maddeler */
  highlights: readonly string[];
  /** Dikkat gerektiren noktalar */
  cautions?: readonly string[];
}
