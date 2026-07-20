/**
 * İSTEBUL Business Import Engine — NormalizedRecord (PR-101H).
 */

import type { NormalizedField } from './NormalizedField';

/**
 * Tek normalize edilmiş kayıt (satır).
 */
export interface NormalizedRecord {
  /** Kayıt sırası (0 tabanlı) */
  index: number;
  /** Normalize alanlar */
  fields: readonly NormalizedField[];
}
