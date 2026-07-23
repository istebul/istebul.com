/**
 * İSTEBUL Business Import Engine — CsvReaderResult (PR-101E).
 */

import type { CsvDelimiter } from './CsvReaderContext';
import type { CsvHeader } from './CsvHeader';
import type { CsvRow } from './CsvRow';

/**
 * CSV okuma telemetrisi.
 */
export interface CsvReaderTelemetry {
  /** Dosya / içerik boyutu (UTF-8 byte tahmini) */
  fileSizeBytes: number;
  /** Veri satırı sayısı (başlık hariç) */
  rowCount: number;
  /** Sütun sayısı */
  columnCount: number;
  /** Okuma süresi (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Seçilen ayırıcı */
  delimiter: CsvDelimiter;
  /** Başlık kullanıldı mı */
  headerPresent: boolean;
  /** Atlanan boş satır */
  skippedEmptyRows: number;
  /** Hatalı / uyumsuz satır */
  malformedRowCount: number;
}

/**
 * CSV okuma sonucu — ham satır/kolon; BusinessDataset değildir.
 */
export interface CsvReaderResult {
  /** Başlıklar (hasHeader=false ise sentetik col_N) */
  headers: readonly CsvHeader[];
  /** Veri satırları */
  rows: readonly CsvRow[];
  /** Kolon anahtarları */
  columnKeys: readonly string[];
  /** Telemetri */
  telemetry: CsvReaderTelemetry;
}

export const PIPELINE_BAG_CSV_RESULT_KEY = 'csvReaderResult' as const;
