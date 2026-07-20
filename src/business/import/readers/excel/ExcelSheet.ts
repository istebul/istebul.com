/**
 * İSTEBUL Business Import Engine — ExcelSheet (PR-101F).
 */

import type { ExcelCell } from './ExcelCell';

/**
 * Sheet başlık hücresi.
 */
export interface ExcelHeader {
  index: number;
  name: string;
  raw: string;
}

/**
 * Sheet veri satırı.
 */
export interface ExcelRow {
  /** Veri satırı sırası (başlık hariç) */
  index: number;
  /** Kaynak satır (1 tabanlı, sheet içi) */
  sourceRow: number;
  cells: readonly ExcelCell[];
}

/**
 * Tek çalışma sayfası — ham tablo; BusinessDataset değildir.
 */
export interface ExcelSheet {
  /** Sheet adı */
  name: string;
  /** Sheet sırası (0 tabanlı) */
  index: number;
  /** Başlıklar */
  headers: readonly ExcelHeader[];
  /** Veri satırları */
  rows: readonly ExcelRow[];
  /** Kolon anahtarları */
  columnKeys: readonly string[];
  /** Boş mu */
  isEmpty: boolean;
}
