/**
 * İSTEBUL Business — veri kaynağı tip sözleşmesi.
 *
 * Excel, CSV, ERP, GarsonAI vb. tüm kaynaklar bu modele normalize edilir.
 */

/**
 * Desteklenecek kaynak tipi kimlikleri.
 */
export type BusinessSourceTypeId =
  | 'excel'
  | 'csv'
  | 'pdf'
  | 'word'
  | 'json'
  | 'xml'
  | 'rest-api'
  | 'sql'
  | 'google-sheets'
  | 'garsonai'
  | 'erp'
  | 'crm'
  | 'manual-entry';

/**
 * Kaynak meta verisi — ham dosya / bağlantı tanımı.
 */
export interface BusinessSource {
  /** Kaynak tipi */
  type: BusinessSourceTypeId;
  /** Görünen etiket — örn. dosya adı, entegrasyon adı */
  label: string;
  /** URI veya bağlantı tanımlayıcısı (opsiyonel) */
  uri?: string;
  /** Yakalanma / içe aktarma zamanı (ISO 8601) */
  capturedAt?: string;
  /** Kaynak sürümü veya revizyon etiketi */
  sourceRevision?: string;
  /** Ek meta — connector kimliği vb. */
  metadata?: Readonly<Record<string, string>>;
}
