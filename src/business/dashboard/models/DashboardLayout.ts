/**
 * İSTEBUL Business Dashboard Engine — yerleşim modeli.
 */

/**
 * Grid yoğunluğu.
 */
export type DashboardDensity = 'kompakt' | 'standart' | 'genis';

/**
 * Dashboard yerleşim tanımı.
 */
export interface DashboardLayout {
  /** Yerleşim kimliği */
  id: string;
  /** Ad */
  name: string;
  /** Grid sütun sayısı */
  columnCount: number;
  /** Satır yüksekliği jetonu */
  rowHeightToken: string;
  /** Yoğunluk */
  density: DashboardDensity;
  /** Boşluk jetonu */
  gapToken: string;
}
