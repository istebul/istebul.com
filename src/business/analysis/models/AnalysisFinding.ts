/**
 * İSTEBUL Business Analysis Engine — bulgu modeli.
 */

/**
 * Analiz bulgusu önem derecesi.
 */
export type AnalysisFindingSeverity = 'bilgi' | 'uyari' | 'kritik';

/**
 * Yapılandırılmış analiz bulgusu.
 */
export interface AnalysisFinding {
  /** Bulgu kimliği */
  id: string;
  /** Bulgu kodu — registry ile eşleşebilir */
  code: string;
  /** Başlık (Türkçe) */
  title: string;
  /** Açıklama */
  description: string;
  /** Önem */
  severity: AnalysisFindingSeverity;
  /** İlgili KPI kimliği */
  kpiId?: string;
  /** İlgili entity kimliği (dataset içi) */
  entityId?: string;
  /** İlgili kural kimliği */
  ruleId?: string;
}
