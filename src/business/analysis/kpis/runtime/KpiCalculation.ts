/**
 * İSTEBUL Business Analysis Engine — tek KPI hesaplama kaydı (PR-102B).
 */

import type { KpiDefinition } from './KpiDefinition';
import type { KpiValue } from './KpiValue';

/**
 * Tek bir KPI’nın yürütme kaydı.
 */
export interface KpiCalculation {
  /** Kullanılan tanım */
  definition: KpiDefinition;
  /** Hesaplanan değer */
  value: KpiValue;
  /** Hesaplama süresi (ms) */
  durationMs: number;
  /** Hesaplanamadıysa neden */
  unavailableReason?: string;
}
