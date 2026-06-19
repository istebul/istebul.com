import test from 'node:test';
import assert from 'node:assert/strict';

const {
  computeDecisionScore,
  computeConfidenceScore,
  buildRiskAnalysis,
  buildTotalCostView,
  buildAlternatives,
  buildTatilResultsV2Payload
} = await import('../../js/features/tatil/tatil-results-v2.js');

const sampleState = {
  vacation_goal: 'deniz',
  vacation_type: 'deniz-resort',
  budget_range: 'dengeli',
  people_type: 'cocuklu-aile',
  travelers_count: 4,
  children_count: 2,
  children_ages: '6, 9',
  date_start: '2026-07-10',
  date_end: '2026-07-17',
  date_flexibility: 'net',
  transport_preference: 'ucak',
  comfort_expectation: 'dengeli',
  expectations: ['Çocuk dostu', 'Güvenlik'],
  trip_nights: 7
};

const sampleResult = {
  score: 78,
  costs: {
    realTotal: 95_000,
    perPerson: 23_750,
    nights: 7,
    lines: [
      { key: 'accommodation', value: 36_000, label: '36.000 ₺' },
      { key: 'transport', value: 20_000, label: '20.000 ₺' },
      { key: 'transfer', value: 5_000, label: '5.000 ₺' },
      { key: 'food', value: 14_000, label: '14.000 ₺' },
      { key: 'extras', value: 12_000, label: '12.000 ₺' },
      { key: 'children', value: 8_000, label: '8.000 ₺' }
    ]
  }
};

test('decisionScore is between 0 and 100', () => {
  const score = computeDecisionScore(sampleState, sampleResult);
  assert.ok(score >= 0 && score <= 100);
});

test('confidenceScore is between 0 and 100', () => {
  const full = computeConfidenceScore(sampleState);
  const partial = computeConfidenceScore({ vacation_goal: 'deniz' });
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
  assert.ok(cost.accommodation > 0);
  assert.ok(cost.transport > 0);
  assert.ok(cost.totalBudget > 0);
  assert.ok(cost.perPerson > 0);
});

test('buildAlternatives returns at least three items', () => {
  const alts = buildAlternatives(sampleState, [sampleResult]);
  assert.ok(alts.length >= 3);
});

test('buildTatilResultsV2Payload includes pdfReportData', () => {
  const payload = buildTatilResultsV2Payload({
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
