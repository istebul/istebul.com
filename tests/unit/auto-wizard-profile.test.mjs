import test from 'node:test';
import assert from 'node:assert/strict';

import { recommendVehicles } from '../../js/auto/auto-ai.js';
import { scoreVehicleMatch } from '../../js/engines/decision-consultant.js';
import {
  HOUSEHOLD_SIZE_OPTIONS,
  buildAutoHouseholdInsightClause,
  buildAutoSuitabilitySignalText,
  resolveCityRatioForSync,
  shouldShowCityRatioField
} from '../../js/auto/auto-wizard-profile.js';
import { buildDecisionInsight } from '../../js/features/ai/ai-insight-engine.js';
import { adaptAutoCard } from '../../js/features/decision-cards/adapters/auto-adapter.js';

const sampleVehicle = {
  name: 'Toyota Corolla Hybrid',
  price: 1_450_000,
  body: 'sedan',
  fuel: 'hybrid',
  family: 8,
  city: 7,
  long: 6,
  prestige: 5,
  resale: 8
};

const baseForm = {
  budget: '1500000',
  usage: 'family',
  body: 'suv',
  fuel: 'hybrid',
  km: '15000',
  loan: 'yes',
  ownership_months: '36',
  city_ratio: '0.6',
  city: 'İzmir'
};

test('household_size options cover four household bands', () => {
  assert.equal(HOUSEHOLD_SIZE_OPTIONS.length, 4);
  assert.deepEqual(
    HOUSEHOLD_SIZE_OPTIONS.map((option) => option.value),
    ['1', '2', '3-4', '5+']
  );
});

test('shouldShowCityRatioField only for city and family usage', () => {
  assert.equal(shouldShowCityRatioField('city'), true);
  assert.equal(shouldShowCityRatioField('family'), true);
  assert.equal(shouldShowCityRatioField('long'), false);
  assert.equal(shouldShowCityRatioField('business'), false);
});

test('resolveCityRatioForSync keeps explicit choice for city/family', () => {
  assert.equal(resolveCityRatioForSync('family', '0.85'), '0.85');
  assert.equal(resolveCityRatioForSync('city', ''), '0.6');
});

test('resolveCityRatioForSync defaults long/business to highway-heavy ratio', () => {
  assert.equal(resolveCityRatioForSync('long', '0.85'), '0.25');
  assert.equal(resolveCityRatioForSync('business', ''), '0.25');
});

test('buildAutoSuitabilitySignalText enriches household + usage profile', () => {
  const text = buildAutoSuitabilitySignalText(
    { household_size: '3-4', usage: 'family' },
    'Güçlü uyum'
  );
  assert.match(text, /3-4 kişilik hane/i);
  assert.match(text, /aile kullanımına uyumlu/i);
});

test('buildAutoHouseholdInsightClause highlights capacity themes', () => {
  const clause = buildAutoHouseholdInsightClause({ household_size: '5+', usage: 'family' });
  assert.match(clause, /5\+ kişilik hane/i);
  assert.match(clause, /aile kullanımı/i);
  assert.match(clause, /bagaj ihtiyacı/i);
  assert.match(clause, /yolcu kapasitesi/i);
});

test('household_size does not change scoreVehicleMatch output', () => {
  const without = scoreVehicleMatch(sampleVehicle, baseForm);
  const withHousehold = scoreVehicleMatch(sampleVehicle, {
    ...baseForm,
    household_size: '5+'
  });
  assert.equal(withHousehold.score, without.score);
  assert.deepEqual(withHousehold.scoreBreakdown, without.scoreBreakdown);
});

test('household_size does not change recommendVehicles ordering or vehicle.score', () => {
  const vehicles = [
    { ...sampleVehicle, name: 'A' },
    { ...sampleVehicle, name: 'B', body: 'suv', price: 1_380_000 },
    { ...sampleVehicle, name: 'C', body: 'hatchback', price: 1_520_000 }
  ];

  const baseline = recommendVehicles(baseForm, vehicles);
  const enriched = recommendVehicles({ ...baseForm, household_size: '3-4' }, vehicles);

  assert.deepEqual(
    enriched.map((item) => ({ name: item.name, score: item.score })),
    baseline.map((item) => ({ name: item.name, score: item.score }))
  );
});

test('auto adapter preserves vehicle.score with enriched suitability signal', () => {
  const scenario = {
    id: 'vehicle-1',
    name: 'Toyota Corolla Hybrid',
    score: 88,
    suitability: 'Güçlü uyum',
    fuelDisplay: '₺42.000 / yıl',
    resaleDisplay: 'Güçlü talep · %82'
  };
  const enrichedSuitability = buildAutoSuitabilitySignalText(
    { household_size: '3-4', usage: 'family' },
    scenario.suitability
  );

  const vm = adaptAutoCard({
    scenario: { ...scenario, suitability: enrichedSuitability },
    state: { household_size: '3-4', usage: 'family' }
  });

  assert.equal(vm.decisionScore, 88);
  const suitabilitySignal = vm.signals.find((signal) => signal.key === 'suitability');
  assert.match(suitabilitySignal?.value || '', /3-4 kişilik hane/i);
});

test('buildDecisionInsight auto why includes household narrative without changing scores', () => {
  const insight = buildDecisionInsight({
    vertical: 'auto',
    answers: {
      usage: 'family',
      fuel: 'hybrid',
      km: 15000,
      loan: 'yes',
      budget: 1_500_000,
      household_size: '3-4'
    },
    scores: { decision: 84, overallRisk: 'Orta' },
    costs: { budget: 1_500_000, tco12: 410_000 },
    planTier: 'guest'
  });

  assert.match(insight.why, /3-4 kişilik hane/i);
  assert.match(insight.why, /bagaj ihtiyacı|aile kullanımı/i);
  assert.match(insight.summary, /84|100/);
});
