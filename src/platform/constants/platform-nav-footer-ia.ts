/**
 * İSTEBUL Platform — gezinme / alt bilgi IA veri fasadı (PR-567).
 *
 * Saf veri. index.html /ai / footer HTML’ye henüz bağlanmaz.
 * Bugünkü canlı href’ler `current` URL haritasından türetilir.
 * Cutover sonrası tek faz değişimi ile yön değiştirmeye hazırlık amaçlıdır.
 */

import type { PlatformChromeLink } from '../types/platform-url.ts';
import {
  getPlatformProductUrl,
  getPlatformSurfaceUrl
} from './platform-url-map.ts';

/**
 * Ana gezinme — Ürünler menüsü (PR-552 canlı sözleşmesi ile uyumlu).
 * Not: İSTEBUL AI nav href’i bugün `/` (footer’da `/#home` varyantı ayrı).
 */
export const PLATFORM_NAV_PRODUCT_LINKS_CURRENT: readonly PlatformChromeLink[] =
  Object.freeze([
    Object.freeze({
      id: 'nav-product-istebul-ai',
      label: 'İSTEBUL AI',
      i18nKey: 'nav.productAi',
      href: getPlatformProductUrl('istebul-ai', 'current'),
      productId: 'istebul-ai',
      role: 'product'
    }),
    Object.freeze({
      id: 'nav-product-garsonai',
      label: 'GarsonAI',
      i18nKey: 'nav.productGarson',
      href: getPlatformProductUrl('garsonai', 'current'),
      productId: 'garsonai',
      role: 'product'
    }),
    Object.freeze({
      id: 'nav-product-business',
      label: 'İSTEBUL Business',
      i18nKey: 'nav.productBusiness',
      href: getPlatformProductUrl('business', 'current'),
      productId: 'business',
      role: 'product'
    })
  ]);

/**
 * Footer — Ürünler sütunu (PR-562 canlı sözleşmesi).
 * İSTEBUL AI satırı mevcut HTML’de `/#home` kullanır; bu fasad da aynıyı belgeler.
 */
export const PLATFORM_FOOTER_PRODUCT_LINKS_CURRENT: readonly PlatformChromeLink[] =
  Object.freeze([
    Object.freeze({
      id: 'footer-product-istebul-ai',
      label: 'İSTEBUL AI',
      href: '/#home',
      productId: 'istebul-ai',
      role: 'product'
    }),
    Object.freeze({
      id: 'footer-product-garsonai',
      label: 'GarsonAI',
      href: getPlatformProductUrl('garsonai', 'current'),
      productId: 'garsonai',
      role: 'product'
    }),
    Object.freeze({
      id: 'footer-product-business',
      label: 'İSTEBUL Business',
      href: getPlatformProductUrl('business', 'current'),
      productId: 'business',
      role: 'product'
    }),
    Object.freeze({
      id: 'footer-product-plans',
      label: 'Planlar',
      href: getPlatformSurfaceUrl('ai-pricing', 'current'),
      role: 'utility'
    })
  ]);

/**
 * Karar kategorileri (nav) — ürün değildir; cutover’da AI ürün ağacında kalır.
 * Merkezi sözleşme: Garson/Business buraya girmez.
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
      href: '/#home-vertical-focus',
      role: 'utility'
    })
  ]);

/**
 * Cutover sonrası Ürünler menüsü hedefi (henüz HTML’ye bağlanmaz).
 * AI → /ai/; Garson/Business aynı.
 */
export const PLATFORM_NAV_PRODUCT_LINKS_TARGET: readonly PlatformChromeLink[] =
  Object.freeze(
    PLATFORM_NAV_PRODUCT_LINKS_CURRENT.map((link) =>
      Object.freeze({
        ...link,
        href: link.productId
          ? getPlatformProductUrl(link.productId, 'target')
          : link.href
      })
    )
  );

/**
 * Cutover sonrası footer ürün sütunu hedefi (henüz HTML’ye bağlanmaz).
 * AI satırı `/ai/` (anchor yerine ürün girişi).
 */
export const PLATFORM_FOOTER_PRODUCT_LINKS_TARGET: readonly PlatformChromeLink[] =
  Object.freeze(
    PLATFORM_FOOTER_PRODUCT_LINKS_CURRENT.map((link) => {
      if (link.productId === 'istebul-ai') {
        return Object.freeze({
          ...link,
          href: getPlatformProductUrl('istebul-ai', 'target')
        });
      }
      if (link.productId) {
        return Object.freeze({
          ...link,
          href: getPlatformProductUrl(link.productId, 'target')
        });
      }
      return link;
    })
  );
