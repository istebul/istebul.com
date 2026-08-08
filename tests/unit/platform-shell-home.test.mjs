/**
 * PR-551 / PR-553 — Platform shell home entegrasyon ve Hero deneyimi sözleşmesi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const root = process.cwd();

/** Minimal DOM stubs for platform DOM factories / mount. */
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
        const key = k
          .slice(5)
          .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
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
    getElementById: (id) => registry.get(id) || null
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
    findByAttr(node, attr, value, acc = []) {
      if (!node) return acc;
      if (node.attrs?.[attr] === value || node.dataset?.[attr.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())] === value) {
        // dataset path above is imperfect; also check attrs
      }
      if (node.attrs?.[attr] === value) acc.push(node);
      for (const child of node.children || []) this.findByAttr(child, attr, value, acc);
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

test('index.html hosts Platform Landing after cutover', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /id="platform-landing"/);
  assert.match(html, /platform-landing-mount/);
  assert.match(html, /id="neden-istebul"/);
  assert.doesNotMatch(html, /id="hero-v4-title"/);
  assert.doesNotMatch(html, /id="platform-shell-home"/);
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

test('platform-shell-landing runtime module and catalog wire flag', async () => {
  const mod = await import('../../js/runtime/platform-shell-landing.js');
  assert.equal(typeof mod.initPlatformLanding, 'function');

  const { PLATFORM_CATALOG } = await import(
    '../../src/platform/config/platform-identity.ts'
  );
  assert.equal(PLATFORM_CATALOG.wiredToRuntime, true);
  assert.equal(PLATFORM_CATALOG.cutoverActive, true);
  assert.ok(PLATFORM_CATALOG.products.length >= 4);
  assert.equal(
    PLATFORM_CATALOG.products.find((p) => p.id === 'istebul-ai')?.url,
    '/ai/'
  );
});

test('WarehouseIQ live landing product contract', async () => {
  const { getPlatformLandingProducts } = await import('../../js/runtime/platform-shell-landing.js');
  const products = getPlatformLandingProducts();
  const byId = Object.fromEntries(products.map((product) => [product.id, product]));

  assert.equal(products.length, 4);
  assert.equal(byId.warehouseiq.url, '/warehouse/');
  assert.equal(byId.warehouseiq.statusLabel, 'Pilot');
  assert.equal(byId.warehouseiq.slogan, 'Depo ve lojistik ekipleri');
  assert.equal(byId.warehouseiq.shortDescription, 'Akıllı Depo Yönetimi');
  assert.equal(byId.warehouseiq.ctaLabel, 'Operasyon Merkezini Aç');
});

test('PlatformHero headingLevel 1 owns Platform Landing H1', async () => {
  const stub = installDomStubs();
  const { createPlatformHeroElement } = await import(
    '../../src/platform/components/PlatformHero/PlatformHero.ts'
  );

  const el = createPlatformHeroElement({ headingLevel: 1 });
  const headings = stub.findAll(el, (n) => n.tagName === 'H2' || n.tagName === 'H1');
  assert.equal(headings.length, 1);
  assert.equal(headings[0].tagName, 'H1');
});

test('PLATFORM_CATALOG products expose required PR-553 CTA labels', async () => {
  const { PLATFORM_PRODUCTS } = await import(
    '../../src/platform/constants/platform-products.ts'
  );
  const byId = Object.fromEntries(PLATFORM_PRODUCTS.map((p) => [p.id, p]));

  assert.equal(byId['istebul-ai'].ctaLabel, 'Karşılaştırmaya Başla');
  assert.equal(byId.garsonai.ctaLabel, 'Restoranını Yönet');
  assert.equal(byId.business.ctaLabel, 'Gelişmeleri İncele');
  assert.equal(byId.business.status, 'beta');
  assert.match(byId.business.statusLabel, /Beta/i);
});

