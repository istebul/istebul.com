/**
 * İSTEBUL Business — sütun tip sözleşmesi.
 *
 * Yalnızca veri modeli; normalizasyon veya doğrulama motoru yoktur.
 */

/**
 * Sütun veri tipi — BusinessDataset resmi tip sözlüğü.
 */
export type BusinessColumnDataType =
  | 'metin'
  | 'sayi'
  | 'tamsayi'
  | 'para'
  | 'yuzde'
  | 'tarih'
  | 'tarih-saat'
  | 'mantiksal'
  | 'json'
  | 'kimlik';

/**
 * Tek bir sütun tanımı (şema alanı).
 */
export interface BusinessColumn {
  /** Kimlik — entity içinde benzersiz sütun anahtarı */
  id: string;
  /** Ad — kullanıcıya görünen Türkçe sütun adı */
  name: string;
  /** Açıklama — isteğe bağlı */
  description?: string;
  /** Veri tipi */
  dataType: BusinessColumnDataType;
  /** Zorunlu alan mı */
  required: boolean;
  /** Birim — örn. TL, kg, adet */
  unit?: string;
  /** Kaynak sistemdeki orijinal sütun adı */
  sourceFieldKey?: string;
  /** Sıralama */
  order: number;
}
