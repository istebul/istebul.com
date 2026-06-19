import test from 'node:test';
import assert from 'node:assert/strict';

const { canAdvanceFinansStep } = await import('../../js/finans/finans-flow.js');
const { buildEvdsRiskLayer, buildEvdsAiMarketSentence } = await import(
  '../../js/features/results/results-evds-risk-layer.js'
);

const baseState = {
  purpose: 'konut',
  amount_range: '1m',
  term_months: '36',
  capacity_range: '25k',
  monthly_income: 55_000,
  monthly_expense: 18_000,
  existing_debt: 6_000,
  income_type: 'stabil',
  early_payment: 'belki',
  rate_sensitivity: 'orta',
  risk_tolerance: 'dengeli'
};

const steps = [
  { id: 'purpose' },
  { id: 'amount' },
  { id: 'term' },
  { id: 'capacity' },
  { id: 'cashflow' },
  { id: 'sensitivity' }
];

test('canAdvanceFinansStep blocks cashflow without monthly income', () => {
  const state = { ...baseState, monthly_income: null };
  assert.equal(canAdvanceFinansStep(state, steps[4]), false);
});

test('canAdvanceFinansStep allows final step with demo profile', () => {
  assert.equal(canAdvanceFinansStep(baseState, steps[5]), true);
});

test('finansman EVDS risk layer renders for finance preset', () => {
  const layer = buildEvdsRiskLayer('finance', { policyRate: 50, housingLoanRate: 45, cpiAnnual: 55 });
  assert.equal(layer.title, 'Finansman Piyasası Görünümü');
  assert.equal(layer.riskLevel, 'high');
  const sentence = buildEvdsAiMarketSentence(layer);
  assert.ok(sentence.length > 40);
  assert.match(sentence, /koşul|faiz|enflasyon/i);
});
