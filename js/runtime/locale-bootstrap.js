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

export function mountLocaleSwitcher(containerId = 'locale-switcher') {
  const root = document.getElementById(containerId);
  if (!root) return;

  import('../platform/locale-registry.js').then(({ listPublicLocales, getActiveLocale: getLocale }) => {
    const active = getLocale();
    root.innerHTML = listPublicLocales()
      .map(
        (loc) =>
          `<button type="button" class="locale-switcher-btn${loc.id === active ? ' is-active' : ''}" data-locale="${loc.id}" lang="${loc.id}" aria-current="${loc.id === active ? 'true' : 'false'}">${loc.label}</button>`
      )
      .join('');

    root.querySelectorAll('[data-locale]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.locale;
        if (next && next !== getLocale()) switchLocale(next);
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
