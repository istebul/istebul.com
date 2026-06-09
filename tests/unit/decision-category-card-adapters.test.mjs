import test from 'node:test';
import assert from 'node:assert/strict';

import { MAX_DECISION_CARD_SIGNALS } from '../../js/features/decision-cards/decision-category-card-contract.js';
import {
  adaptCategoryCard,
  adaptCategoryCardList,
  adaptAutoCard,
  adaptFinansmanCard,
  adaptKaskoCard,
  adaptKonutCard,
  adaptSigortaCard,
  adaptTatilCard
} from '../../js/features/decision-cards/adapters/index.js';
import { buildSigortaResults, buildEngineResult as buildSigortaEngine } from '../../js/features/sigorta/sigorta-engine.js';
import { buildKaskoResults, buildEngineResult as buildKaskoEngine } from '../../js/features/kasko/kasko-engine.js';
import { buildFinansResults } from '../../js/finans/finans-engine.js';
import { buildResults as buildTatilResults } from '../../js/tatil/tatil-engine.js';

const sigortaState = {
  insurance_type: 'saglik',
  age: 38,
  children_count: '2',
  risk_perception: 'yuksek',
  budget_level: 'orta'
};

const kaskoState = {
  age: 35,
  vehicle_category: 'otomobil',
  vehicle_year_band: '4-10',
  license_years: '3-10',
  usage_type: 'ozel',
  coverage_level: 'standard',
  risk_perception: 'orta',
  budget_level: 'orta'
};

const finansState = {
  purpose: 'konut',
  amount_range: '750k',
  capacity_range: '25k',
  term_months: '36',
  monthly_income: 65000,
  monthly_expense: 22000,
  existing_debt: 8000,
  income_type: 'stabil',
  risk_tolerance: 'dengeli'
};

const tatilState = {
  vacation_goal: 'deniz-tatili',
  people_type: 'cocuklu-aile',
  budget_range: 'dengeli',
  vacation_type: 'deniz-resort',
  trip_nights: 7,
  travelers_count: 4
};

const konutScenario = {
  id: 'lower-budget',
  title: 'Daha düşük bütçeli konut',
  monthlyEffect: '-2.100 TL',
  totalEffect: '-%11 toplam maliyet',
  riskEffect: 'Likidite riski azalır',
  score: 74,
  why: 'Aylık yükü düşürür.',
  pros: ['Daha düşük peşinat'],
  cautions: ['Lokasyon seçenekleri daralabilir']
};

const konutMetrics = { dti: 35 };

const autoScenario = {
  id: 'vehicle-1',
  name: 'Toyota Corolla Hybrid',
  score: 88,
  suitability: 'Güçlü uyum',
  fuelDisplay: '₺42.000 / yıl',
  resaleDisplay: 'Güçlü talep · %82',
  reasons: ['Düşük işletme maliyeti', 'Yüksek ikinci el talebi'],
  risks: ['Segmentte yoğun rekabet']
};

function assertViewModelBasics(vm, categoryId, scenario) {
  assert.equal(vm.categoryId, categoryId);
  assert.equal(vm.decisionScore, scenario.score);
  assert.ok(vm.signals.length <= MAX_DECISION_CARD_SIGNALS);
  assert.ok(vm.aiExplanation.summary != null);
  assert.ok(vm.aiExplanation.why != null);
  assert.ok(vm.aiExplanation.disclaimer.length > 10);
  assert.equal(vm.aiExplanation.source, 'engine');
  assert.ok(Array.isArray(vm.pros));
  assert.ok(Array.isArray(vm.cautions));
  assert.ok(vm.cta?.primary?.label);
  assert.equal(vm._source, scenario);
}

test('sigorta adapter happy path preserves score and source', () => {
  const results = buildSigortaResults(sigortaState);
  const engine = buildSigortaEngine(sigortaState);
  const scenario = results.find((r) => r.id === 'balanced');

  const vm = adaptSigortaCard({ scenario, engine, state: sigortaState });
  assertViewModelBasics(vm, 'sigorta', scenario);
  assert.equal(vm.scenarioId, 'balanced');
  assert.ok(vm.signals.length >= 3);
  assert.match(vm.signals[0].value, /₺|—/);
  assert.ok(['proceed', 'proceed_with_caution', 'wait', 'avoid'].includes(vm.recommendationLevel));
});

