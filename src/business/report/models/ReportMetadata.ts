/**
 * İSTEBUL Business Report Engine — rapor üst verisi.
 */

/**
 * ReportModel üst bilgisi.
 */
export interface ReportMetadata {
  /** Rapor kimliği */
  id: string;
  /** Başlık (Türkçe) */
  title: string;
  /** Açıklama */
  description?: string;
  /** Knowledge Report DNA kimliği */
  reportDnaId: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Oluşturulma (ISO 8601) */
  createdAt: string;
  /** Sürüm etiketi */
  version: string;
  /** Etiketler */
  tags?: readonly string[];
}
