/**
 * İSTEBUL Business — dataset üst veri tip sözleşmesi.
 */

/**
 * Dataset üst bilgisi — arama, izlenebilirlik ve bağlam.
 */
export interface BusinessMetadata {
  /** Dataset kimliği — metadata ile dataset.id uyumlu olmalıdır */
  id: string;
  /** Başlık (Türkçe) */
  title: string;
  /** Açıklama */
  description?: string;
  /** Dil — varsayılan tr */
  locale: 'tr' | 'en';
  /** Oluşturulma zamanı (ISO 8601) */
  createdAt: string;
  /** Son güncelleme (ISO 8601) */
  updatedAt?: string;
  /** İşletme / tenant etiketi — auth değiştirmez, yalnızca veri alanı */
  organizationLabel?: string;
  /** Etiketler */
  tags?: readonly string[];
  /** İlgili rapor DNA kimlikleri (Knowledge Architecture) */
  relatedReportIds?: readonly string[];
}
