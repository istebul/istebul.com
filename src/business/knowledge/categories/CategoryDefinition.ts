/**
 * İSTEBUL Business — kategori tip sözleşmeleri.
 *
 * Bu dosya yalnızca veri modeli tanımlar.
 * İş mantığı, AI çağrısı veya rapor üretimi içermez.
 */

/**
 * Resmî Business kategori kimlikleri.
 * Teknik anahtarlar ASCII; görünen adlar Türkçe.
 */
export type BusinessCategoryId =
  | 'finans'
  | 'muhasebe'
  | 'depo'
  | 'stok'
  | 'lojistik'
  | 'insan-kaynaklari'
  | 'uretim'
  | 'satin-alma'
  | 'satis'
  | 'crm'
  | 'kalite'
  | 'isg'
  | 'yonetim'
  | 'denetim'
  | 'restoran'
  | 'kafe'
  | 'otel'
  | 'e-ticaret'
  | 'tarim'
  | 'insaat'
  | 'enerji';

/**
 * Kategori ailesi — rapor filtreleme ve sektör eşlemesi için.
 *
 * | Teknik | Türkçe |
 * |--------|--------|
 * | fonksiyonel | Fonksiyonel (Finans, İK, Depo…) |
 * | sektorel | Sektörel (Restoran, İnşaat…) |
 */
export type BusinessCategoryKind = 'fonksiyonel' | 'sektorel';

/**
 * Tek bir Business kategorisinin resmî tanımı.
 *
 * Alan sözlüğü (TR):
 * - id → Kimlik
 * - name → Ad
 * - description → Açıklama
 * - kind → Tür (fonksiyonel / sektörel)
 * - icon → İkon anahtarı
 * - order → Sıralama
 */
export interface CategoryDefinition {
  /** Kimlik — kararlı teknik anahtar */
  id: BusinessCategoryId;
  /** Ad — kullanıcıya görünen Türkçe kategori adı */
  name: string;
  /** Açıklama — kısa tanıtım metni */
  description: string;
  /** Tür — fonksiyonel veya sektörel */
  kind: BusinessCategoryKind;
  /** İkon — tasarım sistemi ikon anahtarı */
  icon: string;
  /** Sıralama — düşük sayı önce */
  order: number;
}
