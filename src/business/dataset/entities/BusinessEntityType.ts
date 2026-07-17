/**
 * İSTEBUL Business — resmi entity tip kimlikleri.
 */

/**
 * Entity tipi teknik kimlikleri.
 * Görünen Türkçe adlar `EntityTypeRegistry` içindedir.
 */
export type BusinessEntityTypeId =
  | 'urun'
  | 'kategori'
  | 'stok'
  | 'depo'
  | 'raf'
  | 'sayim'
  | 'siparis'
  | 'musteri'
  | 'tedarikci'
  | 'personel'
  | 'departman'
  | 'vardiya'
  | 'gelir'
  | 'gider'
  | 'fatura'
  | 'tahsilat'
  | 'odeme'
  | 'butce'
  | 'arac'
  | 'sevkiyat'
  | 'gorev'
  | 'risk'
  | 'kpi'
  | 'dokuman';

/**
 * Entity tipi tanım kaydı.
 */
export interface BusinessEntityTypeDefinition {
  /** Kimlik */
  id: BusinessEntityTypeId;
  /** Ad — Türkçe */
  name: string;
  /** Açıklama */
  description: string;
  /** Sıralama */
  order: number;
}
