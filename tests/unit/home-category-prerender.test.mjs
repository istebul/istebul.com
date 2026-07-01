import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { injectHomeCategoryPrerender } = require('../../scripts/lib/inject-home-category-prerender.cjs');

const EMPTY_GRID_HTML = `
<section id="home-vertical-focus">
  <div class="ib-category-showcase-grid" id="home-category-grid" aria-live="polite"></div>
</section>
`;

const EXPECTED_ORDER = ['araba', 'tatil', 'konut', 'finansman', 'sigorta', 'kasko'];

const EXPECTED_HREFS = Object.freeze({
  araba: '/auto/',
  tatil: '/tatil/',
  konut: '/konut/',
  finansman: '/finans/',
  sigorta: '/sigorta/',
  kasko: '/kasko/'
});

function extractCategoryIds(html) {
  const matches = [...html.matchAll(/data-category-id="([^"]+)"/g)];
  return matches.map((match) => match[1]);
}

function extractCardHrefs(html) {
  const cards = [...html.matchAll(/<a\b[^>]*data-category-id="([^"]+)"[^>]*>/g)];
  return Object.fromEntries(
    cards.map((match) => {
      const hrefMatch = match[0].match(/href="([^"]+)"/);
      return [match[1], hrefMatch?.[1]];
    })
  );
}

function extractImageLoading(html) {
  return [...html.matchAll(/<img\b[^>]*loading="([^"]+)"[^>]*fetchpriority="([^"]+)"/g)].map(
    (match) => ({ loading: match[1], fetchPriority: match[2] })
  );
}

test('injectHomeCategoryPrerender fills empty #home-category-grid', async () => {
  const output = await injectHomeCategoryPrerender(EMPTY_GRID_HTML);

  assert.match(output, /id="home-category-grid"/);
  assert.match(output, /class="ib-cat-mockup-shell"/);
});

test('injectHomeCategoryPrerender emits six active category cards in display order', async () => {
  const output = await injectHomeCategoryPrerender(EMPTY_GRID_HTML);
  const ids = extractCategoryIds(output);

  assert.equal(ids.length, 6);
  assert.deepEqual(ids, EXPECTED_ORDER);
});

test('injectHomeCategoryPrerender uses canonical vertical hrefs', async () => {
  const output = await injectHomeCategoryPrerender(EMPTY_GRID_HTML);
  const hrefs = extractCardHrefs(output);

  assert.deepEqual(hrefs, EXPECTED_HREFS);
});

test('injectHomeCategoryPrerender uses h3 titles and no h1 tags', async () => {
  const output = await injectHomeCategoryPrerender(EMPTY_GRID_HTML);

  assert.doesNotMatch(output, /<h1\b/i);
  assert.match(output, /<h3 class="ib-cat-mockup__title">/);
  assert.equal((output.match(/<h3 class="ib-cat-mockup__title">/g) || []).length, 6);
});

test('injectHomeCategoryPrerender marks output with data-home-category-prerender', async () => {
  const output = await injectHomeCategoryPrerender(EMPTY_GRID_HTML);

  assert.match(output, /data-home-category-prerender="1"/);
});

test('injectHomeCategoryPrerender is idempotent on repeated calls', async () => {
  const first = await injectHomeCategoryPrerender(EMPTY_GRID_HTML);
  const second = await injectHomeCategoryPrerender(first);

  assert.equal(second, first);
  assert.equal(extractCategoryIds(second).length, 6);
  assert.equal((second.match(/data-home-category-prerender="1"/g) || []).length, 1);
});

test('injectHomeCategoryPrerender throws when grid marker is missing', async () => {
  await assert.rejects(
    () => injectHomeCategoryPrerender('<div id="other-grid"></div>'),
    /Home category grid mount not found/
  );
});

test('injectHomeCategoryPrerender includes live list shell with role=list', async () => {
  const output = await injectHomeCategoryPrerender(EMPTY_GRID_HTML);

  assert.match(output, /class="ib-cat-mockup-shell__live" role="list"/);
});

test('injectHomeCategoryPrerender sets eager/high for first two images and lazy for others', async () => {
  const output = await injectHomeCategoryPrerender(EMPTY_GRID_HTML);
  const images = extractImageLoading(output);

  assert.equal(images.length, 6);
  assert.deepEqual(images[0], { loading: 'eager', fetchPriority: 'high' });
  assert.deepEqual(images[1], { loading: 'eager', fetchPriority: 'high' });
  assert.deepEqual(images[2], { loading: 'lazy', fetchPriority: 'low' });
  assert.deepEqual(images[3], { loading: 'lazy', fetchPriority: 'low' });
  assert.deepEqual(images[4], { loading: 'lazy', fetchPriority: 'low' });
  assert.deepEqual(images[5], { loading: 'lazy', fetchPriority: 'low' });
});
