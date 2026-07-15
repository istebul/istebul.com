/**
 * İSTEBUL Platform — iç bağlantı (internal link) sözleşmesi (PR-567).
 *
 * Cutover değildir. Runtime yönlendirme değiştirmez.
 * Hangi yüzeyin hangi kaynaktan link ürettiğini belgeler;
 * cutover PR’larında tek merkezden migrasyon için checklist görevi görür.
 */

import type { PlatformUrlPhase } from '../types/platform-url.ts';
import { PLATFORM_URL_ACTIVE_PHASE } from './platform-url-map.ts';

export type PlatformInternalLinkConsumer =
  | 'catalog-product-cards'
  | 'home-nav-html'
  | 'home-footer-html'
  | 'ai-landing-chrome'
  | 'platform-preview'
  | 'funnel-cta';

export interface PlatformInternalLinkBinding {
  consumer: PlatformInternalLinkConsumer;
  /** Bugün bağlandığı kaynak */
  sourceToday: string;
  /** Cutover sonrası önerilen kaynak */
  sourceAfterCutover: string;
  /** PR-567'de kullanıcıya görünen çıktı değişir mi? */
  userVisibleChangeInPrep: false;
  notes: string;
}

/**
 * İç link tüketicileri — prep aşamasında hepsi CURRENT davranışta kalır.
 */
export const PLATFORM_INTERNAL_LINK_BINDINGS: readonly PlatformInternalLinkBinding[] =
  Object.freeze([
    Object.freeze({
      consumer: 'catalog-product-cards',
      sourceToday: 'PLATFORM_PRODUCTS.url ← getPlatformProductUrl(id, current)',
      sourceAfterCutover:
        'PLATFORM_PRODUCTS.url ← getPlatformProductUrl(id, target) veya faz bayrağı',
      userVisibleChangeInPrep: false,
      notes: 'Home #platform-shell-home ve /platform-preview kartları.'
    }),
    Object.freeze({
      consumer: 'home-nav-html',
      sourceToday: 'index.html hardcoded (PR-552)',
      sourceAfterCutover:
        'PLATFORM_NAV_PRODUCT_LINKS_* fasadından üretilen markup / JS hydrate',
      userVisibleChangeInPrep: false,
      notes: 'Prep PR HTML değiştirmez; fasad current ile hizalı tutulur.'
    }),
    Object.freeze({
      consumer: 'home-footer-html',
      sourceToday: 'index.html hardcoded (PR-562)',
      sourceAfterCutover: 'PLATFORM_FOOTER_PRODUCT_LINKS_* fasadı',
      userVisibleChangeInPrep: false,
      notes: 'Footer AI satırı CURRENT=/\#home; target=/ai/.'
    }),
    Object.freeze({
      consumer: 'ai-landing-chrome',
      sourceToday: 'ai/index.html hardcoded',
      sourceAfterCutover: 'AI chrome + PLATFORM_URL_MAP (ai-landing, funnel)',
      userVisibleChangeInPrep: false,
      notes: '/ai noindex ve paralel yüzey; SEO cutover ayrı PR.'
    }),
    Object.freeze({
      consumer: 'platform-preview',
      sourceToday: 'PLATFORM_PRODUCTS.url (current)',
      sourceAfterCutover: 'Ayrı karar: preview kalkar veya target URL gösterir',
      userVisibleChangeInPrep: false,
      notes: 'Preview noindex; kök SEO’yu etkilemez.'
    }),
    Object.freeze({
      consumer: 'funnel-cta',
      sourceToday: 'getPlatformSurfaceUrl(ai-funnel) eşleniği /karar-asistani/',
      sourceAfterCutover: 'Aynı yüzey URL’si (genelde değişmez)',
      userVisibleChangeInPrep: false,
      notes: 'Ürün girişi değildir; AI funnel.'
    })
  ]);

/** Aktif iç-link fazı — cutover PR’ına kadar current. */
export const PLATFORM_INTERNAL_LINK_PHASE: PlatformUrlPhase = PLATFORM_URL_ACTIVE_PHASE;

/**
 * İç link sözleşmesi özeti (dokümantasyon / test için).
 */
export const PLATFORM_INTERNAL_LINK_CONTRACT = Object.freeze({
  version: 2 as const,
  phase: PLATFORM_INTERNAL_LINK_PHASE,
  rule: 'PR-568: aktif faz target. İSTEBUL AI ürün girişi /ai/; kök / Platform Landing.',
  bindings: PLATFORM_INTERNAL_LINK_BINDINGS,
  nonGoals: Object.freeze([
    'GarsonAI route rewrite',
    'Business route rewrite',
    'API/backend/database değişiklikleri'
  ])
});

export default PLATFORM_INTERNAL_LINK_CONTRACT;
