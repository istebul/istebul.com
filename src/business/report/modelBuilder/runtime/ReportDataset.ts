/**
 * İSTEBUL Business Report Engine — Dataset Information (PR-104B).
 */

/**
 * DecisionResult üzerinden türetilen dataset bilgisi.
 */
export interface ReportDataset {
  /** Dataset kimliği */
  datasetId: string;
  /** Kaynak analiz isteği kimliği */
  analysisRequestId: string;
  /** Dataset kimliği mevcut mu */
  present: boolean;
}
