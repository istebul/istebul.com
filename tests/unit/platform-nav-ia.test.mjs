/**
 * PR-552 — Platform gezinme bilgi mimarisi sözleşmesi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function sectionBetween(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + 1);
  assert.ok(start >= 0, `missing ${startMarker}`);
  assert.ok(end > start, `missing end after ${startMarker}`);
  return html.slice(start, end);
}

test('platform products menu lists AI, GarsonAI, Business with existing URLs', () => {
  const platform = sectionBetween('id="nav-platform-list"', 'id="nav-product-menu"');
  assert.match(platform, /href="\/"/);
  assert.match(platform, /href="\/garson\/"/);
  assert.match(platform, /href="\/business\/"/);
  assert.match(platform, /İSTEBUL AI|ISTEBUL AI/);
  assert.match(platform, /GarsonAI/);
  assert.match(platform, /İSTEBUL Business|ISTEBUL Business/);
});

test('decision categories menu excludes GarsonAI and Business', () => {
  const categories = sectionBetween('id="nav-product-list"', 'id="nav-more-menu"');
  assert.doesNotMatch(categories, /GarsonAI/);
  assert.doesNotMatch(categories, /\/garson\//);
  assert.doesNotMatch(categories, /\/business\//);
  assert.match(categories, /href="\/auto\/"/);
  assert.match(categories, /href="\/konut\/"/);
});

test('SEO contracts untouched: H1, meta description, home schema script', () => {
  assert.match(html, /id="hero-v4-title"/);
  assert.match(
    html,
    /Büyük kararları verirken <span class="ib-hero-gradient-text">yalnız değilsiniz\.<\/span>/
  );
  assert.match(
    html,
    /name="description"[^>]*content="Araba, konut, tatil, finansman ve sigorta kararlarında/
  );
  assert.match(html, /src="\/data\/schema\/home-graph\.json"/);
});

test('marketing copy exposes platform product IA keys for tr', async () => {
  const { marketingCopy } = await import('../../js/features/i18n/marketing-copy.js');
  assert.equal(marketingCopy.tr.nav.products, 'Ürünler');
  assert.equal(marketingCopy.tr.nav.decisionCategories, 'Karar Kategorileri');
  assert.equal(marketingCopy.tr.nav.productGarson, 'GarsonAI');
  assert.equal(marketingCopy.en.nav.products, 'Products');
  assert.ok(marketingCopy.en.nav.decisionCategories);
});
