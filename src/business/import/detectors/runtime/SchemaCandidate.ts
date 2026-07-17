/**
 * İSTEBUL Business Import Engine — SchemaCandidate (PR-101D).
 */

import type { DetectedColumn } from './DetectedColumn';
import type { DetectedEntity } from './DetectedEntity';
import type { DetectionConfidence } from './DetectionConfidence';

/** Girdi şekli — dönüşüm yok; yalnızca tanıma. */
export type SchemaSourceShape =
  | 'object-rows'
  | 'columns-rows'
  | 'header-matrix'
  | 'unknown';

/**
 * Şema adayı — henüz BusinessDataset değildir.
 */
export interface SchemaCandidate {
  /** Aday kimliği */
  id: string;
  /** Etiket */
  label: string;
  /** Kaynak şekli */
  sourceShape: SchemaSourceShape;
  /** Kolonlar */
  columns: readonly DetectedColumn[];
  /** Entity adayları */
  entities: readonly DetectedEntity[];
  /** Genel güven */
  confidence: DetectionConfidence;
  /** Satır tahmini */
  rowCountEstimate: number;
}
