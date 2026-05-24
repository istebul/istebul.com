/**
 * Early locale bootstrap — path, query, storage, Accept-Language.
 */
import {
  resolveLocale,
  setActiveLocale,
  applyDocumentLocale,
  buildLocalizedPath,
  stripLocalePrefix
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
  setActiveLocale(localeId);
  applyDocumentLocale(localeId);
  writeStorageRaw(STORAGE_KEYS.LOCALE, localeId);

  const { pathname } = stripLocalePrefix(window.location.pathname);
  const target = buildLocalizedPath(pathname, localeId);
  window.location.assign(target + window.location.search + window.location.hash);
}

export function mountLocaleSwitcher(containerId = 'locale-switcher') {
  const root = document.getElementById(containerId);
  if (!root) return;

  import('../platform/locale-registry.js').then(({ listPublicLocales, getActiveLocale }) => {
    const active = getActiveLocale();
    root.innerHTML = listPublicLocales()
      .map(
        (loc) =>
          `<button type="button" class="locale-switcher-btn${loc.id === active ? ' is-active' : ''}" data-locale="${loc.id}" lang="${loc.id}" aria-current="${loc.id === active ? 'true' : 'false'}">${loc.label}</button>`
      )
      .join('');

    root.querySelectorAll('[data-locale]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.locale;
        if (next && next !== getActiveLocale()) switchLocale(next);
      });
    });
  });
}

bootstrapLocale();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => mountLocaleSwitcher('locale-switcher'));
}
