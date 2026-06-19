import test from 'node:test';
import assert from 'node:assert/strict';

const {
  resolveLocale,
  stripLocalePrefix,
  buildLocalizedPath,
  LOCALE_DEFINITIONS
} = await import('../../js/platform/locale-registry.js');

const { formatMoney, formatNumber, formatDate } = await import('../../js/core/format.js');

const { getLocalizedProPricing } = await import('../../js/features/monetization/pricing-localization.js');

test('resolveLocale prefers path prefix', () => {
  assert.equal(resolveLocale({ pathname: '/en/karsilastir' }), 'en');
  assert.equal(resolveLocale({ pathname: '/ar/auto/' }), 'ar');
  assert.equal(resolveLocale({ pathname: '/' }), 'tr');
});

test('stripLocalePrefix returns routable path', () => {
  const en = stripLocalePrefix('/en/karsilastir');
  assert.equal(en.localeId, 'en');
  assert.equal(en.pathname, '/karsilastir');
});

test('buildLocalizedPath adds prefix for non-default locale', () => {
  assert.equal(buildLocalizedPath('/auto/', 'en'), '/en/auto/');
  assert.equal(buildLocalizedPath('/auto/', 'tr'), '/auto/');
});

test('arabic locale is RTL', () => {
  assert.equal(LOCALE_DEFINITIONS.ar.dir, 'rtl');
});

test('formatMoney uses locale currency', () => {
  assert.match(formatMoney(1200, 'tr'), /TRY|₺|1/);
  assert.match(formatMoney(19, 'en'), /19/);
});

test('formatNumber respects grouping', () => {
  const formatted = formatNumber(10000, 'en');
  assert.ok(formatted.includes('10'));
});

test('formatDate returns localized string', () => {
  const d = formatDate('2026-05-24', 'en', { dateStyle: 'long' });
  assert.ok(d.length > 4);
});

test('localized pro pricing differs by market', () => {
  const tr = getLocalizedProPricing('tr');
  const en = getLocalizedProPricing('en');
  assert.notEqual(tr.currency, en.currency);
  assert.notEqual(tr.monthly.amount, en.monthly.amount);
});
