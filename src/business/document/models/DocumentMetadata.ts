/**
 * İSTEBUL Business Document Engine — doküman üst verisi.
 */

export interface DocumentMetadata {
  /** Doküman kimliği */
  id: string;
  /** Başlık (Türkçe) */
  title: string;
  /** Açıklama */
  description?: string;
  /** Kaynak ReportModel kimliği */
  reportModelId: string;
  /** Report DNA kimliği */
  reportDnaId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Oluşturulma (ISO 8601) */
  createdAt: string;
  /** Sürüm */
  version: string;
  /** Yerleşim kimliği */
  layoutId: string;
  /** Tema kimliği */
  themeId: string;
}
