/**
 * İSTEBUL Business Export Engine — KPI References (PR-106B).
 *
 * DashboardModel.kpis kimliklerini taşır; yeni hesaplama yapmaz.
 */

/**
 * Tek KPI referansı.
 */
export interface ExportKpiReference {
  kpiId: string;
  name: string;
  unit: string;
  value: string | number | null;
  trendLabel?: string;
}

/**
 * KPI referansları bölümü.
 */
export interface ExportKpiReferences {
  referenceCount: number;
  items: readonly ExportKpiReference[];
  present: boolean;
}
