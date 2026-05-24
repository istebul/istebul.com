import { translations } from './translations.js';
import { state } from '../../core/state.js';
import {
  getActiveLocale,
  setActiveLocale,
  applyDocumentLocale,
  buildLocalizedPath
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
    }

    setLanguage(lang) {
        if (!this.translations[lang]) return;
        this.currentLang = lang;
        writeStorageRaw(STORAGE_KEYS.LOCALE, lang);
        state.set('lang', lang);
        setActiveLocale(lang);
        applyDocumentLocale(lang);
    }

    /** Navigate to same page under another locale prefix */
    switchLanguage(lang) {
        if (!this.translations[lang]) return;
        const path = buildLocalizedPath(window.location.pathname.replace(/^\/(en|de|ar)/, '') || '/', lang);
        window.location.assign(path);
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

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.textContent = this.t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            el.placeholder = this.t(key);
        });

        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.dataset.i18nAria;
            el.setAttribute('aria-label', this.t(key));
        });
    }
}

export const i18n = new I18nManager();
export default i18n;
