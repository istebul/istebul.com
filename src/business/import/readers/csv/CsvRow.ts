/**
 * İSTEBUL Business Import Engine — CsvRow (PR-101E).
 */

import type { CsvCell } from './CsvCell';

/**
 * Tek CSV veri satırı.
 */
export interface CsvRow {
  /** Veri satırı sırası (başlık hariç, 0 tabanlı) */
  index: number;
  /** Kaynak satır numarası (1 tabanlı, dosyadaki fiziksel satır) */
  sourceLine: number;
  /** Hücreler */
  cells: readonly CsvCell[];
  /** Ham satır metni */
  raw: string;
  /** Sütun sayısı uyumsuzluğu (hatalı satır) */
  malformed?: boolean;
}
