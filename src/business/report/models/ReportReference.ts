/**
 * İSTEBUL Business Report Engine — referans kaydı.
 */

export type ReportReferenceKind =
  | 'dataset'
  | 'analiz'
  | 'karar'
  | 'kaynak'
  | 'dis-baglanti';

export interface ReportReference {
  id: string;
  kind: ReportReferenceKind;
  label: string;
  uri?: string;
  capturedAt?: string;
}
