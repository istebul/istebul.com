/**
 * İSTEBUL Business Import Engine — ExcelReaderContext (PR-101F).
 */

import type { ExcelRawWorkbook } from './ExcelWorkbook';

/**
 * Excel okuma bağlamı.
 *
 * Not: Projede onaylı Excel npm bağımlılığı yoktur; gerçek .xlsx binary
 * decode desteklenmez. Yapısal `workbook` girdisi ile altyapı çalışır.
 */
export interface ExcelReaderContext {
  /**
   * Yapısal workbook — birincil girdi yolu (altyapı).
   */
  workbook?: ExcelRawWorkbook;
  /**
   * Binary payload — verilirse EXCEL_BINARY_NOT_SUPPORTED fırlatılır
   * (onaylı kütüphane yok).
   */
  binary?: Uint8Array | ArrayBuffer;
  /** Sheet adı ile seçim */
  sheetName?: string;
  /** Sheet sırası ile seçim (0 tabanlı) */
  sheetIndex?: number;
  /** İlk satır başlık mı — varsayılan true */
  hasHeader?: boolean;
  /** Boş satırları atla — varsayılan true */
  skipEmptyRows?: boolean;
  /** Dil */
  locale?: 'tr' | 'en';
  /** Kaynak etiketi */
  sourceLabel?: string;
  /** Üst satır sınırı */
  maxRows?: number;
  /** Kiracı */
  tenantId?: string;
}

/**
 * ExcelReaderContext üretir.
 */
export function createExcelReaderContext(
  partial: ExcelReaderContext
): ExcelReaderContext {
  return {
    hasHeader: true,
    skipEmptyRows: true,
    locale: 'tr',
    ...partial
  };
}
