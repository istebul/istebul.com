/**
 * İSTEBUL Business Admin — ReportResult girdi sözleşmesi (PR-202C).
 *
 * Report Engine `ReportModel` çıktısı ile yapısal uyumlu.
 * Engine yeniden yazılmaz; yalnızca projeksiyon girdisi olarak kullanılır.
 */

/**
 * Rapor metadata özeti.
 */
export interface ReportResultMetadata {
  id: string;
  title: string;
  description?: string;
  reportDnaId?: string;
  locale: 'tr' | 'en';
  createdAt: string;
  version: string;
  tags?: readonly string[];
}

/**
 * Yönetici özeti.
 */
export interface ReportResultExecutiveSummary {
  headline: string;
  body: string;
  highlights?: readonly string[];
}

/**
 * Rapor bölümü.
 */
export interface ReportResultSection {
  id: string;
  sectionCode: string;
  kind: string;
  title: string;
  order: number;
  content?: string;
}

/**
 * Rapor bulgusu.
 */
export interface ReportResultFinding {
  id: string;
  code: string;
  title: string;
  description?: string;
  severity?: string;
}

/**
 * Rapor önerisi.
 */
export interface ReportResultRecommendation {
  id: string;
  code: string;
  title: string;
  description?: string;
  priorityLevel?: string;
}

/**
 * Report Engine sonucu (ReportModel) — workspace girdisi.
 * CRUD / API / DB yok; yalnızca okuma projeksiyonu.
 */
export interface ReportResult {
  id: string;
  metadata: ReportResultMetadata;
  status: string;
  lastStage: string;
  executiveSummary: ReportResultExecutiveSummary;
  sections: readonly ReportResultSection[];
  findings: readonly ReportResultFinding[];
  recommendations: readonly ReportResultRecommendation[];
  appendices?: readonly unknown[];
  references?: readonly unknown[];
}
