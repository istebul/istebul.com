/**
 * İSTEBUL Business Import Engine — ExcelCell (PR-101F).
 */

/**
 * Excel hücre tipi — binary parse yok; yapısal model.
 */
export type ExcelCellType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'empty'
  | 'error';

/**
 * Tek Excel hücre değeri.
 */
export interface ExcelCell {
  /** Sütun sırası (0 tabanlı) */
  columnIndex: number;
  /** Bağlı başlık adı (varsa) */
  headerName?: string;
  /** Hücre tipi */
  cellType: ExcelCellType;
  /** Ham temsil (string) */
  raw: string;
  /** Tipine göre değer */
  value: string | number | boolean | null;
  /** Tarih ise ISO 8601 */
  dateIso?: string;
}
