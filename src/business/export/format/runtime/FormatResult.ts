/**
 * İSTEBUL Business Export Engine — Format Runtime sonucu (PR-106D).
 */

import type { FormatDocument, FormatDocumentMetadata } from './FormatDocument';

/**
 * Format uyarısı.
 */
export interface FormatWarning {
  code: string;
  message: string;
}

/**
 * Format telemetrisi.
 */
export interface FormatTelemetry {
  /** Execution duration (ms) */
  durationMs: number;
  startedAt: string;
  endedAt: string;
  /** Üretilen FormatDocument sayısı */
  formatCount: number;
  /** Representation sayısı (aynı set) */
  representationCount: number;
  warningCount: number;
}

/**
 * Format Runtime çıktısı.
 */
export interface FormatResult {
  /** Format document listesi (deterministik sıra) */
  documents: readonly FormatDocument[];
  /** Ortak metadata özeti (ilk document veya boş iskelet) */
  metadata: FormatDocumentMetadata;
  /** Uyarılar */
  warnings: readonly FormatWarning[];
  /** Telemetri */
  telemetry: FormatTelemetry;
}

/** Pipeline bag anahtarı — Export Engine Format */
export const PIPELINE_BAG_EXPORT_FORMAT_RUNTIME_RESULT_KEY =
  'exportFormatRuntimeResult' as const;
