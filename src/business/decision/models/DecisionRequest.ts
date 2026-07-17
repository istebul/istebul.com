/**
 * İSTEBUL Business Decision Engine — karar isteği.
 */

/**
 * Decision Engine girdisi — Analysis Engine çıktısına referans.
 */
export interface DecisionRequest {
  /** İstek kimliği */
  id: string;
  /** Kaynak analiz isteği kimliği */
  analysisRequestId: string;
  /** Dataset kimliği */
  datasetId: string;
  /** Knowledge Report DNA kimliği (opsiyonel) */
  reportId?: string;
  /** Dil */
  locale?: 'tr' | 'en';
  /** Uygulanacak strateji kimlikleri — boşsa varsayılan set */
  strategyIds?: readonly string[];
}
