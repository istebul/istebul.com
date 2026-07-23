/**
 * İSTEBUL Business Import Engine — SchemaResult (PR-101D).
 */

import type { DetectedColumn } from './DetectedColumn';
import type { DetectedEntity } from './DetectedEntity';
import type { DetectionConfidence } from './DetectionConfidence';
import type { SchemaCandidate } from './SchemaCandidate';

/**
 * Confidence dağılımı telemetrisi.
 */
export interface ConfidenceDistribution {
  /** ≥ 0.75 */
  high: number;
  /** 0.40 – 0.74 */
  medium: number;
  /** < 0.40 */
  low: number;
}

/**
 * Şema tespiti telemetrisi.
 */
export interface SchemaDetectionTelemetry {
  /** Süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** İncelenen kolon sayısı */
  columnsInspected: number;
  /** Üretilen aday sayısı */
  candidatesProduced: number;
  /** Confidence dağılımı (kolon bazlı) */
  confidenceDistribution: ConfidenceDistribution;
}

/**
 * Şema tespiti sonucu — BusinessDataset dönüşümü yok.
 */
export interface SchemaResult {
  /** Tespit edilen kolonlar (birincil aday) */
  columns: readonly DetectedColumn[];
  /** Entity adayları */
  entities: readonly DetectedEntity[];
  /** Şema adayları */
  candidates: readonly SchemaCandidate[];
  /** Kolon anahtarları */
  columnKeys: readonly string[];
  /** Satır tahmini */
  rowCountEstimate: number;
  /** Genel güven */
  overallConfidence: DetectionConfidence;
  /** Telemetri */
  telemetry: SchemaDetectionTelemetry;
}

export const PIPELINE_BAG_SCHEMA_RESULT_KEY = 'schemaDetectionResult' as const;
