/**
 * PR-564 — Platform Landing Preview sözleşmesi.
 * Kök `/` ve index.html dokunulmaz; preview bağımsız yüzeydir.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'platform-preview/index.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

/** Minimal DOM stubs (same pattern as platform-shell-home tests). */
function installDomStubs() {
  class FakeEl {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this.children = [];
      this.attrs = {};
      this.className = '';
      this.id = '';
      this.textContent = '';
      this.href = '';
      this.type = '';
      this.dataset = {};
      this.style = { setProperty() {} };
    }
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === 'id') this.id = String(v);
      if (k.startsWith('data-')) {
        const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[key] = String(v);
      }
    }
    getAttribute(k) {
      return this.attrs[k];
    }
    append(...nodes) {
      this.children.push(...nodes);
    }
    replaceChildren(...nodes) {
      this.children = [...nodes];
    }
    addEventListener() {}
    classList = {
      _self: this,
      add(...names) {
        const set = new Set(String(this._self.className || '').split(/\s+/).filter(Boolean));
        names.forEach((n) => set.add(n));
        this._self.className = [...set].join(' ');
      }
    };
  }

  const registry = new Map();

  globalThis.document = {
    createElement: (tag) => new FakeEl(tag),
    getElementById: (id) => registry.get(id) || null,
    readyState: 'loading',
    addEventListener() {}
  };

  return {
    FakeEl,
    register(id, el) {
      el.id = id;
      registry.set(id, el);
      return el;
    },
    collectText(node, acc = []) {
      if (!node) return acc;
      if (node.textContent) acc.push(node.textContent);
      for (const child of node.children || []) this.collectText(child, acc);
      return acc;
    },
    findAll(node, pred, acc = []) {
      if (!node) return acc;
      if (pred(node)) acc.push(node);
      for (const child of node.children || []) this.findAll(child, pred, acc);
      return acc;
    }
  };
}

test('preview HTML exists with noindex and expected IA sections', () => {
  assert.match(html, /data-platform-landing-preview="1"/);
  assert.match(html, /name="robots"[^>]*content="noindex, nofollow"/);
  assert.match(html, /id="platform-landing-preview-mount"/);
  assert.match(html, /id="neden-istebul"/);
  assert.match(html, /Neden İSTEBUL\?/);
  assert.match(html, /Tek platform/);
  assert.match(html, /Yapay zekâ odaklı/);
  assert.match(html, /Uzman ürünler/);
  assert.match(html, /Sürekli gelişen ekosistem/);
  assert.match(html, /data-footer-ia="platform-preview-v1"/);
  assert.match(html, /platform-shell-preview\.js/);
});

test('preview page excludes AI landing sections', () => {
  assert.doesNotMatch(html, /id="home-vertical-focus"/);
  assert.doesNotMatch(html, /id="pricing"/);
  assert.doesNotMatch(html, /id="landing-faq"/);
  assert.doesNotMatch(html, /id="home-guides-strip"/);
  assert.doesNotMatch(html, /id="hero-v4-title"/);
  assert.doesNotMatch(html, /id="how-it-works"/);
});

test('production build lists platform-preview and bundles mount', () => {
  const build = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
  assert.match(build, /platform-preview\/index\.html/);
  assert.match(build, /platform-shell-preview\.js/);
});

test('index.html SEO and H1 contracts unchanged by preview PR', () => {
  assert.match(indexHtml, /id="hero-v4-title"/);
  assert.match(
    indexHtml,
    /rel="canonical"[^>]*href="https:\/\/www\.istebul\.com\/"/
  );
  assert.match(indexHtml, /src="\/data\/schema\/home-graph\.json"/);
  assert.doesNotMatch(indexHtml, /platform-landing-preview/);
});

test('preview product CTA overrides match PR-564 copy', async () => {
  installDomStubs();
  const { getPlatformLandingPreviewProducts } = await import(
    '../../js/runtime/platform-shell-preview.js'
  );
  const products = getPlatformLandingPreviewProducts();
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  assert.equal(byId['istebul-ai'].ctaLabel, 'Karşılaştırmaya Başla');
  assert.equal(byId['istebul-ai'].slogan, 'Bireysel kullanıcılar');
  assert.equal(byId['istebul-ai'].shortDescription, 'Büyük satın alma kararları');
  assert.equal(byId['istebul-ai'].url, '/');

  assert.equal(byId.garsonai.ctaLabel, 'Restoranımı Dijitalleştir');
  assert.equal(byId.garsonai.slogan, 'Restoranlar');
  assert.equal(byId.garsonai.shortDescription, 'AI Restoran İşletim Sistemi');
  assert.equal(byId.garsonai.url, '/garson/');

  assert.equal(byId.business.ctaLabel, 'Yol Haritasını İncele');
  assert.equal(byId.business.statusLabel, 'Geliştirme Aşamasında');
  assert.equal(byId.business.slogan, 'İşletmeler');
  assert.equal(byId.business.shortDescription, 'İş zekâsı platformu');
  assert.equal(byId.business.url, '/business/');
});

test('initPlatformLandingPreview mounts H1 hero and preview CTAs', async () => {
  const stub = installDomStubs();
  const mount = stub.register('platform-landing-preview-mount', new stub.FakeEl('div'));
  const section = stub.register('platform-landing-preview', new stub.FakeEl('section'));

  const { initPlatformLandingPreview } = await import('../../js/runtime/platform-shell-preview.js');
  assert.equal(initPlatformLandingPreview(), true);
  assert.equal(mount.dataset.platformPreviewMounted, '1');
  assert.equal(section.dataset.platformLandingPreviewReady, '1');

  const texts = stub.collectText(mount);
  assert.ok(texts.includes('Karşılaştırmaya Başla'));
  assert.ok(texts.includes('Restoranımı Dijitalleştir'));
  assert.ok(texts.includes('Yol Haritasını İncele'));
  assert.ok(texts.includes('Bireysel kullanıcılar'));
  assert.ok(texts.includes('Üç bağımsız ürün, tek platform'));

  const h1s = stub.findAll(mount, (n) => n.tagName === 'H1');
  assert.equal(h1s.length, 1, 'preview page owns a single H1');
});
