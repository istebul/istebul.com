/**
 * İSTEBUL Platform — URL / cutover tip sözleşmeleri (PR-567).
 *
 * Cutover değildir. Kullanıcıya görünen linkleri değiştirmez.
 */

import type { PlatformProductId } from './platform-product.ts';

/** Canlı davranış vs onaylı cutover hedefi. */
export type PlatformUrlPhase = 'current' | 'target';

/** Tek bir ürün (veya hub) URL kaydı. */
export interface PlatformUrlEntry {
  /** Canlı / bugünkü URL — mevcut davranışla birebir aynı olmalı. */
  current: string;
  /** Onaylı cutover sonrası hedef URL (henüz aktif değil). */
  target: string;
  /** Kısa not — SEO / redirect / product ownership. */
  note?: string;
}

/** Ürün URL haritası anahtarı. */
export type PlatformProductUrlKey = PlatformProductId;

/** Hub / yüzey URL anahtarları (ürün id’si olmayanlar). */
export type PlatformSurfaceUrlKey =
  | 'platform-root'
  | 'ai-landing'
  | 'ai-funnel'
  | 'ai-pricing'
  | 'platform-preview';

export type PlatformUrlMapKey = PlatformProductUrlKey | PlatformSurfaceUrlKey;

/** Gezinme / alt bilgi satırı (saf veri; HTML bağlanmaz). */
export interface PlatformChromeLink {
  /** Kararlı kimlik */
  id: string;
  /** Görünen etiket (TR kaynak; i18n anahtarı ayrı olabilir) */
  label: string;
  /** Opsiyonel i18n anahtarı (mevcut marketing-copy) */
  i18nKey?: string;
  /** Bağlantı — PR-567'de her zaman CURRENT fazı */
  href: string;
  /** İlişkili ürün (varsa) */
  productId?: PlatformProductId;
  /** Satır rolü */
  role: 'product' | 'category' | 'utility' | 'legal' | 'funnel';
}
