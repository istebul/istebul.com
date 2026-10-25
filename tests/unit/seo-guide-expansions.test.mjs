import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  mergeGuidePage,
  estimatePageWords
} = require('../../scripts/lib/seo-guide-expansions.cjs');

const raw = JSON.parse(
  fs.readFileSync('data/seo/landing-pages.json', 'utf8')
);
const pages = Array.isArray(raw) ? raw : (raw.pages || []);

const housingSource = pages.find(
  page => page.slug === 'konut-karar-rehberi'
);
const carSource = pages.find(
  page => page.slug === 'suv-mi-sedan-mi'
);

assert.ok(housingSource, 'Konut rehberi kaynak verisi bulunmalı');
assert.ok(carSource, 'Mevcut SUV rehberi kaynak verisi bulunmalı');

const housing = mergeGuidePage(housingSource);
const car = mergeGuidePage(carSource);

test('Konut rehberi en az 1.200 kelimelik hedefi karşılar', () => {
  assert.ok(
    estimatePageWords(housing) >= 1200,
    `Konut rehberi kelime tahmini: ${estimatePageWords(housing)}`
  );
});

test('Konut rehberinin ilgili bağlantıları otomotiv sayfalarına gitmez', () => {
  assert.deepEqual(housing.related, []);
});

test('Konut içeriğinde otomotiv metni kalmaz', () => {
  const { related, ...contentOnly } = housing;
  const content = JSON.stringify(contentOnly);
  const automotive =
    /isteBul Auto|test sürüşü|Tramer|\bMTV\b|bayi|kilometre|yakıt|arac-alim-karar-asistani/i;

  assert.doesNotMatch(content, automotive);
});

test('Konut rehberinde konuta özgü içerik ve SSS bulunur', () => {
  const sectionHeadings = housing.sections.map(section => section.heading);
  const faqText = JSON.stringify(housing.faqs);

  assert.ok(
    sectionHeadings.includes('Tapu ve taşınmazın hukuki durumu')
  );
  assert.ok(
    sectionHeadings.includes('Deprem güvenliği, DASK ve konut sigortası')
  );
  assert.match(faqText, /DASK/i);
  assert.match(faqText, /Konut kredilerini/i);
});

test('Konut için yapılan özel işlem diğer araç rehberlerini bozmaz', () => {
  const { related, ...carContent } = car;
  assert.match(
    JSON.stringify(carContent),
    /yakıt|test sürüşü|araç|otomotiv|isteBul Auto/i
  );
});
