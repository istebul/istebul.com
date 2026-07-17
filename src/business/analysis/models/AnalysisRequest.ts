/**
 * İSTEBUL Business Analysis Engine — analiz isteği.
 */

/**
 * Analiz motoruna giden istek.
 * Henüz gerçek analiz çalıştırılmaz; yalnızca sözleşme.
 */
export interface AnalysisRequest {
  /** İstek kimliği */
  id: string;
  /** İncelenecek dataset kimliği */
  datasetId: string;
  /** Dil */
  locale?: 'tr' | 'en';
  /** Hedef rapor DNA kimliği */
  reportId?: string;
  /** Sınırlı KPI listesi */
  kpiIds?: readonly string[];
  /** Sınırlı kural listesi */
  ruleIds?: readonly string[];
}
