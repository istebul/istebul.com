import test from 'node:test';
import assert from 'node:assert/strict';

const { translations } = await import('../../js/features/i18n/translations.js');

const LOCALE_IDS = ['tr', 'en', 'de', 'ar', 'it', 'fr', 'es', 'ja', 'zh'];

const REQUIRED_KEYS = [
  'nav.products',
  'nav.resources',
  'footer.newsletterTitle',
  'footer.consentHtml',
  'footer.cookieHtml',
  'footer.copyright',
  'home.heroTitle',
  'features.stripAria',
  'categories.araba.name',
  'categories.kasko.name',
  'home.analyzeAction',
  'pricing.kicker',
  'faq.q0',
  'footerNav.products',
];

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

for (const localeId of LOCALE_IDS) {
  test(`marketing copy includes required keys for ${localeId}`, () => {
    const locale = translations[localeId];
    assert.ok(locale, `missing locale ${localeId}`);
    for (const key of REQUIRED_KEYS) {
      const value = getNested(locale, key);
      assert.equal(typeof value, 'string', `${localeId}.${key} should be a string`);
      assert.ok(value.length > 0, `${localeId}.${key} should not be empty`);
    }
  });
}
