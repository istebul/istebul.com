import test from 'node:test';
import assert from 'node:assert/strict';

const { translations } = await import('../../js/features/i18n/translations.js');

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
  'vertical.konutHeroTitle'
];

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

for (const localeId of ['tr', 'en', 'de', 'ar']) {
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
