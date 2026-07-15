/**
 * İSTEBUL Platform — ortak bileşen dışa aktarım yüzeyi.
 *
 * PR-004/005/550: Hero + ÜrünKartı + ÜrünIzgarası dışa aktarılır.
 * Hiçbir HTML, route, bundle veya ürün modülü bu dosyayı
 * henüz import etmemelidir.
 *
 * Gelecek (ayrı PR’lar):
 * - PlatformÜstBilgi
 * - PlatformAltBilgi
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

export {
  createPlatformUrunIzgarasiElement,
  getPlatformUrunIzgarasiViewState,
  PLATFORM_URUN_IZGARASI_DEFAULTS
} from './PlatformÜrünIzgarası/PlatformUrunIzgarasi';
export type {
  PlatformUrunIzgarasiProps,
  PlatformUrunIzgarasiColumns,
  PlatformUrunIzgarasiViewState
} from './PlatformÜrünIzgarası/PlatformUrunIzgarasi';
