/**
 * İSTEBUL Business Report Engine — ek (appendix).
 */

export interface ReportAppendix {
  id: string;
  title: string;
  description?: string;
  /** Ek içerik referansı — dosya, tablo, dataset entity id */
  contentRef?: string;
}
