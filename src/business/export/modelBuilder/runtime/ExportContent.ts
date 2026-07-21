/**
 * İSTEBUL Business Export Engine — Export Content özeti (PR-106B).
 *
 * Kaynak varlığını ve sayaçları taşır; içerik üretmez.
 */

/**
 * Export Content — projection özeti.
 */
export interface ExportContent {
  /** DocumentModel mevcut mu */
  hasDocument: boolean;
  /** DashboardModel mevcut mu */
  hasDashboard: boolean;
  /** Document bölüm sayısı */
  documentSectionCount: number;
  /** Dashboard bölüm sayısı */
  dashboardSectionCount: number;
  /** Widget sayısı */
  widgetCount: number;
  /** KPI sayısı */
  kpiCount: number;
  /** Toplam referans sayısı (tüm koleksiyonlar) */
  totalReferenceCount: number;
  /** Herhangi bir kaynak içeriği var mı */
  present: boolean;
}
