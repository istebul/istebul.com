import test from 'node:test';
import assert from 'node:assert/strict';

const { PURPOSE_KEYS, getKonutFlow, purposeKeyFromLabel } = await import('../../js/konut/konut-flow.js');
const { calculateOwnershipCost } = await import('../../js/real-estate/real-estate-calculator.js');
const { buildTotalCostView } = await import('../../js/features/konut/konut-results-v2.js');
const { buildNextStepsV3, buildDecisionIntelligenceResult } = await import(
  '../../js/features/results/decision-intelligence-engine.js'
);

test('every live purpose label maps to a konut flow profile', () => {
  for (const label of Object.keys(PURPOSE_KEYS)) {
    const key = purposeKeyFromLabel(label);
    const flow = getKonutFlow(label);
    assert.ok(flow.stepLabels?.length >= 5, `${label} should expose step labels`);
    assert.ok(flow.homeTypes?.length >= 3, `${label} should expose home types`);
    assert.ok(flow.riskPrefs?.length >= 4, `${label} should expose risk prefs`);
    assert.equal(key, PURPOSE_KEYS[label]);
  }
});

test('calculateOwnershipCost uses duesExpectation when dues is empty', () => {
  const ownership = calculateOwnershipCost({
    totalBudget: 3_000_000,
    downPayment: 600_000,
    duesExpectation: 2500
  });
  assert.equal(ownership.duesMonthly, 2500);
  assert.equal(ownership.annualDues, 30_000);
});

test('buildTotalCostView reflects duesExpectation in duesMonthly', () => {
  const cost = buildTotalCostView(
    { duesExpectation: 1800, totalBudget: 2_500_000 },
    { ownership: { monthlyPayment: 22_000, homePrice: 2_500_000 } }
  );
  assert.equal(cost.duesMonthly, 1800);
  assert.ok(cost.yearlyLoad >= 1800 * 12);
});

test('rental profile produces rental next steps in V3 intelligence', () => {
  const intel = buildDecisionIntelligenceResult(
    'konut',
    {
      purchasePurpose: 'Kiralamak istiyorum',
      totalBudget: 25_000,
      city: 'Ankara',
      homeType: 'Daire'
    },
    { dti: 28, locationFit: 70, budgetFit: 72 }
  );
  assert.ok(intel.nextSteps.some((step) => /kira|depozito/i.test(step)));
  assert.ok(!intel.nextSteps.some((step) => /Kredi ön onayı/i.test(step)));
});

test('buildNextStepsV3 returns rental checklist for kiralama purpose', () => {
  const steps = buildNextStepsV3('konut', {
    formData: { purchasePurpose: 'Kiralamak istiyorum' },
    recommendationLevel: 'proceed'
  });
  assert.ok(steps[0].includes('Kira sözleşmesi'));
});
