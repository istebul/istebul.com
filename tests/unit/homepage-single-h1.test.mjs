import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '../..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const aiHtml = fs.readFileSync(path.join(root, 'ai/index.html'), 'utf8');
const platformLanding = fs.readFileSync(
  path.join(root, 'js/runtime/platform-shell-landing.js'),
  'utf8'
);
const prerenderScript = fs.readFileSync(
  path.join(root, 'scripts/lib/inject-premium-prerender.cjs'),
  'utf8'
);

const H1_OPEN = /<h1\b/gi;
const ROUTE_SHELL_IDS = [
  'page-karar-analizi',
  'page-metodoloji',
  'page-duyurular',
  'page-kampanyalar',
  'page-blog',
  'page-planlar'
];

function extractSection(html, sectionId) {
  const marker = `<section id="${sectionId}"`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `missing section ${sectionId}`);
  const openEnd = html.indexOf('>', start);
  const nextSection = html.indexOf('<section id=', openEnd + 1);
  const end = nextSection === -1 ? html.length : nextSection;
  return html.slice(start, end);
}

test('Platform root has no static H1; runtime PlatformHero owns H1', () => {
  const h1Matches = indexHtml.match(H1_OPEN) || [];
  assert.equal(h1Matches.length, 0, 'Platform Landing source must not ship a static h1');
  assert.match(indexHtml, /id="platform-landing"/);
  assert.match(platformLanding, /headingLevel:\s*1/);
  assert.match(platformLanding, /createPlatformHeroElement/);
});

test('AI Landing exposes exactly one static h1 for the product hero', () => {
  const h1Matches = aiHtml.match(H1_OPEN) || [];
  assert.equal(h1Matches.length, 1, 'AI Landing must contain a single static h1');
  assert.match(aiHtml, /<h1\b[^>]*id="hero-v4-title"/);
});

test('route shells outside Platform Landing do not contain h1 tags', () => {
  for (const sectionId of ROUTE_SHELL_IDS) {
    const sectionHtml = extractSection(indexHtml, sectionId);
    const sectionH1 = sectionHtml.match(H1_OPEN) || [];
    assert.equal(
      sectionH1.length,
      0,
      `${sectionId} must not contain h1 tags`
    );
  }
});

test('premium prerender generator emits h2 headings', () => {
  assert.doesNotMatch(prerenderScript, /<h1>\$\{escapeHtml\(data\.h1\)\}<\/h1>/);
  assert.match(prerenderScript, /<h2>\$\{escapeHtml\(data\.h1\)\}<\/h2>/);
});


test('production Platform Landing prerender emits one H1 and five catalog products', () => {
  const require = createRequire(import.meta.url);
  const { renderPlatformLandingMount } = require(
    '../../scripts/lib/render-platform-landing.cjs'
  );

  const markup = renderPlatformLandingMount();

  assert.equal((markup.match(/<h1\b/gi) || []).length, 1);
  assert.match(markup, /Yapay zekâ destekli dijital platform/);
  assert.match(markup, /data-platform-landing-mounted="1"/);

  for (const name of [
    'İSTEBUL AI',
    'GarsonAI',
    'İSTEBUL Business',
    'WarehouseIQ',
    'ParaAsistan'
  ]) {
    assert.ok(markup.includes(name), `Missing prerendered product: ${name}`);
  }

  assert.equal(
    (markup.match(/<li\b[^>]*data-platform-product-id=/g) || []).length,
    5,
    'Exactly five catalog product cards must be rendered'
  );

  assert.match(markup, /href="\/ai\/"/);
  assert.match(markup, /href="\/garson\/"/);
  assert.match(markup, /href="\/business-platform\/"/);
  assert.match(markup, /href="\/warehouseiq\/"/);
  assert.match(markup, /data-platform-product-status="beta"/);
  assert.match(markup, /Pilot/);
});
