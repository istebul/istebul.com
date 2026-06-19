import test from 'node:test';
import assert from 'node:assert/strict';

const {
  computeRiskScore,
  computeSuitabilityScore,
  buildExecutiveSummaryStructuredV3,
  buildScenarioAnalysisV3,
  buildResultsV3Payload,
  buildTotalCostViewV3,
  extendPdfReportDataV3
} = await import('../../js/shared/results-v3-engine.js');

const { buildRiskAnalysisV3, buildDecisionContext } = await import(
  '../../js/features/results/decision-intelligence-engine.js'
);

test('computeRiskScore returns 0-100 and rises with high risks', () => {
  const low = computeRiskScore([
    { level: 'düşük' },
    { level: 'düşük' }
  ]);
  const high = computeRiskScore([
    { level: 'yüksek' },
    { level: 'yüksek' },
    { level: 'orta' }
  ]);
  assert.ok(low >= 0 && low <= 100);
  assert.ok(high >= 0 && high <= 100);
  assert.ok(high > low);
});

test('computeSuitabilityScore returns 0-100', () => {
  const ctx = buildDecisionContext('konut', { totalBudget: 4_000_000 }, { dti: 32 });
  const score = computeSuitabilityScore('konut', { ...ctx, riskAnalysis: [] }, 82);
  assert.ok(score >= 0 && score <= 100);
});

test('buildExecutiveSummaryStructuredV3 has overview, strengths, risks, recommendation', () => {
  const ctx = buildDecisionContext('auto', { budget: 1_200_000 }, {});
  ctx.decisionScore = 75;
  ctx.confidenceScore = 80;
  ctx.riskAnalysis = buildRiskAnalysisV3('auto', ctx);
  const summary = buildExecutiveSummaryStructuredV3('auto', ctx);
  assert.ok(summary.overview.includes('75'));
  assert.ok(Array.isArray(summary.strengths) && summary.strengths.length >= 1);
  assert.ok(Array.isArray(summary.risks));
  assert.ok(summary.recommendation.length > 10);
  assert.ok(summary.narrative.length > 20);
});

test('buildScenarioAnalysisV3 returns optimistic, expected, pessimistic', () => {
  const scenarios = buildScenarioAnalysisV3('tatil', { baseAmount: 50_000, decisionScore: 70 });
  assert.equal(scenarios.length, 3);
  assert.equal(scenarios[0].label, 'İyimser');
  assert.equal(scenarios[1].label, 'Beklenen');
  assert.equal(scenarios[2].label, 'Kötümser');
  assert.ok(scenarios[2].totalCost > scenarios[0].totalCost);
});

test('buildResultsV3Payload includes alternatives and next steps', () => {
  const v3 = buildResultsV3Payload({
    category: 'finansman',
    formData: { monthly_income: 60_000, existing_debt: 3_000 },
    metrics: {},
    extras: { primaryResult: { metrics: { monthlyPayment: 18_000 } } },
    totalCost: { amount: 420_000 }
  });
  assert.ok(v3.scores.decision >= 0 && v3.scores.decision <= 100);
  assert.ok(v3.alternatives.length <= 3);
  assert.ok(v3.nextSteps.length >= 1);
  assert.equal(v3.totalCost.horizon, 'Toplam geri ödeme');
});

test('buildTotalCostViewV3 category horizons', () => {
  const auto = buildTotalCostViewV3('auto', { amount: 1_000_000 });
  assert.ok(auto.horizon.includes('5 yıl'));
  const konut = buildTotalCostViewV3('konut', { amount: 2_000_000 });
  assert.ok(konut.horizon.includes('10 yıl'));
});

test('extendPdfReportDataV3 attaches resultsV3 without dropping base fields', () => {
  const base = { category: 'auto', decisionScore: 80, confidenceScore: 75, executiveSummary: 'x' };
  const v3 = buildResultsV3Payload({ category: 'auto', decisionScore: 80, confidenceScore: 75 });
  const pdf = extendPdfReportDataV3(base, v3);
  assert.equal(pdf.category, 'auto');
  assert.ok(pdf.resultsV3);
  assert.equal(pdf.resultsV3.scores.decision, v3.scores.decision);
});
