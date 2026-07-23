/**
 * İSTEBUL Business Export Engine — Section References (PR-106B).
 *
 * Document / Dashboard bölüm kimliklerini taşır; içerik üretmez.
 */

/**
 * Bölüm kaynak türü.
 */
export type ExportSectionReferenceSource = 'document' | 'dashboard';

/**
 * Tek bölüm referansı.
 */
export interface ExportSectionReference {
  id: string;
  title: string;
  order: number;
  source: ExportSectionReferenceSource;
  sourceSectionId?: string;
  widgetIds?: readonly string[];
}

/**
 * Bölüm referansları bölümü.
 */
export interface ExportSectionReferences {
  referenceCount: number;
  items: readonly ExportSectionReference[];
  present: boolean;
}
