/**
 * İSTEBUL Business Dashboard Engine — tema modeli.
 */

/**
 * Dashboard teması — Design System jetonları.
 */
export interface DashboardTheme {
  /** Tema kimliği */
  id: string;
  /** Ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Varsayılan yerleşim kimliği */
  defaultLayoutId: string;
  /** Yüzey renk jetonu */
  surfaceColorToken: string;
  /** Vurgu renk jetonu */
  accentColorToken: string;
  /** Tipografi jetonu */
  typographyToken: string;
  /** Sürüm */
  version: string;
}
