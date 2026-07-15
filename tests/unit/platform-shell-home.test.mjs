/**
 * PR-551 — Platform shell home entegrasyon sözleşmesi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('index.html includes additive platform-shell-home section before AI home', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const platformIdx = html.indexOf('id="platform-shell-home"');
  const homeIdx = html.indexOf('id="home"');
  const h1Idx = html.indexOf('id="hero-v4-title"');

  assert.ok(platformIdx > 0, 'platform-shell-home mount present');
  assert.ok(homeIdx > platformIdx, 'platform shell precedes AI home section');
  assert.ok(h1Idx > homeIdx, 'existing AI H1 remains inside #home');
  assert.match(html, /id="hero-v4-title"/);
  assert.doesNotMatch(
    html.slice(platformIdx, homeIdx),
    /<h1[\s>]/i,
    'platform shell static markup must not introduce an H1'
  );
});

test('homepage CSS bundle includes platform shell styles', () => {
  const bundle = fs.readFileSync(
    path.join(root, 'css/bundles/homepage.bundle.css'),
    'utf8'
  );
  assert.match(bundle, /platform-hero\.css/);
  assert.match(bundle, /platform-urun-karti\.css/);
  assert.match(bundle, /platform-urun-izgarasi\.css/);
  assert.match(bundle, /platform-shell-home\.css/);
});

test('platform-shell-home runtime module and catalog wire flag', async () => {
  const mod = await import('../../js/runtime/platform-shell-home.js');
  assert.equal(typeof mod.initPlatformShellHome, 'function');

  const { PLATFORM_CATALOG } = await import(
    '../../src/platform/config/platform-identity.ts'
  );
  assert.equal(PLATFORM_CATALOG.wiredToRuntime, true);
  assert.ok(PLATFORM_CATALOG.products.length >= 3);
});

test('PlatformHero headingLevel 2 avoids duplicate H1 contract', async () => {
  const { createPlatformHeroElement } = await import(
    '../../src/platform/components/PlatformHero/PlatformHero.ts'
  );

  // Minimal browser stubs for DOM factory
  class FakeEl {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this.children = [];
      this.attrs = {};
      this.className = '';
      this.id = '';
      this.textContent = '';
      this.style = { setProperty() {} };
    }
    setAttribute(k, v) {
      this.attrs[k] = v;
    }
    getAttribute(k) {
      return this.attrs[k];
    }
    append(...nodes) {
      this.children.push(...nodes);
    }
    addEventListener() {}
  }

  globalThis.document = {
    createElement: (tag) => new FakeEl(tag)
  };

  const el = createPlatformHeroElement({ headingLevel: 2 });
  assert.equal(el.children[0].children[1].tagName, 'H2');
});
