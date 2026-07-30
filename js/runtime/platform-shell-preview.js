/**
 * PR-564 — Platform Landing Preview mount.
 *
 * Bağımsız `/platform-preview/` yüzeyi. `index.html` / `/` / SEO meta dokunulmaz.
 * Katalog tabanlı PlatformHero + ürün ızgarası; preview CTA metinleri burada override edilir
 * (ana sayfa katalog sözleşmesi değişmez).
 */

import { PLATFORM_CATALOG } from '../../src/platform/config/platform-identity.ts';
import { listVisiblePlatformProducts } from '../../src/platform/constants/platform-products.ts';
import { createPlatformHeroElement } from '../../src/platform/components/PlatformHero/PlatformHero.ts';
import { createPlatformUrunIzgarasiElement } from '../../src/platform/components/PlatformÜrünIzgarası/PlatformUrunIzgarasi.ts';

const MOUNT_ID = 'platform-landing-preview-mount';
const SECTION_ID = 'platform-landing-preview';
const PRODUCTS_ID = 'platform-products';

/** Preview-only ürün metinleri (EPIC-002 / PR-564). Kaynak katalog URL/status korunur. */
const PREVIEW_PRODUCT_COPY = Object.freeze({
  'istebul-ai': Object.freeze({
    slogan: 'Bireysel kullanıcılar',
    shortDescription: 'Büyük satın alma kararları',
    ctaLabel: 'Karşılaştırmaya Başla'
  }),
  garsonai: Object.freeze({
    slogan: 'Restoranlar',
    shortDescription: 'AI Restoran İşletim Sistemi',
    ctaLabel: 'Restoranımı Dijitalleştir'
  }),
  business: Object.freeze({
    slogan: 'İşletmeler',
    shortDescription: 'İş zekâsı platformu',
    statusLabel: 'Canlı',
    ctaLabel: 'İSTEBUL Business’a Git'
  })
});

/**
 * Preview ürün listesi — katalog ürünlerini kopyalar, CTA/özet satırlarını override eder.
 * @returns {import('../../src/platform/types/platform-product.ts').PlatformProduct[]}
 */
export function getPlatformLandingPreviewProducts() {
  return listVisiblePlatformProducts().map((product) => {
    const overlay = PREVIEW_PRODUCT_COPY[product.id];
    if (!overlay) return product;
    return Object.freeze({ ...product, ...overlay });
  });
}

/**
 * Platform Landing Preview montajı.
 * @returns {boolean}
 */
export function initPlatformLandingPreview() {
  const mount = document.getElementById(MOUNT_ID);
  if (!mount || mount.dataset.platformPreviewMounted === '1') {
    return Boolean(mount?.dataset.platformPreviewMounted === '1');
  }

  const identity = PLATFORM_CATALOG.identity;
  const products = getPlatformLandingPreviewProducts();

  const hero = createPlatformHeroElement({
    identity,
    headingLevel: 1,
    brandName: identity.name,
    title: 'Yapay zekâ destekli dijital platform',
    slogan: identity.slogan,
    description: identity.description,
    ctaLabel: 'Ürünleri keşfet',
    ctaHref: `#${PRODUCTS_ID}`,
    hideCtaNote: true,
    className: 'ib-platform-hero--landing-preview'
  });

  const lead = document.createElement('section');
  lead.className = 'ib-platform-landing-preview__lead';
  lead.setAttribute('aria-labelledby', 'platform-preview-lead-title');

  const leadTitle = document.createElement('h2');
  leadTitle.id = 'platform-preview-lead-title';
  leadTitle.className = 'ib-platform-landing-preview__lead-title';
  leadTitle.textContent = 'Üç bağımsız ürün, tek platform';

  const leadText = document.createElement('p');
  leadText.className = 'ib-platform-landing-preview__lead-text';
  leadText.textContent =
    'İSTEBUL; bireyler ve işletmeler için yapay zekâ destekli ürünleri bir araya getirir. Her ürün kendi girişi ve yolculuğu ile yaşar.';

  lead.append(leadTitle, leadText);

  const productsWrap = document.createElement('div');
  productsWrap.className = 'ib-platform-landing-preview__products';
  productsWrap.id = PRODUCTS_ID;

  const productsTitle = document.createElement('h2');
  productsTitle.className = 'ib-platform-landing-preview__products-title';
  productsTitle.id = 'platform-products-title';
  productsTitle.textContent = 'Platform ürünleri';

  const grid = createPlatformUrunIzgarasiElement({
    products,
    columns: 3,
    enableNavigation: true,
    labelledBy: 'platform-products-title',
    ariaLabel: 'Platform ürünleri'
  });

  productsWrap.append(productsTitle, grid);

  mount.replaceChildren(hero, lead, productsWrap);
  mount.dataset.platformPreviewMounted = '1';
  mount.classList.add('ib-platform-landing-preview__mount--ready');

  const section = document.getElementById(SECTION_ID);
  if (section) {
    section.dataset.platformLandingPreviewReady = '1';
  }

  return true;
}

function boot() {
  initPlatformLandingPreview();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}

export default initPlatformLandingPreview;
