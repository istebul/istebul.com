/**
 * İSTEBUL Business Document Engine — alt bilgi.
 */

export interface DocumentFooter {
  /** Sol metin */
  leftText?: string;
  /** Orta metin */
  centerText?: string;
  /** Sağ metin */
  rightText?: string;
  /** Gizlilik notu */
  confidentialityNote?: string;
  /** Sayfa numarası göster */
  showPageNumber: boolean;
}
