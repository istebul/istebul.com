/**
 * İSTEBUL Business Dashboard Engine — dashboard isteği.
 */

/**
 * Dashboard Engine girdisi — Analysis / Decision / Report kimlikleri.
 */
export interface DashboardRequest {
  /** İstek kimliği */
  id: string;
  /** Knowledge Report DNA kimliği */
  reportDnaId: string;
  /** Dataset kimliği */
  datasetId: string;
  /** Analiz isteği kimliği (opsiyonel) */
  analysisRequestId?: string;
  /** Karar isteği kimliği (opsiyonel) */
  decisionRequestId?: string;
  /** Rapor model kimliği (opsiyonel) */
  reportModelId?: string;
  /** Yerleşim kimliği */
  layoutId?: string;
  /** Tema kimliği */
  themeId?: string;
  /** Dil */
  locale?: 'tr' | 'en';
}
