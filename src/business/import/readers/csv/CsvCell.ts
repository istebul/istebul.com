/**
 * İSTEBUL Business Import Engine — CsvCell (PR-101E).
 */

/**
 * Tek CSV hücre değeri.
 */
export interface CsvCell {
  /** Sütun sırası */
  columnIndex: number;
  /** Bağlı başlık adı (varsa) */
  headerName?: string;
  /** Ham alan (kaçış çözülmeden önce satır dilimi) */
  raw: string;
  /** Kaçış çözülmüş değer */
  value: string;
}
