/**
 * İSTEBUL Platform — gezinme / alt bilgi IA veri fasadı (PR-567 / EPIC-003).
 *
 * Saf veri. Canlı href’ler `PLATFORM_URL_ACTIVE_PHASE` (target) üzerinden türetilir.
 */

import type { PlatformChromeLink } from '../types/platform-url.ts';
import {
  getPlatformProductUrl,
  getPlatformSurfaceUrl
} from './platform-url-map.ts';

/**
 * Ana gezinme — Ürünler menüsü (Platform Cutover sonrası).
 */
export const PLATFORM_NAV_PRODUCT_LINKS_CURRENT: readonly PlatformChromeLink[] =
  Object.freeze([
    Object.freeze({
      id: 'nav-product-istebul-ai',
      label: 'İSTEBUL AI',
      i18nKey: 'nav.productAi',
      href: getPlatformProductUrl('istebul-ai'),
      productId: 'istebul-ai',
      role: 'product'
    }),
    Object.freeze({
      id: 'nav-product-garsonai',
      label: 'GarsonAI',
      i18nKey: 'nav.productGarson',
      href: getPlatformProductUrl('garsonai'),
      productId: 'garsonai',
      role: 'product'
    }),
    Object.freeze({
      id: 'nav-product-business',
      label: 'İSTEBUL Business',
      i18nKey: 'nav.productBusiness',
      href: getPlatformProductUrl('business'),
      productId: 'business',
      role: 'product'
    })
  ]);

/**
 * Footer — Ürünler sütunu (AI → /ai/ ürün girişi).
 */
export const PLATFORM_FOOTER_PRODUCT_LINKS_CURRENT: readonly PlatformChromeLink[] =
  Object.freeze([
    Object.freeze({
      id: 'footer-product-istebul-ai',
      label: 'İSTEBUL AI',
      href: getPlatformProductUrl('istebul-ai'),
      productId: 'istebul-ai',
      role: 'product'
    }),
    Object.freeze({
      id: 'footer-product-garsonai',
      label: 'GarsonAI',
      href: getPlatformProductUrl('garsonai'),
      productId: 'garsonai',
      role: 'product'
    }),
    Object.freeze({
      id: 'footer-product-business',
      label: 'İSTEBUL Business',
      href: getPlatformProductUrl('business'),
      productId: 'business',
      role: 'product'
    }),
    Object.freeze({
      id: 'footer-product-plans',
      label: 'Planlar',
      href: getPlatformSurfaceUrl('ai-pricing'),
      role: 'utility'
    })
  ]);

/**
 * Karar kategorileri (nav) — ürün değildir; AI ürün ağacında kalır.
 */
export const PLATFORM_NAV_CATEGORY_LINKS_CURRENT: readonly PlatformChromeLink[] =
  Object.freeze([
    Object.freeze({
      id: 'nav-cat-auto',
      label: 'Otomobil',
      href: '/auto/',
      role: 'category'
    }),
    Object.freeze({
      id: 'nav-cat-konut',
      label: 'Konut',
      href: '/konut/',
      role: 'category'
    }),
    Object.freeze({
      id: 'nav-cat-tatil',
      label: 'Tatil',
      href: '/tatil/',
      role: 'category'
    }),
    Object.freeze({
      id: 'nav-cat-finans',
      label: 'Finansman',
      href: '/finans/',
      role: 'category'
    }),
    Object.freeze({
      id: 'nav-cat-sigorta',
      label: 'Sigorta',
      href: '/sigorta/',
      role: 'category'
    }),
    Object.freeze({
      id: 'nav-cat-kasko',
      label: 'Kasko',
      href: '/kasko/',
      role: 'category'
    }),
    Object.freeze({
      id: 'nav-cat-all',
      label: 'Tüm kategoriler',
      href: '/ai/#home-vertical-focus',
      role: 'utility'
    })
  ]);

/**
 * Cutover sonrası Ürünler menüsü hedefi (= canlı faz).
 */
export const PLATFORM_NAV_PRODUCT_LINKS_TARGET: readonly PlatformChromeLink[] =
  PLATFORM_NAV_PRODUCT_LINKS_CURRENT;

/**
 * Cutover sonrası footer ürün sütunu hedefi (= canlı faz).
 */
export const PLATFORM_FOOTER_PRODUCT_LINKS_TARGET: readonly PlatformChromeLink[] =
  PLATFORM_FOOTER_PRODUCT_LINKS_CURRENT;
