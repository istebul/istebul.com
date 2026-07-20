/**
 * İSTEBUL Business Import Engine — ExcelReaderResult (PR-101F).
 */

import type { ExcelSheet } from './ExcelSheet';
import type { ExcelWorkbook } from './ExcelWorkbook';

/**
 * Excel okuma telemetrisi.
 */
export interface ExcelReaderTelemetry {
  /** Sheet sayısı (workbook) */
  sheetCount: number;
  /** Seçilen sheet veri satırı */
  rowCount: number;
  /** Seçilen sheet sütun sayısı */
  columnCount: number;
  /** Okuma süresi (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Seçilen sheet adı */
  selectedSheetName: string;
  /** Seçilen sheet index */
  selectedSheetIndex: number;
  /** Başlık kullanıldı mı */
  headerPresent: boolean;
  /** Atlanan boş satır */
  skippedEmptyRows: number;
  /** Binary decode kullanıldı mı — bu PR’da her zaman false */
  binaryDecoded: boolean;
}

/**
 * Excel okuma sonucu — CSV ile aynı tabular modele projekte edilebilir.
 * BusinessDataset değildir.
 */
export interface ExcelReaderResult {
  /** Workbook özeti */
  workbook: ExcelWorkbook;
  /** Seçilen / aktif sheet */
  sheet: ExcelSheet;
  /** Aktif sheet başlık anahtarları (CSV columnKeys ile hizalı) */
  columnKeys: readonly string[];
  /** Telemetri */
  telemetry: ExcelReaderTelemetry;
}

export const PIPELINE_BAG_EXCEL_RESULT_KEY = 'excelReaderResult' as const;

/** Binary .xlsx için hata kodu — onaylı kütüphane yok */
export const EXCEL_BINARY_NOT_SUPPORTED = 'EXCEL_BINARY_NOT_SUPPORTED' as const;
