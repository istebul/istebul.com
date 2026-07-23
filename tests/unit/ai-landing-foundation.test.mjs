/**
 * PR-565 — İSTEBUL AI Landing Foundation module sözleşmesi.
 * HTML clone (PR-566) ayrı test dosyasındadır; burada boot helper doğrulanır.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('foundation module file and folder split remain', () => {
  assert.ok(fs.existsSync(path.join(root, 'js/ai/ai-landing-foundation.js')));
  assert.ok(fs.existsSync(path.join(root, 'css/ai/ai-landing-foundation.css')));
  const build = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
  assert.match(build, /js\/ai\/ai-landing-foundation\.js/);
  assert.match(build, /platform-shell-preview\.js/);
});

test('AI_LANDING_SECTION_IDS cover EPIC-002 marketing surface', async () => {
  const mod = await import('../../js/ai/ai-landing-foundation.js');
  assert.equal(mod.AI_LANDING_SECTION_IDS.length, 9);
  assert.equal(mod.AI_LANDING_SECTION_KEYS.length, 9);
  assert.ok(mod.AI_LANDING_SECTION_IDS.includes('pricing'));
  assert.ok(mod.AI_LANDING_SECTION_IDS.includes('landing-faq'));
});

test('initAiLandingFoundation marks mounts without hydrating content', async () => {
  class FakeEl {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this.attrs = {};
      this.dataset = {};
    }
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k.startsWith('data-')) {
        const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[key] = String(v);
      }
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
  const result = mod.initAiLandingFoundation();
  assert.equal(result.ready, true);
  assert.equal(result.sections, 9);
  assert.equal(result.mounts, 9);
  assert.equal(root.dataset.aiLandingFoundationReady, '1');
});
