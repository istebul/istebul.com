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
  url: getPlatformSurfaceUrl('platform-root', 'current'),
  logoKey: 'istebul-logo-nav'
});

/**
 * Platform kimliği + ürün kayıtlarının salt okunur özeti.
 * PR-567: URL haritası / iç-link sözleşmesi referans olarak eklenir (cutover aktif değil).
 */
export const PLATFORM_CATALOG = Object.freeze({
  identity: PLATFORM_IDENTITY,
  products: PLATFORM_PRODUCTS,
  /** Katalog sürümü — URL map + internal-link contract eklendi */
  version: 2 as const,
  /**
   * PR-551: ana sayfa üst bandı (`#platform-shell-home`) katalogdan beslenir.
   * Tam platform cutover değildir; AI home / SEO H1 korunur.
   */
  wiredToRuntime: true as const,
  /**
   * PR-567: merkezi URL / chrome hazırlığı var; aktif faz `current`.
   * Target fazına geçiş bu bayrakla yapılmaz — ayrı cutover PR.
   */
  cutoverPrepared: true as const,
  internalLinkPhase: PLATFORM_INTERNAL_LINK_CONTRACT.phase
});

export default PLATFORM_IDENTITY;
