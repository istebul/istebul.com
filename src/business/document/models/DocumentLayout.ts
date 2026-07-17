/**
 * İSTEBUL Business Document Engine — yerleşim modeli.
 */

/**
 * Sayfa boyutu anahtarı.
 */
export type DocumentPageSize = 'a4' | 'letter' | 'widescreen';

/**
 * Sayfa yönü.
 */
export type DocumentOrientation = 'dikey' | 'yatay';

/**
 * Doküman yerleşim tanımı.
 */
export interface DocumentLayout {
  /** Yerleşim kimliği */
  id: string;
  /** Ad */
  name: string;
  /** Sayfa boyutu */
  pageSize: DocumentPageSize;
  /** Yön */
  orientation: DocumentOrientation;
  /** Kenar boşlukları (mm) — sol, sağ, üst, alt */
  marginsMm: Readonly<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }>;
  /** Sütun sayısı — 1 veya 2 */
  columnCount: 1 | 2;
}
