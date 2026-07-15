/**
 * PR-560 — Homepage section visual IA (CSS flex order) + hash contracts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const EXPECTED_VISUAL_ORDER = [
  'platform-landing',
  'neden-istebul'
];

function orderOf(css, id) {
  const re = new RegExp(`#${id}\\s*\\{[^}]*order:\\s*(\\d+)`);
  const match = css.match(re);
  return match ? Number(match[1]) : null;
}

test('Platform Landing sections exist on index after cutover', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const id of EXPECTED_VISUAL_ORDER) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /id="hero-v4-title"/);
});

test('HOMEPAGE_SECTION_IDS list matches Platform Landing cutover', async () => {
  const { HOMEPAGE_SECTION_IDS, MARKETING_HASH_IDS } = await import(
    '../../js/core/router.js'
  );
  assert.deepEqual([...HOMEPAGE_SECTION_IDS], EXPECTED_VISUAL_ORDER);
  for (const id of EXPECTED_VISUAL_ORDER) {
    assert.ok(MARKETING_HASH_IDS.includes(id), `hash id missing: ${id}`);
  }
  assert.ok(MARKETING_HASH_IDS.includes('platform-products'));
});

test('index.html platform hashes and AI deep-links after cutover', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const id of EXPECTED_VISUAL_ORDER) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /id="hero-v4-title"/);
  assert.match(html, /href="\/ai\/#pricing"/);
  assert.match(html, /href="\/ai\/#how-it-works"/);
  assert.match(html, /href="\/ai\/#home-vertical-focus"/);
});
