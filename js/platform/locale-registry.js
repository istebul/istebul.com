/**
 * Global locale registry — single source for routing, formatting, RTL, SEO, pricing.
 */

export const DEFAULT_LOCALE = 'tr';

/** @typedef {'ltr' | 'rtl'} TextDirection */

/**
 * @typedef {Object} LocaleDefinition
 * @property {string} id
 * @property {string} bcp47
 * @property {string} label
 * @property {string} pathPrefix
 * @property {TextDirection} dir
 * @property {string} currency
 * @property {string} ogLocale
 * @property {string} hreflang
 * @property {boolean} default
 */

export const LOCALE_DEFINITIONS = Object.freeze({
  tr: {
    id: 'tr',
    bcp47: 'tr-TR',
    label: 'Türkçe',
    pathPrefix: '',
    dir: 'ltr',
    currency: 'TRY',
    ogLocale: 'tr_TR',
    hreflang: 'tr',
    default: true
  },
  en: {
    id: 'en',
    bcp47: 'en-US',
    label: 'English',
    pathPrefix: '/en',
    dir: 'ltr',
    currency: 'USD',
    ogLocale: 'en_US',
    hreflang: 'en',
    default: false
  },
  de: {
    id: 'de',
    bcp47: 'de-DE',
    label: 'Deutsch',
    pathPrefix: '/de',
    dir: 'ltr',
    currency: 'EUR',
    ogLocale: 'de_DE',
    hreflang: 'de',
    default: false
  },
  ar: {
    id: 'ar',
    bcp47: 'ar-SA',
    label: 'العربية',
    pathPrefix: '/ar',
    dir: 'rtl',
    currency: 'SAR',
    ogLocale: 'ar_SA',
    hreflang: 'ar',
    default: false
  },
  it: {
    id: 'it',
    bcp47: 'it-IT',
    label: 'Italiano',
    pathPrefix: '/it',
    dir: 'ltr',
    currency: 'EUR',
    ogLocale: 'it_IT',
    hreflang: 'it',
    default: false
  },
  fr: {
    id: 'fr',
    bcp47: 'fr-FR',
    label: 'Français',
    pathPrefix: '/fr',
    dir: 'ltr',
    currency: 'EUR',
    ogLocale: 'fr_FR',
    hreflang: 'fr',
    default: false
  },
  es: {
    id: 'es',
    bcp47: 'es-ES',
    label: 'Español',
    pathPrefix: '/es',
    dir: 'ltr',
    currency: 'EUR',
    ogLocale: 'es_ES',
    hreflang: 'es',
    default: false
  },
  ja: {
    id: 'ja',
    bcp47: 'ja-JP',
    label: '日本語',
    pathPrefix: '/ja',
    dir: 'ltr',
    currency: 'JPY',
    ogLocale: 'ja_JP',
    hreflang: 'ja',
    default: false
  },
  zh: {
    id: 'zh',
    bcp47: 'zh-CN',
    label: '中文',
    pathPrefix: '/zh',
    dir: 'ltr',
    currency: 'CNY',
    ogLocale: 'zh_CN',
    hreflang: 'zh',
    default: false
  }
});

export const LOCALE_IDS = Object.freeze(Object.keys(LOCALE_DEFINITIONS));

const PATH_PREFIX_TO_LOCALE = Object.fromEntries(
  LOCALE_IDS.map((id) => [LOCALE_DEFINITIONS[id].pathPrefix || '/', id])
);

let activeLocaleId = DEFAULT_LOCALE;

export function getLocaleDefinition(localeId = activeLocaleId) {
  return LOCALE_DEFINITIONS[localeId] || LOCALE_DEFINITIONS[DEFAULT_LOCALE];
}

export function getActiveLocale() {
  return activeLocaleId;
}

export function setActiveLocale(localeId) {
  if (!LOCALE_DEFINITIONS[localeId]) return getLocaleDefinition();
  activeLocaleId = localeId;
  return getLocaleDefinition(localeId);
}

/**
 * Resolve locale from URL path segment, query, storage, or Accept-Language.
 */
export function resolveLocale({
  pathname = '/',
  search = '',
  stored = '',
  acceptLanguage = ''
} = {}) {
  const pathLocale = localeFromPathname(pathname);
  if (pathLocale) return pathLocale;

  const params = new URLSearchParams(search);
  const queryLang = params.get('lang');
  if (queryLang && LOCALE_DEFINITIONS[queryLang]) return queryLang;

  if (stored && LOCALE_DEFINITIONS[stored]) return stored;

  const headerTag = String(acceptLanguage || '').split(',')[0]?.trim().toLowerCase();
  if (headerTag) {
    if (headerTag.startsWith('zh')) return 'zh';
    if (headerTag.startsWith('ja')) return 'ja';
    const short = headerTag.slice(0, 2);
    if (LOCALE_DEFINITIONS[short]) return short;
  }

  return DEFAULT_LOCALE;
}

export function localeFromPathname(pathname = '/') {
  const normalized = pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  for (const [prefix, id] of Object.entries(PATH_PREFIX_TO_LOCALE)) {
    if (prefix === '/') continue;
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return id;
    }
  }
  return null;
}

/**
 * Strip locale prefix for SPA routing.
 * @returns {{ pathname: string, localeId: string }}
 */
export function stripLocalePrefix(pathname = '/') {
  const localeId = localeFromPathname(pathname) || DEFAULT_LOCALE;
  const def = getLocaleDefinition(localeId);
  let path = pathname.replace(/\/index\.html$/, '') || '/';

  if (def.pathPrefix && (path === def.pathPrefix || path.startsWith(`${def.pathPrefix}/`))) {
    path = path.slice(def.pathPrefix.length) || '/';
  }

  if (!path.startsWith('/')) path = `/${path}`;
  return { pathname: path.replace(/\/$/, '') || '/', localeId };
}

export function buildLocalizedPath(path = '/', localeId = activeLocaleId) {
  const def = getLocaleDefinition(localeId);
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (!def.pathPrefix) return clean === '/' ? '/' : clean;
  if (clean === '/') return `${def.pathPrefix}/`;
  return `${def.pathPrefix}${clean}`;
}

export function applyDocumentLocale(localeId = activeLocaleId) {
  if (typeof document === 'undefined') return;
  const def = getLocaleDefinition(localeId);
  document.documentElement.lang = def.id;
  document.documentElement.dir = def.dir;
  document.documentElement.dataset.locale = def.id;
  document.documentElement.dataset.currency = def.currency;
  if (def.dir === 'rtl') {
    document.documentElement.classList.add('ib-rtl');
  } else {
    document.documentElement.classList.remove('ib-rtl');
  }
}

export function listPublicLocales() {
  return LOCALE_IDS.map((id) => getLocaleDefinition(id));
}
