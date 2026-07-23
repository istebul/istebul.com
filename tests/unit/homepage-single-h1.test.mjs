import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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
