/**
 * İSTEBUL Business Dashboard Engine — KpiDefinition (PR-105D).
 */

import type { KpiId } from './KpiId';

/**
 * Runtime KPI tanımı — veri özeti; chart/UI yoktur.
 */
export interface KpiDefinition {
  /** Kararlı kimlik */
  id: KpiId;
  /** KPI kodu */
  kpiCode: string;
  /** Görünen ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Birim */
  unit: string;
  /** Kaynak Dashboard Model parça kimliği */
  sourcePartId: string;
  /** Sıra — deterministic */
  order: number;
  /** Aktif mi */
  enabled: boolean;
}
