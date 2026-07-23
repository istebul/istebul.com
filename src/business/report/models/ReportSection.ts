/**
 * İSTEBUL Business Report Engine — rapor bölümü.
 */

/**
 * Bölüm türü.
 */
export type ReportSectionKind =
  | 'ozet'
  | 'bulgular'
  | 'oneriler'
  | 'kpi'
  | 'risk'
  | 'ek'
  | 'ozel';

/**
 * ReportModel içindeki tek bölüm.
 */
export interface ReportSection {
  /** Bölüm kimliği */
  id: string;
  /** SectionRegistry kodu ile eşleşebilir */
  sectionCode: string;
  /** Tür */
  kind: ReportSectionKind;
  /** Başlık (Türkçe) */
  title: string;
  /** Sıra */
  order: number;
  /** Bölüm gövdesi — yapılandırılmış bloklar sonraki PR’da daraltılabilir */
  content: Readonly<Record<string, unknown>>;
}
