/**
 * İSTEBUL Business Document Engine — üst bilgi.
 */

export interface DocumentHeader {
  /** Sol metin */
  leftText?: string;
  /** Orta metin */
  centerText?: string;
  /** Sağ metin */
  rightText?: string;
  /** Logo anahtarı — Design System varlık anahtarı */
  logoKey?: string;
  /** Sayfa numarası göster */
  showPageNumber: boolean;
}
