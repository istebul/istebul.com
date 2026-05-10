import { translations } from './translations.js';
import { state } from '../../core/state.js';

export class I18nManager {
    constructor() {
        this.currentLang = localStorage.getItem('lang') || 'tr';
        this.translations = translations;
        this.init();
    }

    init() {
        this.applyTranslations();
        state.subscribe('lang', (lang) => {
            this.currentLang = lang;
            this.applyTranslations();
        });
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('lang', lang);
            state.set('lang', lang);
        }
    }

    t(key) {
        const keys = key.split('.');
        let result = this.translations[this.currentLang];
        for (const k of keys) {
            result = result?.[k];
        }
        return result || key;
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
    }
}

export const i18n = new I18nManager();
export default i18n;
