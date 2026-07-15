/**
 * PR-568 — Live Platform Landing mount for `/`.
 *
 * Promotes the Platform Preview experience (PR-564) to the root surface.
 * Catalog product URLs follow PLATFORM_URL_ACTIVE_PHASE (target → AI `/ai/`).
 * Does not alter GarsonAI / Business product logic.
 */

import { PLATFORM_CATALOG } from '../../src/platform/config/platform-identity.ts';
import { listVisiblePlatformProducts } from '../../src/platform/constants/platform-products.ts';
import { createPlatformHeroElement } from '../../src/platform/components/PlatformHero/PlatformHero.ts';
import { createPlatformUrunIzgarasiElement } from '../../src/platform/components/PlatformÜrünIzgarası/PlatformUrunIzgarasi.ts';

const MOUNT_ID = 'platform-landing-mount';
const SECTION_ID = 'platform-landing';
const PRODUCTS_ID = 'platform-products';

/** Live Platform Landing ürün metinleri (preview ile aynı UX; URL katalogdan). */
const LANDING_PRODUCT_COPY = Object.freeze({
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
    statusLabel: 'Geliştirme Aşamasında',
    ctaLabel: 'Yol Haritasını İncele'
  })
});

/**
 * @returns {import('../../src/platform/types/platform-product.ts').PlatformProduct[]}
 */
export function getPlatformLandingProducts() {
  return listVisiblePlatformProducts().map((product) => {
    const overlay = LANDING_PRODUCT_COPY[product.id];
    if (!overlay) return product;
    return Object.freeze({ ...product, ...overlay });
  });
}

/**
 * Köke Platform Landing bağlar (H1 sahibi).
 * @returns {boolean}
 */
export function initPlatformLanding() {
  const mount = document.getElementById(MOUNT_ID);
  if (!mount || mount.dataset.platformLandingMounted === '1') {
    return Boolean(mount?.dataset.platformLandingMounted === '1');
  }

  const identity = PLATFORM_CATALOG.identity;
  const products = getPlatformLandingProducts();

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
    className: 'ib-platform-hero--landing'
  });

  const lead = document.createElement('section');
  lead.className = 'ib-platform-landing-preview__lead';
  lead.setAttribute('aria-labelledby', 'platform-landing-lead-title');

  const leadTitle = document.createElement('h2');
  leadTitle.id = 'platform-landing-lead-title';
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
  mount.dataset.platformLandingMounted = '1';
  mount.classList.add('ib-platform-landing-preview__mount--ready');

  const section = document.getElementById(SECTION_ID);
  if (section) {
    section.dataset.platformLandingReady = '1';
    section.dataset.platformCutover = '1';
  }

  document.documentElement.dataset.ibPlatformLanding = '1';
  return true;
}

export default initPlatformLanding;
