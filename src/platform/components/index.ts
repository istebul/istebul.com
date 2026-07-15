/**
 * İSTEBUL Platform — ortak bileşen dışa aktarım yüzeyi.
 *
 * PR-004/005: PlatformHero + PlatformÜrünKartı dışa aktarılır.
 * Hiçbir HTML, route, bundle veya ürün modülü bu dosyayı
 * henüz import etmemelidir.
 *
 * Gelecek (ayrı PR’lar):
 * - PlatformÜstBilgi
 * - PlatformAltBilgi
 * - PlatformÜrünIzgarası
 */

export {
  createPlatformHeroElement,
  PLATFORM_HERO_DEFAULTS
} from './PlatformHero/PlatformHero';
export type { PlatformHeroProps } from './PlatformHero/PlatformHero';

export {
  createPlatformUrunKartiElement,
  PLATFORM_URUN_KARTI_DEFAULTS
} from './PlatformÜrünKartı/PlatformUrunKarti';
export type { PlatformUrunKartiProps } from './PlatformÜrünKartı/PlatformUrunKarti';
