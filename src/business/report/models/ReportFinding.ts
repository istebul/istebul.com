/**
 * İSTEBUL Business Report Engine — rapor bulgusu.
 */

/**
 * Raporda sunulan bulgu kaydı.
 */
export type ReportFindingSeverity = 'bilgi' | 'uyari' | 'kritik';

export interface ReportFinding {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: ReportFindingSeverity;
  /** Kaynak analiz bulgu kimliği */
  sourceFindingId?: string;
}
