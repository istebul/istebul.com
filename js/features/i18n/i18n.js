import { translations } from './translations.js';
import { state } from '../../core/state.js';
import {
  getActiveLocale,
  setActiveLocale,
  applyDocumentLocale,
  buildLocalizedPath,
  stripLocalePrefix
} from '../../platform/locale-registry.js';
import { writeStorageRaw, STORAGE_KEYS } from '../../core/storage-keys.js';

export class I18nManager {
  constructor() {
    this.currentLang = getActiveLocale();
    this.translations = translations;
    this.init();
  }

  init() {
    this.applyTranslations();
    state.subscribe('lang', (lang) => {
      this.currentLang = lang;
      setActiveLocale(lang);
      applyDocumentLocale(lang);
      this.applyTranslations();
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('ib:locale-changed', (event) => {
        const lang = event.detail?.localeId;
        if (lang && this.translations[lang]) {
          this.currentLang = lang;
          this.applyTranslations();
        }
      });
      document.addEventListener('routeChanged', () => {
        this.applyTranslations();
      });
    }
  }

  setLanguage(lang) {
    if (!this.translations[lang]) return;
    this.currentLang = lang;
    writeStorageRaw(STORAGE_KEYS.LOCALE, lang);
    state.set('lang', lang);
    setActiveLocale(lang);
    applyDocumentLocale(lang);
    this.applyTranslations();
  }

  switchLanguage(lang) {
    if (!this.translations[lang]) return;
    const { pathname } = stripLocalePrefix(window.location.pathname);
    const target = buildLocalizedPath(pathname, lang);
    this.setLanguage(lang);
    if (typeof window !== 'undefined' && window.location.pathname !== target) {
      window.history.replaceState(null, '', target + window.location.search + window.location.hash);
    }
    document.dispatchEvent(new CustomEvent('ib:locale-changed', { detail: { localeId: lang } }));
  }

  t(key, vars = {}) {
    const keys = key.split('.');
    let result = this.translations[this.currentLang];
    for (const k of keys) {
      result = result?.[k];
    }
    if (typeof result !== 'string') return key;
    return result.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
  }

  applyTranslations() {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') {
      return;
    }

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (key) el.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.dataset.i18nHtml;
      if (key) el.innerHTML = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (key) el.placeholder = this.t(key);
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.dataset.i18nAria;
      if (key) el.setAttribute('aria-label', this.t(key));
    });

    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.dataset.i18nTitle;
      if (key) el.title = this.t(key);
    });

    const titleKey = document.documentElement.dataset.i18nTitle;
    if (titleKey) {
      document.title = this.t(titleKey);
    }
  }
}

export const i18n = new I18nManager();

if (typeof window !== 'undefined') {
  window.__ibI18n = i18n;
}

export default i18n;
