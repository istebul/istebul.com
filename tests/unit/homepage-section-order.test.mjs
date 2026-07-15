/**
 * PR-560 — Homepage section visual IA (CSS flex order) + hash contracts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const EXPECTED_VISUAL_ORDER = [
  'platform-shell-home',
  'home',
  'home-vertical-focus',
  'how-it-works',
  'home-features-strip',
  'pricing',
  'home-economic-indicators',
  'partner-enterprise',
  'landing-faq',
  'home-guides-strip'
];

function orderOf(css, id) {
  const re = new RegExp(`#${id}\\s*\\{[^}]*order:\\s*(\\d+)`);
  const match = css.match(re);
  return match ? Number(match[1]) : null;
}

test('premium CSS encodes PR-560 homepage visual section order', () => {
  const css = fs.readFileSync(
    path.join(root, 'css/istebul-premium-final-v7.css'),
    'utf8'
  );

  const orders = EXPECTED_VISUAL_ORDER.map((id) => {
    const value = orderOf(css, id);
    assert.ok(Number.isFinite(value), `missing flex order for #${id}`);
    return { id, value };
  });

  for (let i = 1; i < orders.length; i += 1) {
    assert.ok(
      orders[i - 1].value < orders[i].value,
      `${orders[i - 1].id} (${orders[i - 1].value}) must precede ${orders[i].id} (${orders[i].value})`
    );
  }
});

test('HOMEPAGE_SECTION_IDS list order matches PR-560 IA', async () => {
  const { HOMEPAGE_SECTION_IDS, MARKETING_HASH_IDS } = await import(
    '../../js/core/router.js'
  );
  assert.deepEqual([...HOMEPAGE_SECTION_IDS], EXPECTED_VISUAL_ORDER);
  for (const id of EXPECTED_VISUAL_ORDER) {
    assert.ok(MARKETING_HASH_IDS.includes(id), `hash id missing: ${id}`);
  }
  assert.ok(MARKETING_HASH_IDS.includes('platform-products'));
});

test('index.html keeps marketing hashes and does not remove sections', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const id of EXPECTED_VISUAL_ORDER) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="hero-v4-title"/);
  assert.match(html, /href="\/#pricing"/);
  assert.match(html, /href="\/#landing-faq"|href="#landing-faq"/);
  assert.match(html, /href="\/#how-it-works"|data-home-anchor="how-it-works"/);
  assert.match(html, /href="\/#home-vertical-focus"|data-home-anchor="home-vertical-focus"/);
});
