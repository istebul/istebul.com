/**
 * Platform shell home mount (PR-551).
 *
 * Mevcut AI hero / kategoriler korunur. PlatformHero H2 kullanır (H1 bozulmaz).
 * Veri: PLATFORM_CATALOG. Yeni route yok.
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
  const products = listVisiblePlatformProducts();

  const hero = createPlatformHeroElement({
    identity: catalog.identity,
    headingLevel: 2,
    title: 'Yapay zekâ destekli dijital platform',
    description:
      'İSTEBUL; bireyler ve işletmeler için geliştirilen yapay zekâ destekli dijital ürünleri tek çatı altında sunar.',
    ctaLabel: 'Ürünleri keşfet',
    ctaHref: `#${PRODUCTS_ID}`,
    hideCtaNote: true
  });

  const productsWrap = document.createElement('div');
  productsWrap.className = 'ib-platform-shell-home__inner ib-platform-shell-home__products';
  productsWrap.id = PRODUCTS_ID;

  const productsTitle = document.createElement('h2');
  productsTitle.className = 'ib-platform-shell-home__products-title';
  productsTitle.id = 'platform-products-title';
  productsTitle.textContent = 'Platform ürünleri';

  const grid = createPlatformUrunIzgarasiElement({
    products,
    columns: 3,
    ctaLabel: 'İncele',
    enableNavigation: true,
    labelledBy: 'platform-products-title',
    ariaLabel: 'Platform ürünleri'
  });

  productsWrap.append(productsTitle, grid);

  mount.replaceChildren(hero, productsWrap);
  mount.dataset.platformMounted = '1';
  mount.classList.add('ib-platform-shell-home__mount');

  const section = document.getElementById(SECTION_ID);
  if (section) {
    section.dataset.platformShellReady = '1';
  }

  return true;
}

export default initPlatformShellHome;
