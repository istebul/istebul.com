import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCardHtml, hydrateFinansmanEvdsCard } from '../../js/features/finansman/evds-reference-card.js';

test('renderCardHtml shows TCMB reference fields', () => {
  const html = renderCardHtml({
    dataDate: '04-06-2026',
    rates: { usdTry: 45.8696, eurTry: 53.2768, policyRate: 46.5 }
  });

  assert.match(html, /TCMB Referans Verileri/);
  assert.match(html, /USD\/TRY/);
  assert.match(html, /EUR\/TRY/);
  assert.match(html, /Politika faizi/);
  assert.match(html, /Veri tarihi/);
  assert.match(html, /04-06-2026/);
  assert.match(html, /TCMB EVDS/);
  assert.doesNotMatch(html, /TÜFE/);
});

test('hydrateFinansmanEvdsCard fills mount when API succeeds', async () => {
  const mount = createMountNode();
  const root = createRootWithMount(mount);

  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        ok: true,
        data: {
          rates: { usdTry: 45.87, eurTry: 53.28, policyRate: 46 },
          dataDate: '04-06-2026'
        }
      };
    }
  });

  await hydrateFinansmanEvdsCard(root);

  assert.match(mount.innerHTML, /data-finansman-evds-card/);
  assert.match(mount.innerHTML, /TCMB Referans Verileri/);
  assert.equal(mount.hidden, false);
});

test('hydrateFinansmanEvdsCard hides mount when API fails', async () => {
  const mount = createMountNode();
  const root = createRootWithMount(mount);

  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    async json() {
      return { ok: false };
    }
  });

  await hydrateFinansmanEvdsCard(root);

  assert.equal(mount.innerHTML, '');
  assert.equal(mount.hidden, true);
});

function createMountNode() {
  let card = null;
  return {
    innerHTML: '',
    hidden: false,
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    querySelector(sel) {
      if (sel === '[data-finansman-evds-card]') return card;
      return null;
    },
    get querySelectorInner() {
      return card;
    },
    set cardEl(el) {
      card = el;
    }
  };
}

function createRootWithMount(mount) {
  return {
    querySelector(sel) {
      if (sel === '[data-finansman-evds-mount]') return mount;
      return null;
    }
  };
}
