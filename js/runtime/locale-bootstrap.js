/**
 * Early locale bootstrap — path, query, storage, Accept-Language.
 */
import {
  resolveLocale,
  setActiveLocale,
  applyDocumentLocale,
  buildLocalizedPath,
  stripLocalePrefix,
  getActiveLocale
} from '../platform/locale-registry.js';
import { readStorageRaw, writeStorageRaw, STORAGE_KEYS } from '../core/storage-keys.js';

function readStoredLocale() {
  try {
    return readStorageRaw(STORAGE_KEYS.LOCALE) || '';
  } catch {
    return '';
  }
}

export function bootstrapLocale() {
  if (typeof window === 'undefined') return 'tr';

  const localeId = resolveLocale({
    pathname: window.location.pathname,
    search: window.location.search,
    stored: readStoredLocale(),
    acceptLanguage: navigator.language || ''
  });

  setActiveLocale(localeId);
  applyDocumentLocale(localeId);
  writeStorageRaw(STORAGE_KEYS.LOCALE, localeId);

  return localeId;
}

export function switchLocale(localeId) {
  if (!localeId || localeId === getActiveLocale()) return;

  setActiveLocale(localeId);
  applyDocumentLocale(localeId);
  writeStorageRaw(STORAGE_KEYS.LOCALE, localeId);

  const { pathname } = stripLocalePrefix(window.location.pathname);
  const target = buildLocalizedPath(pathname, localeId);
  const nextUrl = target + window.location.search + window.location.hash;

  const applyClientI18n = () => {
    if (window.__ibI18n?.setLanguage) {
      window.__ibI18n.setLanguage(localeId);
    }
    document.dispatchEvent(new CustomEvent('ib:locale-changed', { detail: { localeId } }));
    mountLocaleSwitcher('locale-switcher');
  };

  const isVerticalLocaleShell =
    document.body?.classList.contains('housing-page') ||
    document.body?.classList.contains('ib-auto') ||
    document.body?.classList.contains('vacation-page');

  // SPA shell or vertical pages with i18n — soft switch without full reload
  if (document.getElementById('main-content') || isVerticalLocaleShell) {
    if (window.location.pathname !== target) {
      window.history.replaceState(null, '', nextUrl);
    }
    applyClientI18n();
    return;
  }

  if (window.location.pathname + window.location.search + window.location.hash !== nextUrl) {
    window.location.assign(nextUrl);
    return;
  }

  applyClientI18n();
}

let localeMenuDocListenerBound = false;

function closeLocaleMenu(root) {
  const menu = root.querySelector('.locale-switcher-menu');
  const toggle = root.querySelector('.locale-switcher-more');
  if (menu) {
    menu.hidden = true;
    menu.classList.remove('is-open');
  }
  toggle?.setAttribute('aria-expanded', 'false');
}

function openLocaleMenu(root) {
  const menu = root.querySelector('.locale-switcher-menu');
  const toggle = root.querySelector('.locale-switcher-more');
  if (menu) {
    menu.hidden = false;
    menu.classList.add('is-open');
  }
  toggle?.setAttribute('aria-expanded', 'true');
}

function bindLocaleMenuDismiss() {
  if (localeMenuDocListenerBound) return;
  localeMenuDocListenerBound = true;
  document.addEventListener('click', (event) => {
    const root = document.getElementById('locale-switcher');
    if (!root || root.contains(event.target)) return;
    closeLocaleMenu(root);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const root = document.getElementById('locale-switcher');
    if (root) closeLocaleMenu(root);
  });
}

export function mountLocaleSwitcher(containerId = 'locale-switcher') {
  const root = document.getElementById(containerId);
  if (!root) return;

  import('../platform/locale-registry.js').then(({ listPublicLocales, getActiveLocale: getLocale }) => {
    const active = getLocale();
    const locales = listPublicLocales();
    const activeDef = locales.find((loc) => loc.id === active) || locales[0];
    const others = locales.filter((loc) => loc.id !== active);
    const otherLabel = window.__ibI18n?.t('meta.otherLanguages') || 'Other languages';

    root.innerHTML = `
      <div class="locale-switcher-compact">
        <button type="button" class="locale-switcher-btn is-active" data-locale="${activeDef.id}" lang="${activeDef.id}" aria-current="true">${activeDef.label}</button>
        <div class="locale-switcher-dropdown">
          <button type="button" class="locale-switcher-more" aria-expanded="false" aria-controls="locale-switcher-menu" data-i18n="meta.otherLanguages">${otherLabel}</button>
          <div class="locale-switcher-menu" id="locale-switcher-menu" hidden role="menu">
            ${others
              .map(
                (loc) =>
                  `<button type="button" class="locale-switcher-btn" role="menuitem" data-locale="${loc.id}" lang="${loc.id}">${loc.label}</button>`
              )
              .join('')}
          </div>
        </div>
      </div>`;

    bindLocaleMenuDismiss();

    const toggle = root.querySelector('.locale-switcher-more');
    const menu = root.querySelector('.locale-switcher-menu');

    toggle?.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeLocaleMenu(root);
      } else {
        openLocaleMenu(root);
      }
    });

    root.querySelectorAll('.locale-switcher-menu [data-locale]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const next = btn.dataset.locale;
        if (next && next !== getLocale()) switchLocale(next);
        closeLocaleMenu(root);
      });
    });
  });
}

bootstrapLocale();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    mountLocaleSwitcher('locale-switcher');
    if (window.__ibI18n?.applyTranslations) {
      window.__ibI18n.applyTranslations();
    }
  });
}
