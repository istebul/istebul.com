import test from 'node:test';
import assert from 'node:assert/strict';

const {
  computeDecisionScore,
  computeConfidenceScore,
  buildRiskAnalysis,
  buildTotalCostView,
  buildAlternatives,
  buildFinansmanResultsV2Payload
} = await import('../../js/features/finansman/finansman-results-v2.js');

const sampleState = {
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

const sampleResult = {
  score: 74,
  metrics: {
    monthlyPayment: 22_000,
    totalRepay: 792_000,
    cashPressure: 'Orta'
  }
};

test('decisionScore is between 0 and 100', () => {
  const score = computeDecisionScore(sampleState, sampleResult);
  assert.ok(score >= 0 && score <= 100);
});

test('confidenceScore is between 0 and 100', () => {
  const full = computeConfidenceScore(sampleState);
  const partial = computeConfidenceScore({ purpose: 'arac' });
  assert.ok(full >= 0 && full <= 100);
  assert.ok(partial >= 0 && partial <= 100);
  assert.ok(full > partial);
});

test('buildRiskAnalysis returns six risk headings', () => {
  const risks = buildRiskAnalysis(sampleState, sampleResult);
  assert.equal(risks.length, 6);
  assert.ok(risks.every((r) => r.title && ['düşük', 'orta', 'yüksek'].includes(r.level)));
});

test('buildTotalCostView fills cost fields', () => {
  const cost = buildTotalCostView(sampleState, sampleResult);
  assert.ok(cost.principal > 0);
  assert.ok(cost.monthlyPayment > 0);
  assert.ok(cost.totalRepayment > 0);
  assert.ok(cost.yearlyLoad > 0);
});

test('buildAlternatives returns at least three items', () => {
  const alts = buildAlternatives(sampleState, []);
  assert.ok(alts.length >= 3);
});

test('buildFinansmanResultsV2Payload includes pdfReportData', () => {
  const payload = buildFinansmanResultsV2Payload({
    state: sampleState,
    results: [sampleResult]
  });
  assert.ok(payload.pdfReportData);
  assert.equal(payload.pdfReportData.decisionScore, payload.decisionScore);
  assert.equal(payload.riskAnalysis.length, 6);
  assert.ok(payload.strengths.length >= 3);
  assert.ok(payload.weaknesses.length >= 1);
  assert.ok(payload.nextSteps.length >= 1);
});
