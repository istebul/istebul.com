/**
 * İSTEBUL Business Export Engine — Document References (PR-106B).
 *
 * DocumentModel kimlik/başlık referanslarını taşır; render üretmez.
 */

/**
 * Tek document referansı.
 */
export interface ExportDocumentReference {
  id: string;
  title: string;
  status: string;
  sectionCount: number;
  reportModelId: string;
  reportDnaId: string;
}

/**
 * Document referansları bölümü.
 */
export interface ExportDocumentReferences {
  referenceCount: number;
  items: readonly ExportDocumentReference[];
  present: boolean;
}
