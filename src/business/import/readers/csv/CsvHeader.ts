/**
 * İSTEBUL Business Import Engine — CsvHeader (PR-101E).
 */

/**
 * CSV başlık hücresi.
 */
export interface CsvHeader {
  /** Sütun sırası (0 tabanlı) */
  index: number;
  /** Normalize edilmiş / görünen ad */
  name: string;
  /** Ham başlık metni */
  raw: string;
}
