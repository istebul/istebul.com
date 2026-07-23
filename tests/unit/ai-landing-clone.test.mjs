/**
 * PR-566 — İSTEBUL AI Landing Clone sözleşmesi.
 * Paralel yüzey: `/ai` home AI deneyimini klonlar; `/` SEO/trafik değişmez.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const aiHtml = fs.readFileSync(path.join(root, 'ai/index.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const previewHtml = fs.readFileSync(path.join(root, 'platform-preview/index.html'), 'utf8');

const CLONED_SECTION_IDS = [
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

test('AI clone page keeps noindex and product markers', () => {
  assert.match(aiHtml, /data-ai-landing-clone="1"/);
  assert.match(aiHtml, /data-ib-ai-landing="clone"/);
  assert.match(aiHtml, /name="robots"[^>]*content="index, follow/);
  assert.match(aiHtml, /rel="canonical"[^>]*href="https:\/\/www\.istebul\.com\/ai\/"/);
  assert.match(aiHtml, /js\/ai\/ai-landing-boot\.js/);
  assert.match(aiHtml, /css\/ai\/ai-landing-clone\.css/);
});

test('AI clone includes all EPIC marketing sections + sticky CTA', () => {
  for (const id of CLONED_SECTION_IDS) {
    assert.match(aiHtml, new RegExp(`id="${id}"`));
  }
  assert.match(aiHtml, /id="hero-v4-title"/);
  assert.match(aiHtml, /id="home-category-grid"/);
  assert.match(aiHtml, /id="pricing-plans-root"/);
  assert.match(aiHtml, /id="home-economic-indicators-mount"/);
  assert.match(aiHtml, /data-guides-inner/);
  assert.match(aiHtml, /class="cro-sticky-cta"/);
  assert.match(aiHtml, /cta_decision_sticky/);
});

test('AI clone preserves hero H1 and primary CTA targets', () => {
  assert.match(
    aiHtml,
    /Büyük kararları verirken <span class="ib-hero-gradient-text">yalnız değilsiniz\.<\/span>/
  );
  assert.match(aiHtml, /href="\/karar-asistani\/"[^>]*data-analytics-cta="cta_decision_hero"/);
  assert.match(aiHtml, /href="\/karar-asistani\/"[^>]*data-analytics-cta="cta_decision_pricing"/);
});

test('AI clone adapts in-page hash links to /ai surface', () => {
  assert.match(aiHtml, /href="#how-it-works"/);
  assert.match(aiHtml, /href="#home-vertical-focus"/);
  assert.doesNotMatch(aiHtml, /href="\/#how-it-works"/);
});

test('root is Platform Landing; AI SEO lives on /ai after cutover', () => {
  assert.match(indexHtml, /id="platform-landing"/);
  assert.match(
    indexHtml,
    /rel="canonical"[^>]*href="https:\/\/www\.istebul\.com\/"/
  );
  assert.match(indexHtml, /src="\/data\/schema\/platform-graph\.json"/);
  assert.doesNotMatch(indexHtml, /data-ai-landing-clone/);
  assert.doesNotMatch(indexHtml, /id="hero-v4-title"/);

  assert.match(previewHtml, /data-platform-landing-preview="1"/);
  assert.doesNotMatch(previewHtml, /data-ai-landing-clone/);
});

test('sitemap advertises /ai after SEO cutover; robots stay allow-all', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert.match(sitemap, /istebul\.com\/ai\/?/);
  assert.match(robots, /Allow:\s*\//);
});

test('build wires AI landing boot bundle separately from platform preview', () => {
  const build = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
  assert.match(build, /ai-landing-boot\.js/);
  assert.match(build, /platform-shell-preview\.js/);
  assert.ok(fs.existsSync(path.join(root, 'js/ai/ai-landing-boot.js')));
  assert.ok(fs.existsSync(path.join(root, 'css/ai/ai-landing-clone.css')));
});

test('ai-landing-boot wires shared home hydrators (no platform shell import)', () => {
  const boot = fs.readFileSync(path.join(root, 'js/ai/ai-landing-boot.js'), 'utf8');
  assert.match(boot, /export async function initAiLandingClone/);
  assert.match(boot, /initHomeCategories/);
  assert.match(boot, /initHomeEconomicIndicators/);
  assert.match(boot, /initCategoryGuidesHub/);
  assert.match(boot, /initLandingFaq/);
  assert.match(boot, /ensureRevenueManager/);
  assert.doesNotMatch(boot, /from ['"].*platform-shell-home/);
  assert.doesNotMatch(boot, /initPlatformShellHome/);
});
