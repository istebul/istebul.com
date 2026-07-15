/**
 * PR-565 — İSTEBUL AI Landing Foundation sözleşmesi.
 * Cutover değildir: `/`, platform-preview, home SEO dokunulmaz.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const aiHtml = fs.readFileSync(path.join(root, 'ai/index.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const previewHtml = fs.readFileSync(path.join(root, 'platform-preview/index.html'), 'utf8');

const EXPECTED_SECTIONS = [
  ['home', 'hero'],
  ['home-vertical-focus', 'categories'],
  ['how-it-works', 'how'],
  ['home-features-strip', 'features'],
  ['pricing', 'pricing'],
  ['home-economic-indicators', 'economic'],
  ['partner-enterprise', 'partner'],
  ['landing-faq', 'faq'],
  ['home-guides-strip', 'guides']
];

test('ai/index.html foundation shell is noindex and product-scoped', () => {
  assert.match(aiHtml, /data-ai-landing-foundation="1"/);
  assert.match(aiHtml, /data-ib-product="istebul-ai"/);
  assert.match(aiHtml, /name="robots"[^>]*content="noindex, nofollow"/);
  assert.match(aiHtml, /rel="canonical"[^>]*href="https:\/\/www\.istebul\.com\/ai\/"/);
  assert.match(aiHtml, /css\/ai\/ai-landing-foundation\.css/);
  assert.match(aiHtml, /js\/ai\/ai-landing-foundation\.js/);
});

test('AI landing skeleton exposes all EPIC-002 section mounts', () => {
  for (const [id, key] of EXPECTED_SECTIONS) {
    assert.match(aiHtml, new RegExp(`id="${id}"`));
    assert.match(aiHtml, new RegExp(`data-ai-landing-section="${key}"`));
  }
  assert.match(aiHtml, /id="ai-landing-hero-title"/);
  assert.match(aiHtml, /id="home-category-grid"/);
  assert.match(aiHtml, /id="pricing-plans-root"/);
  assert.match(aiHtml, /id="home-economic-indicators-mount"/);
});

test('foundation does not ship migrated AI marketing copy blocks', () => {
  // Full home AI hero H1 contract must stay on `/` only for now
  assert.doesNotMatch(aiHtml, /id="hero-v4-title"/);
  assert.doesNotMatch(aiHtml, /Büyük kararları verirken/);
  assert.doesNotMatch(aiHtml, /newsletter-form/);
  assert.doesNotMatch(aiHtml, /platform-shell-home/);
});

test('home SEO contracts and platform preview remain untouched', () => {
  assert.match(indexHtml, /id="hero-v4-title"/);
  assert.match(
    indexHtml,
    /rel="canonical"[^>]*href="https:\/\/www\.istebul\.com\/"/
  );
  assert.match(indexHtml, /src="\/data\/schema\/home-graph\.json"/);
  assert.doesNotMatch(indexHtml, /data-ai-landing-foundation/);

  assert.match(previewHtml, /data-platform-landing-preview="1"/);
  assert.doesNotMatch(previewHtml, /data-ai-landing-foundation/);
});

test('sitemap and robots.txt do not advertise /ai yet', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert.doesNotMatch(sitemap, /istebul\.com\/ai\/?/);
  assert.doesNotMatch(robots, /\/ai/);
});

test('build + folder split wire AI vs platform bundles', () => {
  const build = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
  assert.match(build, /ai\/index\.html/);
  assert.match(build, /js\/ai\/ai-landing-foundation\.js/);
  assert.match(build, /platform-shell-preview\.js/);

  assert.ok(fs.existsSync(path.join(root, 'css/ai/ai-landing-foundation.css')));
  assert.ok(fs.existsSync(path.join(root, 'js/ai/ai-landing-foundation.js')));
  assert.ok(fs.existsSync(path.join(root, 'css/platform-landing-preview.css')));
});

test('initAiLandingFoundation marks mounts without hydrating content', async () => {
  class FakeEl {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this.children = [];
      this.attrs = {};
      this.dataset = {};
      this.className = '';
    }
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k.startsWith('data-')) {
        const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[key] = String(v);
      }
    }
    getAttribute(k) {
      return this.attrs[k];
    }
    querySelectorAll(sel) {
      if (sel === '[data-ai-landing-section]') return this._sections || [];
      if (sel === '[data-ai-landing-mount]') return this._mounts || [];
      return [];
    }
  }

  const root = new FakeEl('main');
  root._sections = Array.from({ length: 9 }, () => new FakeEl('section'));
  root._mounts = Array.from({ length: 9 }, () => new FakeEl('div'));

  globalThis.document = {
    readyState: 'loading',
    addEventListener() {},
    documentElement: { dataset: {} },
    querySelector: (sel) => (sel === '[data-ai-landing-root]' ? root : null)
  };

  const mod = await import('../../js/ai/ai-landing-foundation.js');
  assert.deepEqual(mod.AI_LANDING_SECTION_IDS.length, 9);
  assert.deepEqual(mod.AI_LANDING_SECTION_KEYS.length, 9);

  const result = mod.initAiLandingFoundation();
  assert.equal(result.ready, true);
  assert.equal(result.sections, 9);
  assert.equal(result.mounts, 9);
  assert.equal(root.dataset.aiLandingFoundationReady, '1');
  assert.equal(root._mounts[0].attrs['data-ai-landing-ready'], '1');
});