test('kasko adapter happy path preserves score and source', () => {
  const results = buildKaskoResults(kaskoState);
  const engine = buildKaskoEngine(kaskoState);
  const scenario = results.find((r) => r.id === 'balanced');

  const vm = adaptKaskoCard({ scenario, engine, state: kaskoState });
  assertViewModelBasics(vm, 'kasko', scenario);
  assert.ok(vm.signals.some((s) => s.key === 'coverage' || s.key === 'premium'));
  assert.match(vm.cta.primary.label, /kasko/i);
});

test('finansman adapter happy path', () => {
  const results = buildFinansResults(finansState);
  const scenario = results[0];

  const vm = adaptFinansmanCard({ scenario, state: finansState });
  assertViewModelBasics(vm, 'finansman', scenario);
  assert.ok(vm.signals.some((s) => s.key === 'cashPressure' || s.key === 'estimatedCost'));
});

test('tatil adapter happy path', () => {
  const results = buildTatilResults(tatilState);
  const scenario = results[0];

  const vm = adaptTatilCard({ scenario, state: tatilState });
  assertViewModelBasics(vm, 'tatil', scenario);
  assert.ok(vm.signals.length >= 2);
});

test('konut adapter happy path', () => {
  const vm = adaptKonutCard({
    scenario: konutScenario,
    metrics: konutMetrics,
    state: { city: 'İstanbul' }
  });
  assertViewModelBasics(vm, 'konut', konutScenario);
  assert.ok(vm.signals.some((s) => s.key === 'dti'));
});

test('auto adapter happy path', () => {
  const vm = adaptAutoCard({ scenario: autoScenario, state: { usage: 'city' } });
  assertViewModelBasics(vm, 'araba', autoScenario);
  assert.match(vm.title, /Corolla/i);
  assert.equal(vm.pros.length, 2);
  assert.equal(vm.cautions.length, 1);
});

test('adaptCategoryCard registry resolves aliases', () => {
  const results = buildSigortaResults(sigortaState);
  const scenario = results[0];
  const vm = adaptCategoryCard('sigorta', {
    scenario,
    engine: buildSigortaEngine(sigortaState),
    state: sigortaState
  });
  assert.equal(vm.categoryId, 'sigorta');
  assert.equal(vm.decisionScore, scenario.score);
});

test('adaptCategoryCardList maps all scenarios', () => {
  const results = buildKaskoResults(kaskoState);
  const engine = buildKaskoEngine(kaskoState);
  const list = adaptCategoryCardList('kasko', results, { engine, state: kaskoState });
  assert.equal(list.length, 3);
  list.forEach((vm, i) => {
    assert.equal(vm.decisionScore, results[i].score);
    assert.equal(vm._source, results[i]);
  });
});

const adapters = [
  ['sigorta', adaptSigortaCard],
  ['kasko', adaptKaskoCard],
  ['finansman', adaptFinansmanCard],
  ['tatil', adaptTatilCard],
  ['konut', adaptKonutCard],
  ['araba', adaptAutoCard]
];

for (const [name, adapter] of adapters) {
  test(`${name} adapter empty input safe fallback`, () => {
    const vm = adapter({});
    assert.equal(vm.categoryId, name === 'araba' ? 'araba' : name);
    assert.equal(vm.decisionScore, 0);
    assert.equal(vm.signals.length, 0);
    assert.deepEqual(vm._source, {});
    assert.ok(vm.aiExplanation.summary !== undefined);
  });

  test(`${name} adapter missing score safe fallback`, () => {
    const source = { id: 'x', title: 'Test', pros: [], cautions: [] };
    const vm = adapter({ scenario: source });
    assert.equal(vm.decisionScore, 0);
    assert.equal(vm._source, source);
    assert.ok(vm.signals.length <= MAX_DECISION_CARD_SIGNALS);
  });
}

test('decisionScore is not recomputed by adapter', () => {
  const results = buildSigortaResults(sigortaState);
  const economic = results.find((r) => r.id === 'economic');
  const originalScore = economic.score;

  const vm = adaptSigortaCard({
    scenario: economic,
    engine: buildSigortaEngine(sigortaState),
    state: sigortaState
  });

  assert.equal(vm.decisionScore, originalScore);
  assert.notEqual(vm.decisionScore, buildSigortaEngine(sigortaState).decisionScore);
});
