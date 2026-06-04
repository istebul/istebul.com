import test from 'node:test';
import assert from 'node:assert/strict';

const { buildKonutResultsV2Payload } = await import('../../js/features/konut/konut-results-v2.js');
const { buildEvdsRiskLayer } = await import('../../js/features/results/results-evds-risk-layer.js');

const sampleMetrics = {
  score: 72,
  scoreBand: { label: 'Dengeli', tone: 'mid' },
  ownership: { monthlyPayment: 28_000, realTotal: 3_200_000, homePrice: 3_000_000, downPayment: 600_000, totalRepayment: 2_500_000, titleFees: 120_000 },
  dti: 34,
  locationFit: 70,
  budgetFit: 75,
  homeTypeFit: 80,
  financingClarity: 70,
  costPressure: 30,
  investmentPotential: 65,
  risk: { label: 'Orta', score: 40 },
  riskDensity: 35
};

test('konut V2 payload includes Konut Finansman Görünümü layer', () => {
  const payload = buildKonutResultsV2Payload({
    state: {
      purchasePurpose: 'Satın almak istiyorum',
      city: 'Ankara',
      totalBudget: 3_000_000,
      homeType: 'Daire',
      useFinancing: 'evet',
      monthlyIncome: 80_000,
      monthlyCapacity: 45_000
    },
    metrics: sampleMetrics,
    evdsRates: { housingLoanRate: 45, policyRate: 50, cpiAnnual: 55 }
  });
  assert.ok(payload.evdsRiskLayer);
  assert.equal(payload.evdsRiskLayer.title, buildEvdsRiskLayer('konut', { housingLoanRate: 45, policyRate: 50, cpiAnnual: 55 }).title);
  assert.ok(payload.decisionScore >= 0 && payload.decisionScore <= 100);
});
