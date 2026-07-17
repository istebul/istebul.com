/**
 * İSTEBUL Business Import Engine — DetectedEntity (PR-101D).
 */

import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';
import type { DetectionConfidence } from './DetectionConfidence';

/**
 * Aday entity tespiti.
 */
export interface DetectedEntity {
  /** Entity tipi */
  entityType: BusinessEntityTypeId;
  /** Etiket */
  label: string;
  /** Güven */
  confidence: DetectionConfidence;
  /** Eşleşen kolon adları */
  matchedColumns: readonly string[];
  /** Gerekçe */
  reason?: string;
}
