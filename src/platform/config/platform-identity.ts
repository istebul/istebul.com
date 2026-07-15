/**
 * İSTEBUL Platform — marka / platform kimliği.
 *
 * Ürün listesinden ayrıdır: bu kayıt platformun kendisini tanımlar.
 * PR-002 kapsamında hiçbir çalışan yüzey bağlanmaz.
 */

import type { PlatformIdentity } from '../types/platform-product.ts';
import { PLATFORM_PRODUCTS } from '../constants/platform-products.ts';

/** Platform markasının resmî kimliği (Türkçe kullanıcı metinleri). */
export const PLATFORM_IDENTITY: Readonly<PlatformIdentity> = Object.freeze({
  id: 'istebul',
  name: 'İSTEBUL',
  shortName: 'İSTEBUL',
  description:
    'İSTEBUL; yapay zekâ destekli dijital ürünler geliştiren bir teknoloji platformudur. İSTEBUL AI, GarsonAI ve İSTEBUL Business bağımsız ürünler olarak yaşar.',
  shortDescription: 'Yapay zekâ destekli dijital ürünler platformu.',
  slogan: 'Doğru ürünle ilerleyin.',
  url: '/',
  logoKey: 'istebul-logo-nav'
});

/**
 * Platform kimliği + ürün kayıtlarının salt okunur özeti.
 * Gelecekte Landing / SEO / API bu nesneyi tüketebilir; şimdilik bağlı değildir.
 */
export const PLATFORM_CATALOG = Object.freeze({
  identity: PLATFORM_IDENTITY,
  products: PLATFORM_PRODUCTS,
  /** Katalog sürümü — veri sözleşmesi değişince artırılır */
  version: 1 as const,
  /**
   * PR-551: ana sayfa üst bandı (`#platform-shell-home`) katalogdan beslenir.
   * Tam platform cutover değildir; AI home / SEO H1 korunur.
   */
  wiredToRuntime: true as const
});

export default PLATFORM_IDENTITY;
