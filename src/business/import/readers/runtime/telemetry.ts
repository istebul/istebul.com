/**
 * İSTEBUL Business Import Engine — Reader lookup telemetrisi (PR-101B).
 */

import type { ImportTarget } from './ImportTarget';

/**
 * Reader seçim nedeni — metadata eşleme izi.
 */
export type ReaderSelectionReasonCode =
  | 'exact-source-type'
  | 'mime-type'
  | 'extension'
  | 'tenant-scope'
  | 'priority'
  | 'combined-metadata'
  | 'none';

export interface ReaderSelectionReason {
  code: ReaderSelectionReasonCode;
  /** İnsan okunur açıklama (Türkçe) */
  message: string;
  /** Eşleşen alanlar */
  matchedFields: readonly string[];
}

/**
 * Registry lookup telemetrisi.
 */
export interface ReaderLookupTelemetry {
  /** Lookup süresi (ms) */
  durationMs: number;
  /** Başlangıç (ISO 8601) */
  startedAt: string;
  /** Bitiş (ISO 8601) */
  endedAt: string;
  /** Hedef özeti */
  target: ImportTarget;
  /** Seçilen reader id — yoksa undefined */
  selectedReaderId?: string;
  /** Seçim nedeni */
  reason: ReaderSelectionReason;
  /** Aday sayısı */
  candidateCount: number;
  /** Başarılı mı */
  found: boolean;
}

/** PipelineContext.bag anahtarı */
export const PIPELINE_BAG_READER_LOOKUP_KEY = 'readerLookup' as const;
