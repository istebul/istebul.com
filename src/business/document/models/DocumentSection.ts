/**
 * İSTEBUL Business Document Engine — doküman bölümü.
 */

/**
 * Biçimlendirilmiş doküman bölümü — ReportSection’tan türetilir.
 */
export interface DocumentSection {
  /** Bölüm kimliği */
  id: string;
  /** Kaynak rapor bölüm kimliği */
  sourceSectionId: string;
  /** Başlık */
  title: string;
  /** Sıra */
  order: number;
  /** Biçimlenmiş bloklar — render sonraki PR */
  blocks: readonly Readonly<Record<string, unknown>>[];
  /** Sayfa kırılımı önerisi */
  pageBreakBefore?: boolean;
}
