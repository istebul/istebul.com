import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESULTS_ECONOMIC_PRESETS,
  hasAnyPresetValue,
  renderResultsEconomicCardHtml,
  renderResultsEconomicFallbackHtml,
  hydrateResultsEconomicIndicators
} from '../../js/features/results/results-economic-indicators.js';

const sampleData = {
  rates: {
    usdTry: 45.87,
    eurTry: 53.28,
    policyRate: 46,
    cpiAnnual: 30.65,
    housingLoanRate: 53.23
  },
  seriesDates: {
    usdTry: '04-06-2026',
    eurTry: '04-06-2026',
    policyRate: '04-06-2026',
    cpiAnnual: '2026-1',
    housingLoanRate: '29-05-2026'
  }
};

test('RESULTS_ECONOMIC_PRESETS define finansman, konut, auto and tatil indicator sets', () => {
  assert.equal(RESULTS_ECONOMIC_PRESETS.finansman.length, 3);
  assert.equal(RESULTS_ECONOMIC_PRESETS.konut.length, 3);
  assert.equal(RESULTS_ECONOMIC_PRESETS.auto.length, 3);
  assert.equal(RESULTS_ECONOMIC_PRESETS.tatil.length, 3);
  assert.equal(RESULTS_ECONOMIC_PRESETS.finansman[0].label, 'Politika faizi');
  assert.equal(RESULTS_ECONOMIC_PRESETS.konut[0].label, 'Konut kredisi faizi');
  assert.equal(RESULTS_ECONOMIC_PRESETS.auto[0].label, 'USD/TRY');
  assert.equal(RESULTS_ECONOMIC_PRESETS.tatil[0].label, 'USD/TRY');
});

test('renderResultsEconomicCardHtml shows title, subtitle and TCMB EVDS per item', () => {
  const finansman = renderResultsEconomicCardHtml(sampleData, 'finansman');
  assert.match(finansman, /Güncel Ekonomik Göstergeler/);
  assert.match(finansman, /TCMB EVDS verileriyle bilgilendirme amaçlıdır\./);
  assert.match(finansman, /Politika faizi/);
  assert.match(finansman, /Konut kredisi faizi/);
  assert.match(finansman, /TÜFE/);
  assert.match(finansman, /TCMB EVDS/);
  assert.doesNotMatch(finansman, /USD\/TRY/);

  const auto = renderResultsEconomicCardHtml(sampleData, 'auto');
  assert.match(auto, /USD\/TRY/);
  assert.match(auto, /EUR\/TRY/);
  assert.match(auto, /₺45,87/);
  assert.match(auto, /ib-home-economic__card/);
  assert.match(auto, /ib-home-economic__grid/);
  assert.match(auto, /data-results-economic-layout="home"/);
  assert.match(auto, /ib-home-economic__meta/);

  const konut = renderResultsEconomicCardHtml(sampleData, 'konut');
  assert.match(konut, /ib-home-economic__card/);
  assert.match(konut, /Konut kredisi faizi/);
  assert.match(konut, /data-results-economic-layout="home"/);
});

test('renderResultsEconomicFallbackHtml keeps card visible with fallback message', () => {
  const html = renderResultsEconomicFallbackHtml('konut');
  assert.match(html, /Veri geçici olarak alınamadı/);
  assert.match(html, /Konut kredisi faizi/);
  assert.match(html, />—</);
  assert.match(html, /data-results-economic-state="fallback"/);
});

test('hasAnyPresetValue detects usable rates for preset', () => {
  assert.equal(hasAnyPresetValue(RESULTS_ECONOMIC_PRESETS.auto, sampleData.rates), true);
  assert.equal(hasAnyPresetValue(RESULTS_ECONOMIC_PRESETS.finansman, { policyRate: null }), false);
});

test('hydrateResultsEconomicIndicators renders card when API succeeds', async () => {
  const mount = createMountNode();
  const root = createRootWithMount(mount);

  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return { ok: true, data: sampleData };
    }
  });

  await hydrateResultsEconomicIndicators(root, 'finansman');

  assert.match(mount.innerHTML, /data-results-economic-card/);
  assert.match(mount.innerHTML, /Güncel Ekonomik Göstergeler/);
  assert.equal(mount.hidden, false);
});

test('hydrateResultsEconomicIndicators shows fallback when API fails', async () => {
  const mount = createMountNode();
  const root = createRootWithMount(mount);

  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    async json() {
      return { ok: false };
    }
  });

  await hydrateResultsEconomicIndicators(root, 'auto');

  assert.match(mount.innerHTML, /Veri geçici olarak alınamadı/);
  assert.match(mount.innerHTML, /data-results-economic-state="fallback"/);
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
    },
    set cardEl(el) {
      card = el;
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
