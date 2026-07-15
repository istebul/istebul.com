/**
 * İSTEBUL Platform — marka / platform kimliği.
 *
 * Ürün listesinden ayrıdır: bu kayıt platformun kendisini tanımlar.
 * PR-567: kök URL `platform-url-map` CURRENT fazından gelir (davranış aynı: `/`).
 */

import type { PlatformIdentity } from '../types/platform-product.ts';
import { PLATFORM_PRODUCTS } from '../constants/platform-products.ts';
import { getPlatformSurfaceUrl } from '../constants/platform-url-map.ts';
import { PLATFORM_INTERNAL_LINK_CONTRACT } from '../constants/platform-internal-links.ts';

/** Platform markasının resmî kimliği (Türkçe kullanıcı metinleri). */
export const PLATFORM_IDENTITY: Readonly<PlatformIdentity> = Object.freeze({
  id: 'istebul',
  name: 'İSTEBUL',
  shortName: 'İSTEBUL',
  description:
    'İSTEBUL; yapay zekâ destekli dijital ürünler geliştiren bir teknoloji platformudur. İSTEBUL AI, GarsonAI ve İSTEBUL Business bağımsız ürünler olarak yaşar.',
  shortDescription: 'Yapay zekâ destekli dijital ürünler platformu.',
  slogan: 'Doğru ürünle ilerleyin.',
  url: getPlatformSurfaceUrl('platform-root'),
  logoKey: 'istebul-logo-nav'
});

/**
 * Platform kimliği + ürün kayıtlarının salt okunur özeti.
 * PR-567: URL haritası / iç-link sözleşmesi referans olarak eklenir (cutover aktif değil).
 */
export const PLATFORM_CATALOG = Object.freeze({
  identity: PLATFORM_IDENTITY,
  products: PLATFORM_PRODUCTS,
  /** Katalog sürümü — PR-568 cutover (active phase = target) */
  version: 3 as const,
  /**
   * PR-568: `/` Platform Landing; ürün kartları TARGET URL (AI → /ai/).
   */
  wiredToRuntime: true as const,
  cutoverPrepared: true as const,
  /** PR-568 canlı cutover tamamlandı. */
  cutoverActive: true as const,
  internalLinkPhase: PLATFORM_INTERNAL_LINK_CONTRACT.phase
});

export default PLATFORM_IDENTITY;
