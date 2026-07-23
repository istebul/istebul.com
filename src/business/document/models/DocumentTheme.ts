/**
 * İSTEBUL Business Document Engine — tema modeli.
 */

/**
 * Yerleşim + stil paketini birleştiren tema.
 */
export interface DocumentTheme {
  /** Tema kimliği */
  id: string;
  /** Ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Varsayılan yerleşim kimliği */
  defaultLayoutId: string;
  /** Varsayılan stil kimliği */
  defaultStyleId: string;
  /** Sürüm */
  version: string;
}
