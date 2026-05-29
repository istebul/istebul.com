import test from 'node:test';
import assert from 'node:assert/strict';

const {
  computeConfidenceScore,
  computeDecisionScore,
  buildRiskAnalysis,
  buildTotalCostView,
  buildKonutResultsV2Payload,
  buildAlternatives
} = await import('../../js/features/konut/konut-results-v2.js');

test('computeConfidenceScore drops when city missing', () => {
  const full = computeConfidenceScore({
    city: 'Ankara',
    district: 'Çankaya',
    totalBudget: 3_000_000,
    homeType: 'Daire',
    roomCount: '3',
    purchasePurpose: 'Satın almak istiyorum',
    useFinancing: 'evet',
    monthlyIncome: 80_000,
    monthlyCapacity: 45_000,
    locationPreferences: ['ulasim'],
    riskPreferences: ['Düşük aidat']
  });
  const partial = computeConfidenceScore({ city: 'Ankara' });
  assert.ok(full > partial);
  assert.ok(partial >= 32);
});

test('decisionScoreLabel bands', () => {
  const payload = buildKonutResultsV2Payload({
    state: {
      city: 'İstanbul',
      totalBudget: 4_000_000,
      homeType: 'Daire',
      purchasePurpose: 'Satın almak istiyorum',
      useFinancing: 'evet'
    },
    metrics: {
      score: 78,
      budgetFit: 75,
      locationFit: 80,
      homeTypeFit: 82,
      financingClarity: 85,
      costPressure: 30,
      investmentPotential: 70,
      downPaymentStrength: 65,
      riskDensity: 40,
      dti: 35,
      earthquakeRiskScore: 45,
      liquidityRisk: 40,
      risk: { label: 'Orta', score: 48 },
      ownership: {
        homePrice: 4_000_000,
        downPayment: 1_200_000,
        principal: 2_800_000,
        monthlyPayment: 42_000,
        titleFees: 180_000,
        realTotal: 4_500_000
      }
    },
    scenarios: [],
    attention: []
  });
  assert.ok(payload.decisionScore >= 0 && payload.decisionScore <= 100);
  assert.ok(['Çok uygun', 'Uygun', 'Dikkatli değerlendir', 'Riskli karar'].includes(payload.scoreLabel));
  assert.equal(payload.riskAnalysis.length, 6);
  assert.ok(payload.pdfReportData.decisionScore === payload.decisionScore);
});

test('buildRiskAnalysis returns six categories', () => {
  const risks = buildRiskAnalysis(
    { city: 'İzmir', totalBudget: 2_500_000, duesExpectation: 6000, useFinancing: 'evet' },
    { dti: 50, earthquakeRiskScore: 70, locationFit: 60, liquidityRisk: 55, ownership: { monthlyPayment: 38_000 } }
  );
  assert.equal(risks.length, 6);
  assert.ok(risks.every((r) => r.title && r.level && r.description && r.recommendation));
});

test('buildTotalCostView marks estimate when budget missing', () => {
  const cost = buildTotalCostView({}, { ownership: { monthlyPayment: 10_000 } });
  assert.equal(cost.isEstimate, true);
  assert.ok(cost.yearlyLoad > 0);
});

test('buildAlternatives always returns three items', () => {
  const alts = buildAlternatives([]);
  assert.equal(alts.length, 3);
});

test('computeDecisionScore blends with legacy metrics', () => {
  const score = computeDecisionScore(
    { purchasePurpose: 'Satın almak istiyorum', homeType: 'Daire' },
    { score: 72, budgetFit: 70, locationFit: 68, homeTypeFit: 75, financingClarity: 80, costPressure: 35, investmentPotential: 65, risk: { score: 45 }, riskDensity: 30 }
  );
  assert.ok(score >= 40 && score <= 95);
});
