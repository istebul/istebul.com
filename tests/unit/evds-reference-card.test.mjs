import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCardHtml, hydrateFinansmanEvdsCard } from '../../js/features/finansman/evds-reference-card.js';

const sampleData = {
  rates: {
    policyRate: 46.5,
    cpiAnnual: 30.65,
    housingLoanRate: 53.23
  },
  seriesDates: {
    policyRate: '04-06-2026',
    cpiAnnual: '2026-1',
    housingLoanRate: '29-05-2026'
  }
};

test('renderCardHtml shows finansman economic indicators card', () => {
  const html = renderCardHtml(sampleData);

  assert.match(html, /Güncel Ekonomik Göstergeler/);
  assert.match(html, /Politika faizi/);
  assert.match(html, /Konut kredisi faizi/);
  assert.match(html, /TÜFE/);
  assert.match(html, /TCMB EVDS/);
  assert.doesNotMatch(html, /USD\/TRY/);
});

test('hydrateFinansmanEvdsCard fills mount when API succeeds', async () => {
  const mount = createMountNode();
  const root = createRootWithMount(mount);

  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return { ok: true, data: sampleData };
    }
  });

  await hydrateFinansmanEvdsCard(root);

  assert.match(mount.innerHTML, /data-results-economic-card/);
  assert.match(mount.innerHTML, /Güncel Ekonomik Göstergeler/);
  assert.equal(mount.hidden, false);
});

test('hydrateFinansmanEvdsCard shows fallback when API fails', async () => {
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

  assert.match(mount.innerHTML, /Veri geçici olarak alınamadı/);
  assert.equal(mount.hidden, false);
});

function createMountNode() {
  let card = null;
  return {
    innerHTML: '',
    hidden: true,
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    querySelector(sel) {
      if (sel === '[data-results-economic-card]') return card;
      return null;
    }
  };
}

function createRootWithMount(mount) {
  return {
    querySelector(sel) {
      if (sel === '[data-results-economic-mount]') return mount;
      return null;
    }
  };
}
