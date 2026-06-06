import test from 'node:test';
import assert from 'node:assert/strict';

const {
  normalizeDecisionInput,
  calculateDecisionScore,
  calculateConfidenceScore,
  calculateRiskScore,
  calculateTotalCost,
  generateRiskRadar,
  generateWhatIfScenarios,
  buildDecisionEngineV3
} = await import('../../js/decision/ai-decision-engine-v3.js');

const FULL_AUTO_INPUT = {
  vertical: 'auto',
  formData: {
    budget: 1_500_000,
    usage: 'family',
    fuel: 'hybrid',
    monthlyIncome: 80_000,
    monthlyDebt: 5_000,
    downPayment: 300_000,
    termMonths: 48
  },
  topResult: {
    price: 1_350_000,
    fuel: 'hybrid',
    reasons: ['Bütçe uyumu güçlü', 'Hibrit yakıt avantajı'],
    risks: ['Sigorta primi değişken'],
    costs: {
      ownership: {
        totals: {
          months12: 420_000,
          months36: 1_100_000,
          months60: 1_650_000
        }
      }
    }
  }
};

const PARTIAL_AUTO_INPUT = {
  vertical: 'auto',
  formData: {
    budget: 1_200_000
  }
};

test('same input produces same output (deterministic)', () => {
  const a = buildDecisionEngineV3(FULL_AUTO_INPUT);
  const b = buildDecisionEngineV3(FULL_AUTO_INPUT);
  assert.deepEqual(a, b);
});

test('scores are normalized to 0-100 range', () => {
  const result = buildDecisionEngineV3(FULL_AUTO_INPUT);
  assert.ok(result.decisionScore >= 0 && result.decisionScore <= 100);
  assert.ok(result.confidenceScore >= 0 && result.confidenceScore <= 100);
  assert.ok(result.riskScore >= 0 && result.riskScore <= 100);

  const radar = result.riskRadar;
  for (const key of Object.keys(radar)) {
    assert.ok(radar[key] >= 0 && radar[key] <= 100, `${key} out of range`);
  }
});

test('missing data lowers confidence score', () => {
  const full = calculateConfidenceScore(FULL_AUTO_INPUT);
  const partial = calculateConfidenceScore(PARTIAL_AUTO_INPUT);
  assert.ok(full > partial, `full=${full} should exceed partial=${partial}`);
});

test('risk radar returns all required fields', () => {
  const radar = generateRiskRadar(FULL_AUTO_INPUT);
  assert.ok('financialRisk' in radar);
  assert.ok('liquidityRisk' in radar);
  assert.ok('maintenanceRisk' in radar);
  assert.ok('depreciationRisk' in radar);
  assert.ok('creditRisk' in radar);
});

test('what-if scenarios return at least 5 items with required shape', () => {
  const scenarios = generateWhatIfScenarios(FULL_AUTO_INPUT);
  assert.ok(scenarios.length >= 5);

  for (const s of scenarios) {
    assert.ok(s.id);
    assert.ok(s.title);
    assert.ok(s.changedField);
    assert.ok('before' in s);
    assert.ok('after' in s);
    assert.ok(s.impact);
    assert.ok(s.explanation);
  }
});

test('total cost returns 1/3/5 year projections', () => {
  const cost = calculateTotalCost(FULL_AUTO_INPUT);
  assert.equal(cost.currency, 'TRY');
  assert.ok(cost.oneYear > 0);
  assert.ok(cost.threeYear >= cost.oneYear);
  assert.ok(cost.fiveYear >= cost.threeYear);
});

test('buildDecisionEngineV3 output matches v3 schema', () => {
  const result = buildDecisionEngineV3(FULL_AUTO_INPUT);
  assert.equal(result.version, 'v3');
  assert.equal(result.vertical, 'auto');
  assert.ok(Array.isArray(result.explainableReasons));
  assert.ok(Array.isArray(result.alternativeReasons));
  assert.ok(result.summary.title);
  assert.ok(result.summary.verdict);
  assert.ok(result.summary.shortExplanation);
  assert.ok(result.summary.nextBestAction);
});

test('normalizeDecisionInput maps vertical aliases', () => {
  const konut = normalizeDecisionInput({ vertical: 'konut', formData: { totalBudget: 3_000_000 } });
  const finans = normalizeDecisionInput({ category: 'finansman', formData: { monthly_income: 50_000 } });
  assert.equal(konut.vertical, 'housing');
  assert.equal(finans.vertical, 'finance');
  assert.equal(konut.budget, 3_000_000);
});

test('calculateDecisionScore is deterministic across calls', () => {
  const scores = Array.from({ length: 5 }, () => calculateDecisionScore(FULL_AUTO_INPUT));
  assert.ok(scores.every((s) => s === scores[0]));
});
