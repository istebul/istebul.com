import test from 'node:test';
import assert from 'node:assert/strict';

const {
  computeFinansmanMarketScore,
  computeKonutFinancingAccessScore,
  computeAutoFxRiskAnalysis,
  buildEvdsMarketAnalysis,
  applyEvdsToDecisionContext,
  buildMarketAssessmentText,
  hasEvdsDataForCategory,
  renderFinansmanMarketAssessmentHtml,
  renderKonutFinancingOutlookHtml,
  renderAutoFxRiskHtml
} = await import('../../js/features/evds/evds-market-engine.js');

const {
  buildDecisionIntelligenceResult,
  computeDecisionScoreV3,
  buildDecisionContext
} = await import('../../js/features/results/decision-intelligence-engine.js');

const { buildExecutiveSummary, normalizeInsightInput } = await import(
  '../../js/features/ai/ai-insight-engine.js'
);

const HIGH_RATES = {
  policyRate: 50,
  housingLoanRate: 45,
  cpiAnnual: 55
};

const LOW_RATES = {
  policyRate: 18,
  housingLoanRate: 22,
  cpiAnnual: 12
};

const HIGH_FX = {
  usdTry: 42,
  eurTry: 45,
  cpiAnnual: 48
};

test('yüksek faiz senaryosu — finansman piyasa skoru düşük ve negatif ayarlama', () => {
  const result = computeFinansmanMarketScore(HIGH_RATES);
  assert.equal(result.hasData, true);
  assert.ok(result.score < 55);
  assert.ok(result.scoreAdjustment <= 0);
  assert.equal(result.components.financingRisk.level, 'yüksek');
  assert.equal(result.components.creditAccessibility.level, 'düşük');
  assert.equal(result.components.realCostRisk.level, 'yüksek');
  assert.match(result.summary, /Karar destek amaçlı/);
});

test('düşük faiz senaryosu — finansman piyasa skoru yüksek ve pozitif ayarlama', () => {
  const result = computeFinansmanMarketScore(LOW_RATES);
  assert.equal(result.hasData, true);
  assert.ok(result.score >= 72);
  assert.ok(result.scoreAdjustment >= 0);
  assert.equal(result.components.creditAccessibility.level, 'yüksek');
});

test('yüksek kur senaryosu — araç kur riski yüksek', () => {
  const result = computeAutoFxRiskAnalysis(HIGH_FX);
  assert.equal(result.hasData, true);
  assert.equal(result.risks.zeroVehicleCost.level, 'yüksek');
  assert.equal(result.risks.maintenanceCost.level, 'yüksek');
  assert.ok(result.scoreAdjustment <= 0);
  assert.match(result.summary, /Kur ve maliyet risk skoru/);
});

test('EVDS verisi yok senaryosu — mevcut davranış korunur', () => {
  assert.equal(hasEvdsDataForCategory({}, 'finansman'), false);
  assert.equal(hasEvdsDataForCategory({}, 'konut'), false);
  assert.equal(hasEvdsDataForCategory({}, 'auto'), false);

  const finans = computeFinansmanMarketScore({});
  const konut = computeKonutFinancingAccessScore(null);
  const auto = computeAutoFxRiskAnalysis(undefined);

  assert.equal(finans.hasData, false);
  assert.equal(finans.score, null);
  assert.equal(finans.scoreAdjustment, 0);
  assert.equal(konut.hasData, false);
  assert.equal(auto.hasData, false);

  assert.equal(renderFinansmanMarketAssessmentHtml(buildEvdsMarketAnalysis('finansman', {})), '');
  assert.equal(renderKonutFinancingOutlookHtml(buildEvdsMarketAnalysis('konut', {})), '');
  assert.equal(renderAutoFxRiskHtml(buildEvdsMarketAnalysis('auto', {})), '');
});

test('konut finansman erişilebilirlik skoru yüksek faizde düşer', () => {
  const high = computeKonutFinancingAccessScore(HIGH_RATES);
  const low = computeKonutFinancingAccessScore(LOW_RATES);
  assert.ok(high.score < low.score);
  assert.match(high.outlook.creditCost.detail, /Konut kredisi faizi/);
  assert.match(high.outlook.financingAccess.detail, /Politika faizi/);
  assert.match(high.outlook.inflationEffect.detail, /TÜFE/);
});

test('EVDS risk katmanı karar motoru skorunu değiştirmez (ayrı modül)', () => {
  const state = {
    monthly_income: 60_000,
    existing_debt: 4_000,
    term_months: '36'
  };
  const primary = { metrics: { monthlyPayment: 18_000 }, score: 72 };

  const scoreA = buildDecisionIntelligenceResult('finansman', state, {}, { primaryResult: primary }).decisionScore;
  const scoreB = buildDecisionIntelligenceResult('finansman', state, {}, { primaryResult: primary }).decisionScore;
  assert.equal(scoreA, scoreB);
});

test('EVDS piyasa değerlendirmesi AI özetine eklenir', () => {
  const analysis = buildEvdsMarketAnalysis('finansman', HIGH_RATES);
  const marketText = buildMarketAssessmentText('finansman', analysis);
  assert.match(marketText, /Karar destek amaçlı/);

  const summary = buildExecutiveSummary(
    normalizeInsightInput({
      vertical: 'finansman',
      answers: { monthly_income: 50_000, term_months: '36' },
      scores: { decision: 70, overallRisk: 'Orta' },
      costs: { monthlyPayment: 20_000, paymentToIncome: 40 },
      marketAssessment: marketText
    })
  );
  assert.match(summary, /Karar destek amaçlı/);
});


test('applyEvdsToDecisionContext skor faktörü ekler', () => {
  const ctx = buildDecisionContext(
    'konut',
    { city: 'İstanbul', totalBudget: 4_000_000 },
    { dti: 35, score: 70 }
  );
  const analysis = buildEvdsMarketAnalysis('konut', HIGH_RATES);
  applyEvdsToDecisionContext('konut', ctx, analysis);

  assert.ok(ctx.evdsMarket?.hasData);
  assert.ok(Array.isArray(ctx.scoreFactors));
  assert.ok(ctx.scoreFactors.some((f) => f.label.includes('EVDS')));
  assert.ok(ctx.warnings.length >= 1);
});


test('computeDecisionScoreV3 EVDS ayarlaması olmadan değişmez', () => {
  const ctx = buildDecisionContext('finansman', { monthly_income: 50_000 }, {}, {
    primaryResult: { metrics: { monthlyPayment: 15_000 } }
  });
  const scoreBefore = computeDecisionScoreV3('finansman', { ...ctx });
  assert.equal(ctx.evdsScoreAdjustment, undefined);
  assert.ok(scoreBefore >= 0 && scoreBefore <= 100);
});
