/**
 * İSTEBUL Business Dashboard Engine — Dataset Information (PR-105B).
 */

/**
 * ReportResult üzerinden türetilen dataset bilgisi.
 */
export interface DashboardDataset {
  /** Dataset kimliği */
  datasetId: string;
  /** Kaynak rapor model kimliği */
  reportModelId: string;
  /** Kaynak analiz isteği kimliği */
  analysisRequestId: string;
  /** Dataset kimliği mevcut mu */
  present: boolean;
}
