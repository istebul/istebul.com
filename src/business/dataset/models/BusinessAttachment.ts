/**
 * İSTEBUL Business — ek dosya tip sözleşmesi.
 */

/**
 * Dataset ile ilişkili ek (orijinal dosya, ek kanıt, ek tablo).
 */
export interface BusinessAttachment {
  /** Ek kimliği */
  id: string;
  /** Dosya adı */
  name: string;
  /** MIME türü */
  mimeType: string;
  /** Boyut (bayt) — bilinmiyorsa atlanır */
  sizeBytes?: number;
  /** Kaynak referansı — URI veya depo anahtarı */
  sourceRef?: string;
  /** İlişkili entity kimliği */
  entityId?: string;
  /** Açıklama */
  description?: string;
}
