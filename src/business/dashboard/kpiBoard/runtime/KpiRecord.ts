/**
 * İSTEBUL Business Dashboard Engine — KpiRecord (PR-105D).
 */

import type { DashboardKPI } from '../../models/DashboardKPI';
import type { KpiId } from './KpiId';

/**
 * Zengin KPI kaydı — foundation DashboardKPI + runtime alanlar.
 */
export interface KpiRecord {
  /** Kimlik */
  id: string;
  /** Standart KPI id */
  kpiId: KpiId;
  /** KPI kodu */
  kpiCode: string;
  /** Görünen ad */
  name: string;
  /** Birim */
  unit: string;
  /** Sıra */
  order: number;
  /** Kaynak model parça kimliği */
  sourcePartId: string;
  /** Kaynak veri mevcut mu */
  sourcePresent: boolean;
  /** Projeksiyon değeri */
  value: string | number | null;
  /** Foundation projeksiyonu */
  kpi: DashboardKPI;
}
