/**
 * İSTEBUL Business Import Engine — CsvReaderContext (PR-101E).
 */

/** Desteklenen ayırıcılar */
export type CsvDelimiter = ',' | ';';

/**
 * CSV okuma bağlamı — ham metin; BusinessDataset yok.
 */
export interface CsvReaderContext {
  /** UTF-8 CSV metni */
  content: string;
  /**
   * Ayırıcı — `auto` ilk satırda `,` / `;` sayımına göre seçer.
   * Varsayılan: `auto`
   */
  delimiter?: CsvDelimiter | 'auto';
  /** İlk satır başlık mı — varsayılan true */
  hasHeader?: boolean;
  /** Boş satırları atla — varsayılan true */
  skipEmptyRows?: boolean;
  /** Dil */
  locale?: 'tr' | 'en';
  /** Kaynak etiketi (dosya adı vb.) */
  sourceLabel?: string;
  /**
   * Üst satır sınırı (büyük dosya / güvenlik).
   * Aşıldığında okuma bu sayıda veri satırında durur.
   */
  maxRows?: number;
  /** Kiracı */
  tenantId?: string;
}

/**
 * CsvReaderContext üretir.
 */
export function createCsvReaderContext(
  partial: CsvReaderContext
): CsvReaderContext {
  return {
    hasHeader: true,
    skipEmptyRows: true,
    delimiter: 'auto',
    locale: 'tr',
    ...partial
  };
}
