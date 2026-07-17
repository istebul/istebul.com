/**
 * İSTEBUL Business Export Engine — özet modeli.
 */

export interface ExportSummary {
  /** Tek cümle özet */
  headline: string;
  /** Üretilen artifact sayısı */
  artifactCount: number;
  /** Format listesi (görünen adlar) */
  formatLabels: readonly string[];
  /** Uyarılar */
  warnings?: readonly string[];
}
