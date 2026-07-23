/**
 * İSTEBUL Business Import Engine — kaynak / adapter tip kimlikleri.
 *
 * Dataset `BusinessSourceTypeId` ile hizalıdır; `manual` → dataset `manual-entry`.
 */

export type ImportAdapterTypeId =
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
  | 'manual';

/**
 * İçe aktarma isteğindeki kaynak tanımı (ImportSource).
 */
export interface ImportSource {
  /** Adapter / kaynak tipi */
  type: ImportAdapterTypeId;
  /** Görünen etiket — dosya adı, entegrasyon adı */
  label: string;
  /** URI veya bağlantı (opsiyonel) */
  uri?: string;
  /** İçe aktarma anı (ISO 8601) */
  requestedAt?: string;
  /** Ek meta — connector kimliği vb. */
  metadata?: Readonly<Record<string, string>>;
}
