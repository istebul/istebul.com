/**
 * EPIC-570B — Shared platform navigation for Business product pages.
 *
 * Logo → `/` (platform home). Business stays one product inside the platform.
 * Scoped under `.ib-business-app` — does not load global marketing DS CSS.
 */

export interface BusinessPlatformNavLink {
  href: string;
  label: string;
  /** Mark current product when on /business/*. */
  id?: 'home' | 'ai' | 'garsonai' | 'business';
}

const PLATFORM_LINKS: readonly BusinessPlatformNavLink[] = Object.freeze([
  { id: 'home', href: '/', label: 'Ana sayfa' },
  { id: 'ai', href: '/', label: 'İSTEBUL AI' },
  { id: 'garsonai', href: '/garson/', label: 'GarsonAI' },
  { id: 'business', href: '/business/', label: 'Business' }
]);

export interface BusinessPlatformNavOptions {
  /** Override product links (tests). */
  links?: readonly BusinessPlatformNavLink[];
}

function normalizePath(href: string): string {
  try {
    const path = new URL(href, 'https://www.istebul.com').pathname;
    return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  } catch {
    return href;
  }
}

function isBusinessPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === '/business' || path.startsWith('/business/');
}

/**
 * Build the platform chrome header for Business pages.
 */
export function createBusinessPlatformNavElement(
  options: BusinessPlatformNavOptions = {}
): HTMLElement {
  const links = options.links ?? PLATFORM_LINKS;
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '/business/';

  const header = document.createElement('header');
  header.className = 'ib-biz-platform-nav';
  header.dataset.businessPlatformNav = '1';
  header.setAttribute('role', 'banner');

  const inner = document.createElement('div');
  inner.className = 'ib-biz-platform-nav__inner';

  const brand = document.createElement('a');
  brand.className = 'ib-biz-platform-nav__brand';
  brand.href = '/';
  brand.setAttribute('aria-label', 'isteBul ana sayfa');
  brand.dataset.platformHome = '1';

  const logo = document.createElement('img');
  logo.className = 'ib-biz-platform-nav__logo';
  logo.src = '/assets/brand/istebul-icon.svg';
  logo.alt = '';
  logo.width = 28;
  logo.height = 28;
  logo.decoding = 'async';

  const word = document.createElement('span');
  word.className = 'ib-biz-platform-nav__word';
  word.textContent = 'isteBul';

  const badge = document.createElement('span');
  badge.className = 'ib-biz-platform-nav__badge';
  badge.textContent = 'Business';

  brand.append(logo, word, badge);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ib-biz-platform-nav__toggle';
  toggle.setAttribute('aria-controls', 'ib-biz-platform-nav-menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = 'Menü';

  const nav = document.createElement('nav');
  nav.className = 'ib-biz-platform-nav__menu';
  nav.id = 'ib-biz-platform-nav-menu';
  nav.setAttribute('aria-label', 'Platform ürünleri');

  for (const item of links) {
    const link = document.createElement('a');
    link.className = 'ib-biz-platform-nav__link';
    link.href = item.href;
    link.textContent = item.label;
    if (item.id) link.dataset.platformProduct = item.id;

    const active =
      item.id === 'business'
        ? isBusinessPath(pathname)
        : item.id === 'garsonai'
          ? normalizePath(pathname).startsWith('/garson')
          : item.id === 'home'
            ? normalizePath(pathname) === '/'
            : false;

    // Avoid marking both Ana sayfa and İSTEBUL AI active on `/`.
    if (item.id === 'ai' && normalizePath(pathname) === '/') {
      /* leave inactive — home owns `/` */
    } else if (active) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }

    nav.appendChild(link);
  }

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    const open = !header.classList.contains('is-nav-open');
    header.classList.toggle('is-nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      header.classList.remove('is-nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  inner.append(brand, toggle, nav);
  header.appendChild(inner);
  return header;
}

export { PLATFORM_LINKS as BUSINESS_PLATFORM_NAV_LINKS };

export default createBusinessPlatformNavElement;