test('PlatformHero experience renders per-product CTAs and Business status', async () => {
  const stub = installDomStubs();
  const { createPlatformHeroElement } = await import(
    '../../src/platform/components/PlatformHero/PlatformHero.ts'
  );
  const { listVisiblePlatformProducts } = await import(
    '../../src/platform/constants/platform-products.ts'
  );
  const { PLATFORM_IDENTITY } = await import(
    '../../src/platform/config/platform-identity.ts'
  );

  const products = listVisiblePlatformProducts();
  const el = createPlatformHeroElement({
    identity: PLATFORM_IDENTITY,
    headingLevel: 2,
    products,
    showProductStatus: true,
    hideCtaNote: true
  });

  assert.equal(el.attrs['data-platform-hero-experience'], '1');
  const texts = stub.collectText(el);
  assert.ok(texts.includes('Karşılaştırmaya Başla'));
  assert.ok(texts.includes('Restoranını Yönet'));
  assert.ok(texts.includes('Gelişmeleri İncele'));
  assert.ok(texts.some((t) => /Beta/i.test(t)));

  const headings = stub.findAll(el, (n) => n.tagName === 'H1');
  assert.equal(headings.length, 0, 'shell-style hero may use H2');
});

test('PlatformÜrünKartı uses catalog ctaLabel and shows beta badge', async () => {
  const stub = installDomStubs();
  const { createPlatformUrunKartiElement } = await import(
    '../../src/platform/components/PlatformÜrünKartı/PlatformUrunKarti.ts'
  );
  const { getPlatformProductById } = await import(
    '../../src/platform/constants/platform-products.ts'
  );

  const business = getPlatformProductById('business');
  const card = createPlatformUrunKartiElement({
    product: business,
    enableNavigation: true
  });
  const texts = stub.collectText(card);
  assert.ok(texts.includes('Gelişmeleri İncele'));
  assert.ok(texts.some((t) => /Beta/i.test(t)));
  assert.equal(card.attrs['data-platform-product-status'], 'beta');

  const navigationLinks = stub.findAll(card, (n) => n.tagName === 'A');
  assert.equal(navigationLinks.length, 1);
  assert.equal(navigationLinks[0].attrs['data-native-route'], '');

  const ai = getPlatformProductById('istebul-ai');
  const aiCard = createPlatformUrunKartiElement({
    product: ai,
    enableNavigation: true
  });
  assert.ok(stub.collectText(aiCard).includes('Karşılaştırmaya Başla'));
});

test('initPlatformLanding mounts experience without global İncele override', async () => {
  const stub = installDomStubs();
  globalThis.document.documentElement = { dataset: {} };
  const mount = stub.register('platform-landing-mount', new stub.FakeEl('div'));
  const section = stub.register('platform-landing', new stub.FakeEl('section'));

  const { initPlatformLanding } = await import('../../js/runtime/platform-shell-landing.js');
  const ok = initPlatformLanding();
  assert.equal(ok, true);
  assert.equal(mount.dataset.platformLandingMounted, '1');
  assert.equal(mount.dataset.platformLandingMounted, '1');
  assert.equal(section.dataset.platformLandingReady, '1');

  const texts = stub.collectText(mount);
  assert.ok(texts.includes('Karşılaştırmaya Başla'));
  assert.ok(texts.includes('Restoranımı Dijitalleştir'));
  assert.ok(texts.includes('İSTEBUL Business’a Git'));
  assert.ok(
    texts.includes('Karşılaştırmaya Başla') && texts.includes('Restoranımı Dijitalleştir'),
    'landing overlay CTAs present'
  );

  const h1s = stub.findAll(mount, (n) => n.tagName === 'H1');
  assert.equal(h1s.length, 1, 'Platform Landing owns H1');
});

test('PlatformÜrünIzgarası dört ürün için 4 sütunu tip olarak destekler', async () => {
  const gridSource = await readFile(
    new URL('../../src/platform/components/PlatformÜrünIzgarası/PlatformUrunIzgarasi.ts', import.meta.url),
    'utf8'
  );
  assert.match(
    gridSource,
    /PlatformUrunIzgarasiColumns = 1 \| 2 \| 3 \| 4/
  );
});
