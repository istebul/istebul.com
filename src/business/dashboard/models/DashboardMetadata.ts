/**
 * İSTEBUL Business Dashboard Engine — üst veri.
 */

export interface DashboardMetadata {
  /** Dashboard kimliği */
  id: string;
  /** Başlık (Türkçe) */
  title: string;
  /** Açıklama */
  description?: string;
  /** Report DNA kimliği */
  reportDnaId: string;
  /** Dataset kimliği */
  datasetId: string;
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
