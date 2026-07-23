/**
 * İSTEBUL Business Document Engine — stil modeli.
 */

/**
 * Tipografi / renk jetonları (Design System anahtarları; ham CSS yok).
 */
export interface DocumentStyle {
  /** Stil kimliği */
  id: string;
  /** Ad */
  name: string;
  /** Başlık tipografi jetonu */
  headingToken: string;
  /** Gövde tipografi jetonu */
  bodyToken: string;
  /** Vurgu renk jetonu */
  accentColorToken: string;
  /** Arka plan renk jetonu */
  backgroundColorToken: string;
  /** Satır aralığı çarpanı */
  lineHeight: number;
}
