/**
 * Platform shell home mount (PR-551 / PR-553).
 *
 * Mevcut AI hero / kategoriler korunur. PlatformHero H2 kullanır (H1 bozulmaz).
 * Veri: PLATFORM_CATALOG. Yeni route yok.
 * PR-553: ürün başına katalog CTA’ları + Business durum rozeti.
 */

import { PLATFORM_CATALOG } from '../../src/platform/config/platform-identity.ts';
import { listVisiblePlatformProducts } from '../../src/platform/constants/platform-products.ts';
import { createPlatformHeroElement } from '../../src/platform/components/PlatformHero/PlatformHero.ts';
import { createPlatformUrunIzgarasiElement } from '../../src/platform/components/PlatformÜrünIzgarası/PlatformUrunIzgarasi.ts';

const MOUNT_ID = 'platform-shell-home-mount';
const SECTION_ID = 'platform-shell-home';
const PRODUCTS_ID = 'platform-products';

/**
 * Ana sayfa üstüne PlatformHero + ürün ızgarasını bir kez bağlar.
 * @returns {boolean} mount başarılı mı
 */
export function initPlatformShellHome() {
  const mount = document.getElementById(MOUNT_ID);
  if (!mount || mount.dataset.platformMounted === '1') {
    return Boolean(mount?.dataset.platformMounted === '1');
  }

  const catalog = PLATFORM_CATALOG;
  const identity = catalog.identity;
  const products = listVisiblePlatformProducts();

  const hero = createPlatformHeroElement({
    identity,
    headingLevel: 2,
    brandName: identity.name,
    title: 'Yapay zekâ destekli dijital platform',
    slogan: identity.slogan,
    description: identity.description,
    products,
    showProductStatus: true,
    hideCtaNote: true,
    className: 'ib-platform-hero--shell'
  });

  const productsWrap = document.createElement('div');
  productsWrap.className = 'ib-platform-shell-home__inner ib-platform-shell-home__products';
  productsWrap.id = PRODUCTS_ID;

  const productsTitle = document.createElement('h2');
  productsTitle.className = 'ib-platform-shell-home__products-title';
  productsTitle.id = 'platform-products-title';
  productsTitle.textContent = 'Platform ürünleri';

  // Kart CTA’ları PLATFORM_PRODUCTS.ctaLabel üzerinden gelir (global “İncele” yok).
  const grid = createPlatformUrunIzgarasiElement({
    products,
    columns: 3,
    enableNavigation: true,
    labelledBy: 'platform-products-title',
    ariaLabel: 'Platform ürünleri'
  });

  productsWrap.append(productsTitle, grid);

  mount.replaceChildren(hero, productsWrap);
  mount.dataset.platformMounted = '1';
  mount.dataset.platformExperience = '1';
  mount.classList.add('ib-platform-shell-home__mount');

  const section = document.getElementById(SECTION_ID);
  if (section) {
    section.dataset.platformShellReady = '1';
    section.dataset.platformShellExperience = '1';
    section.classList.add('ib-platform-shell-home--experience');
  }

  return true;
}

export default initPlatformShellHome;
