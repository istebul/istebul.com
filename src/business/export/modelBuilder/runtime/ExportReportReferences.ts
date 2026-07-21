/**
 * İSTEBUL Business Export Engine — Report References (PR-106B).
 *
 * Report DNA / ReportModel kimliklerini kaynaklardan projekte eder.
 */

/**
 * Report referans kaynağı.
 */
export type ExportReportReferenceSource = 'document' | 'dashboard' | 'request';

/**
 * Tek report referansı.
 */
export interface ExportReportReference {
  reportDnaId: string;
  reportModelId: string;
  source: ExportReportReferenceSource;
}

/**
 * Report referansları bölümü.
 */
export interface ExportReportReferences {
  referenceCount: number;
  items: readonly ExportReportReference[];
  present: boolean;
}
