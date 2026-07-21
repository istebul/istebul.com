/**
 * İSTEBUL Business Export Engine — Dashboard References (PR-106B).
 *
 * DashboardModel kimlik/yerleşim referanslarını taşır; widget üretmez.
 */

/**
 * Tek dashboard referansı.
 */
export interface ExportDashboardReference {
  id: string;
  title: string;
  status: string;
  layoutId: string;
  themeId: string;
  sectionCount: number;
  widgetCount: number;
  kpiCount: number;
  reportDnaId: string;
  datasetId: string;
}

/**
 * Dashboard referansları bölümü.
 */
export interface ExportDashboardReferences {
  referenceCount: number;
  items: readonly ExportDashboardReference[];
  present: boolean;
}
