/**
 * Shared category navigation for vertical pages (mobile drawer + product links).
 */

const PRODUCT_LINKS = [
  { href: '/', i18n: 'nav.home', label: 'Ana sayfa' },
  { href: '/auto/', i18n: 'nav.catAuto', label: 'Araç' },
  { href: '/konut/', i18n: 'vertical.konut', label: 'Konut' },
  { href: '/tatil/', i18n: 'vertical.tatil', label: 'Tatil' },
  { href: '/finans/', i18n: 'vertical.finans', label: 'Finansman' },
  { href: '/sigorta/', i18n: 'nav.catSigorta', label: 'Sigorta' },
  { href: '/kasko/', i18n: 'nav.catKasko', label: 'Kasko' }
];

function normalizePath(href) {
  try {
    const path = new URL(href, window.location.origin).pathname;
    return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  } catch {
    return href;
  }
}

function translate(key, fallback) {
  const hit = window.__ibI18n?.t?.(key);
  return hit && hit !== key ? hit : fallback;
}

function currentPath() {
  return normalizePath(window.location.pathname);
}

function ensureProductNavBlock(nav) {
  if (!nav) return;

  let block = nav.querySelector('[data-vertical-nav-products]');
  if (!block) {
    block = document.createElement('div');
    block.setAttribute('data-vertical-nav-products', '');
    block.setAttribute('role', 'group');
    block.setAttribute('aria-label', 'Kategoriler');
    nav.prepend(block);
  }

  if (!block.querySelector('.ib-vertical-nav-section-label')) {
    const label = document.createElement('span');
    label.className = 'ib-vertical-nav-section-label';
    label.textContent = translate('nav.allCategories', 'Kategoriler');
    block.appendChild(label);
  }

  const existing = new Set(
    [...nav.querySelectorAll('a[href]')].map((a) => normalizePath(a.getAttribute('href') || ''))
  );

  for (const item of PRODUCT_LINKS) {
    const path = normalizePath(item.href);
    if (existing.has(path)) continue;
    const link = document.createElement('a');
    link.href = item.href;
    link.setAttribute('data-i18n', item.i18n);
    link.textContent = translate(item.i18n, item.label);
    if (path === currentPath()) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
    block.appendChild(link);
    existing.add(path);
  }
}

function markActiveLinks(nav) {
  const here = currentPath();
  nav?.querySelectorAll('a[href]').forEach((link) => {
    const path = normalizePath(link.getAttribute('href') || '');
    const active = path === here;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function bindVacationToggle(header, toggle, nav) {
  if (!toggle || !nav || toggle.dataset.ibNavBound === '1') return;
  toggle.dataset.ibNavBound = '1';

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    setOpen(!nav.classList.contains('is-open'));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
}

function enhanceVerticalHeader(header) {
  if (!header) return;

  const toggle = header.querySelector(
    '.vacation-nav-toggle, .housing-nav-toggle'
  );
  const nav =
    header.querySelector('nav[id$="-nav"]') ||
    (toggle?.getAttribute('aria-controls')
      ? document.getElementById(toggle.getAttribute('aria-controls'))
      : null);

  if (nav) {
    ensureProductNavBlock(nav);
    markActiveLinks(nav);
  }

  bindVacationToggle(header, toggle, nav);
}

export function mountVerticalProductNav() {
  if (typeof document === 'undefined') return;

  const run = () => {
    document
      .querySelectorAll(
        '.vacation-header, .housing-header, .ib-vertical-header--auto, .ib-vertical-header--konut'
      )
      .forEach((header) => enhanceVerticalHeader(header));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  document.addEventListener('ib:locale-changed', run);
}
