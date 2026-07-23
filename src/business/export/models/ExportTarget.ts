/**
 * İSTEBUL Business Export Engine — hedef modeli.
 */

/**
 * Export hedefi türü.
 */
export type ExportTargetKind =
  | 'dosya'
  | 'bellek'
  | 'baglanti'
  | 'harici-depo';

/**
 * Üretilen çıktının hedefi — dosya yazılmaz; yalnızca sözleşme.
 */
export interface ExportTarget {
  /** Hedef kimliği */
  id: string;
  /** Tür */
  kind: ExportTargetKind;
  /** Etiket */
  label: string;
  /** URI veya depo anahtarı (opsiyonel) */
  uri?: string;
}
