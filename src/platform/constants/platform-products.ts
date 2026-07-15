/**
 * İSTEBUL Platform — resmî ürün tanımları (tek merkez).
 *
 * PR-002: Saf veri katmanı. Henüz hiçbir çalışan ekran / build / route
 * bu dosyayı import etmez. Gelecekte Platform Landing, kartlar, gezinme,
 * alt bilgi, SEO ve sitemap bu kayıttan beslenebilir.
 */

import type { PlatformProduct } from '../types/platform-product.ts';

/**
 * Platform ürünleri — sıra `order` alanına göredir.
 *
 * URL alanları mevcut girişleri belgeler; yönlendirme veya HTML değiştirmez.
 */
export const PLATFORM_PRODUCTS: readonly PlatformProduct[] = Object.freeze([
  Object.freeze({
    id: 'istebul-ai',
    name: 'İSTEBUL AI',
    shortName: 'AI',
    description:
      'Yapay zekâ destekli karar verme platformu. Araç, konut, tatil, finansman, sigorta ve kasko gibi dikeylerde bilinçli seçim yapmanıza yardımcı olur.',
    shortDescription: 'Yapay zekâ destekli karar verme platformu.',
    slogan: 'Doğru kararı bul.',
    url: '/',
    logoKey: 'istebul-logo-nav',
    status: 'canli',
    statusLabel: 'Canlı',
    order: 1,
    visibility: 'gorunur',
    defaultColor: '#2563eb',
    platformLabel: 'Karar Platformu'
  }),
  Object.freeze({
    id: 'garsonai',
    name: 'GarsonAI',
    shortName: 'GarsonAI',
    description:
      'Yapay zekâ destekli Restoran İşletim Sistemi. Rezervasyon, menü, sipariş, mutfak ekranı ve işletme operasyonlarını tek akışta yönetir.',
    shortDescription: 'Restoran İşletim Sistemi.',
    slogan: 'Restoranınızın dijital garsonu.',
    url: '/garson/',
    logoKey: 'istebul-icon',
    status: 'canli',
    statusLabel: 'Canlı',
    order: 2,
    visibility: 'gorunur',
    defaultColor: '#f97316',
    platformLabel: 'Restoran İşletim Sistemi'
  }),
  Object.freeze({
    id: 'business',
    name: 'İSTEBUL Business',
    shortName: 'Business',
    description:
      'İş Zekâsı ve işletme yönetim platformu. Analiz, kontrol paneli, rapor ve doküman merkezleri ile işletme kararlarını desteklemek üzere geliştirilmektedir.',
    shortDescription: 'İş Zekâsı ve işletme yönetim platformu.',
    slogan: 'İşinizi bilinçle yönetin.',
    url: '/business/',
    logoKey: 'istebul-logo-nav',
    status: 'gelistirme',
    statusLabel: 'Geliştirme Aşamasında',
    order: 3,
    visibility: 'gorunur',
    defaultColor: '#0f172a',
    platformLabel: 'İş Zekâsı'
  })
]);

/**
 * Kimliğe göre ürün bulur. Kayıt yoksa `undefined`.
 * Saf yardımcı — yan etki yok; henüz dışarıdan çağrılmaz.
 */
export function getPlatformProductById(
  id: PlatformProduct['id']
): PlatformProduct | undefined {
  return PLATFORM_PRODUCTS.find((product) => product.id === id);
}

/**
 * Görünür ürünleri `order` sırasıyla döner.
 * Saf yardımcı — henüz dışarıdan çağrılmaz.
 */
export function listVisiblePlatformProducts(): readonly PlatformProduct[] {
  return PLATFORM_PRODUCTS.filter((product) => product.visibility === 'gorunur').sort(
    (a, b) => a.order - b.order
  );
}

export default PLATFORM_PRODUCTS;
