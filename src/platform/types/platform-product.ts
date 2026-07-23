/**
 * İSTEBUL Platform — ürün kimliği tip sözleşmeleri.
 *
 * Bu dosya yalnızca veri modeli tanımlar.
 * Çalışma zamanında hiçbir HTML / route / ürün modülü tarafından import edilmez (PR-002).
 */

/** Resmî platform ürün kimlikleri. */
export type PlatformProductId = 'istebul-ai' | 'garsonai' | 'business';

/**
 * Ürün yaşam durumu (teknik değer).
 * Kullanıcıya görünen metin için `statusLabel` veya
 * `PLATFORM_PRODUCT_STATUS_LABELS` kullanılır.
 *
 * | Teknik | Türkçe rozet |
 * |--------|----------------|
 * | canli | Canlı |
 * | gelistirme | Geliştirme Aşamasında |
 * | yakinda | Yakında |
 * | beta | Beta |
 * | bakim | Bakım |
 * | kapali | Kapalı |
 * | erken-erisim | Erken erişim (legacy; görsel olarak Yakında ailesi) |
 */
export type PlatformProductStatus =
  | 'canli'
  | 'gelistirme'
  | 'yakinda'
  | 'beta'
  | 'bakim'
  | 'kapali'
  | 'erken-erisim';

/**
 * Platform yüzeylerindeki görünürlük (teknik değer).
 * Kullanıcıya görünen kontrol için ayrı UI metni üretilir; bu alan veri filtresidir.
 */
export type PlatformProductVisibility = 'gorunur' | 'gizli';

/**
 * Tek bir İSTEBUL platform ürününün resmî tanımı.
 *
 * Alan sözlüğü (TR):
 * - id → Kimlik
 * - name → Ad
 * - shortName → Kısa ad
 * - description → Açıklama
 * - shortDescription → Kısa açıklama
 * - slogan → Slogan
 * - url → URL (mevcut ürün girişi; route değişikliği değildir)
 * - logoKey → Logo anahtarı
 * - status → Durum
 * - statusLabel → Durum (görünen Türkçe etiket)
 * - order → Sıralama
 * - visibility → Görünürlük
 * - defaultColor → Varsayılan ürün rengi
 * - platformLabel → Platform etiketi
 * - ctaLabel → Çağrı butonu metni (platform deneyimi)
 */
export interface PlatformProduct {
  /** Kimlik — kararlı teknik anahtar */
  id: PlatformProductId;
  /** Ad — kullanıcıya görünen tam ürün adı (Türkçe / marka) */
  name: string;
  /** Kısa ad — dar alanlar, kart üstü, gezinme */
  shortName: string;
  /** Açıklama — uzun tanıtım metni */
  description: string;
  /** Kısa açıklama — kart / özet satırı */
  shortDescription: string;
  /** Slogan — tek cümle vaat */
  slogan: string;
  /** URL — mevcut ürün giriş yolu (yeni route oluşturmaz) */
  url: string;
  /** Logo anahtarı — varlık çözümleme anahtarı (`/assets/brand/…`) */
  logoKey: string;
  /** Durum — teknik yaşam durumu */
  status: PlatformProductStatus;
  /** Durum etiketi — kullanıcıya görünen Türkçe durum */
  statusLabel: string;
  /** Sıralama — düşük sayı önce */
  order: number;
  /** Görünürlük — platform listelerinde gösterim filtresi */
  visibility: PlatformProductVisibility;
  /** Varsayılan ürün rengi — `#RRGGBB` */
  defaultColor: string;
  /** Platform etiketi — ürün ailesi / kategori rozeti (Türkçe) */
  platformLabel: string;
  /** Çağrı butonu metni — Platform Hero / kart deneyimi (Türkçe) */
  ctaLabel: string;
}

/** Platform markasının kendi kimlik kaydı. */
export interface PlatformIdentity {
  /** Kimlik */
  id: 'istebul';
  /** Ad */
  name: string;
  /** Kısa ad */
  shortName: string;
  /** Açıklama */
  description: string;
  /** Kısa açıklama */
  shortDescription: string;
  /** Slogan */
  slogan: string;
  /** URL — platform kökü (mevcut; cutover ayrı PR) */
  url: string;
  /** Logo anahtarı */
  logoKey: string;
}
