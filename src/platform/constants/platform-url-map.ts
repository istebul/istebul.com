/**
 * İSTEBUL Platform — merkezi URL haritası (PR-567 / EPIC-002).
 *
 * Tek kaynak: ürün ve yüzey URL’leri.
 * - `current` = bugünkü canlı davranış (değiştirme; cutover değil)
 * - `target`  = onaylı cutover sonrası hedef (henüz hiçbir runtime tüketmez)
 *
 * Varsayılan faz her zaman `current`. Target’a geçiş ayrı, onaylı cutover PR ister.
 */

import type { PlatformProductId } from '../types/platform-product.ts';
import type {
  PlatformSurfaceUrlKey,
  PlatformUrlEntry,
  PlatformUrlMapKey,
  PlatformUrlPhase
} from '../types/platform-url.ts';

/** Ürün giriş URL’leri (PLATFORM_PRODUCTS.url buradan beslenir — current). */
export const PLATFORM_PRODUCT_URLS: Readonly<
  Record<PlatformProductId, Readonly<PlatformUrlEntry>>
> = Object.freeze({
  'istebul-ai': Object.freeze({
    current: '/',
    target: '/ai/',
    note: 'Cutover sonrası AI Landing /ai; kök Platform Landing olur. /ai noindex kaldırma ayrı SEO PR.'
  }),
  garsonai: Object.freeze({
    current: '/garson/',
    target: '/garson/',
    note: 'Ürün girişi aynı kalır.'
  }),
  business: Object.freeze({
    current: '/business/',
    target: '/business/',
    note: 'Ürün girişi aynı kalır.'
  })
});

/**
 * Hub / yardımcı yüzey URL’leri.
 * Ürün kartı `url` alanına karışmaz; cutover / chrome / funnel için merkez.
 */
export const PLATFORM_SURFACE_URLS: Readonly<
  Record<PlatformSurfaceUrlKey, Readonly<PlatformUrlEntry>>
> = Object.freeze({
  'platform-root': Object.freeze({
    current: '/',
    target: '/',
    note: 'Hedefte Platform Landing; bugün AI home + SPA kabuğu. Görünüm değişikliği cutover PR.'
  }),
  'ai-landing': Object.freeze({
    current: '/ai/',
    target: '/ai/',
    note: 'Paralel klon yüzey (PR-566). Bugün noindex; SEO cutover ayrı.'
  }),
  'ai-funnel': Object.freeze({
    current: '/karar-asistani/',
    target: '/karar-asistani/',
    note: 'AI karar funneli; ürün girişi değildir.'
  }),
  'ai-pricing': Object.freeze({
    current: '/planlar',
    target: '/planlar',
    note: 'AI planlar yüzeyi.'
  }),
  'platform-preview': Object.freeze({
    current: '/platform-preview/',
    target: '/platform-preview/',
    note: 'Noindex preview; cutover sonrası kalkabilir veya arşiv — ayrı karar.'
  })
});

/** Birleşik salt-okunur harita (ürün + yüzey). */
export const PLATFORM_URL_MAP: Readonly<
  Record<PlatformUrlMapKey, Readonly<PlatformUrlEntry>>
> = Object.freeze({
  ...PLATFORM_PRODUCT_URLS,
  ...PLATFORM_SURFACE_URLS
});

/** Runtime varsayılanı — PR-568 Platform Cutover: target. */
export const PLATFORM_URL_ACTIVE_PHASE: PlatformUrlPhase = 'target';

/**
 * Ürün URL’si. Varsayılan faz `PLATFORM_URL_ACTIVE_PHASE` (cutover sonrası target).
 */
export function getPlatformProductUrl(
  id: PlatformProductId,
  phase: PlatformUrlPhase = PLATFORM_URL_ACTIVE_PHASE
): string {
  return PLATFORM_PRODUCT_URLS[id][phase];
}

/**
 * Yüzey / hub URL’si. Varsayılan faz `current`.
 */
export function getPlatformSurfaceUrl(
  key: PlatformSurfaceUrlKey,
  phase: PlatformUrlPhase = PLATFORM_URL_ACTIVE_PHASE
): string {
  return PLATFORM_SURFACE_URLS[key][phase];
}

/**
 * Harita anahtarı → URL. Bilinmeyen anahtar için `undefined`.
 */
export function getPlatformUrl(
  key: PlatformUrlMapKey,
  phase: PlatformUrlPhase = PLATFORM_URL_ACTIVE_PHASE
): string | undefined {
  const entry = PLATFORM_URL_MAP[key];
  return entry ? entry[phase] : undefined;
}

/**
 * Cutover sırasında CURRENT → TARGET farkı olan kayıtlar.
 * Boş fark = URL değişmeyecek yüzeyler.
 */
export function listPlatformUrlCutoverDeltas(): readonly {
  key: PlatformUrlMapKey;
  current: string;
  target: string;
  note?: string;
}[] {
  return (Object.keys(PLATFORM_URL_MAP) as PlatformUrlMapKey[])
    .map((key) => {
      const entry = PLATFORM_URL_MAP[key];
      return {
        key,
        current: entry.current,
        target: entry.target,
        note: entry.note
      };
    })
    .filter((row) => row.current !== row.target);
}

export default PLATFORM_URL_MAP;
