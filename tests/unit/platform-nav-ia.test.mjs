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

test('platform products menu lists AI, GarsonAI, Business and WarehouseIQ with existing URLs', () => {
  const platform = sectionBetween('id="nav-platform-list"', 'id="nav-product-menu"');
  assert.match(platform, /href="\/ai\/"/);
  assert.match(platform, /href="\/garson\/"/);
  assert.match(platform, /href="\/business\/"/);
  assert.match(platform, /href="\/warehouse\/"/);
  assert.match(platform, /İSTEBUL AI|ISTEBUL AI/);
  assert.match(platform, /GarsonAI/);
  assert.match(platform, /İSTEBUL Business|ISTEBUL Business/);
  assert.match(platform, /WarehouseIQ/);
});

test('decision categories menu excludes non-decision platform products', () => {
  const categories = sectionBetween('id="nav-product-list"', 'id="nav-more-menu"');
  assert.doesNotMatch(categories, /GarsonAI/);
  assert.doesNotMatch(categories, /\/garson\//);
  assert.doesNotMatch(categories, /\/business\//);
  assert.doesNotMatch(categories, /WarehouseIQ/);
  assert.doesNotMatch(categories, /\/warehouse\//);
  assert.match(categories, /href="\/auto\/"/);
  assert.match(categories, /href="\/konut\/"/);
});

test('SEO contracts: Platform Landing owns root, AI H1 not on index', () => {
  assert.doesNotMatch(html, /id="hero-v4-title"/);
  assert.match(html, /id="platform-landing"/);
  assert.match(html, /id="neden-istebul"/);
  assert.match(
    html,
    /name="description"[^>]*content="[^"]*İSTEBUL/
  );
  assert.match(html, /src="\/data\/schema\/platform-graph\.json"/);
});

test('marketing copy exposes platform product IA keys for tr', async () => {
  const { marketingCopy } = await import('../../js/features/i18n/marketing-copy.js');
  assert.equal(marketingCopy.tr.nav.products, 'Ürünler');
  assert.equal(marketingCopy.tr.nav.decisionCategories, 'Karar Kategorileri');
  assert.equal(marketingCopy.tr.nav.productGarson, 'GarsonAI');
  assert.equal(marketingCopy.en.nav.products, 'Products');
  assert.ok(marketingCopy.en.nav.decisionCategories);
});
