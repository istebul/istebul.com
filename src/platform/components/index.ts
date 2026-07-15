/**
 * İSTEBUL Platform — ortak bileşen dışa aktarım yüzeyi.
 *
 * PR-004: PlatformHero çalışan bileşen olarak dışa aktarılır.
 * Hiçbir HTML, route, bundle veya ürün modülü bu dosyayı
 * henüz import etmemelidir.
 *
 * Gelecek (ayrı PR’lar):
 * - PlatformÜstBilgi
 * - PlatformAltBilgi
 * - PlatformÜrünKartları
 * - PlatformÜrünIzgarası
 */

export {
  createPlatformHeroElement,
  PLATFORM_HERO_DEFAULTS
} from './PlatformHero/PlatformHero';
export type { PlatformHeroProps } from './PlatformHero/PlatformHero';
