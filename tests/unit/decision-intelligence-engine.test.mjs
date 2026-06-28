import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildDecisionContext,
  computeDecisionScoreV3,
  computeConfidenceScoreV3,
  buildRiskAnalysisV3,
  buildAlternativesV3,
  buildExecutiveSummaryFallbackV3,
  buildDecisionIntelligenceResult,
  resolveRecommendationLevel
} = await import('../../js/features/results/decision-intelligence-engine.js');

test('buildDecisionContext produces category-specific context', () => {
  const konut = buildDecisionContext('konut', { city: 'İstanbul', totalBudget: 5_000_000 }, { dti: 35 });
  const finans = buildDecisionContext(
    'finansman',
    { monthly_income: 50_000, existing_debt: 5_000 },
    {},
    { primaryResult: { metrics: { monthlyPayment: 20_000 } } }
  );
  assert.equal(konut.category, 'konut');
  assert.equal(konut.city, 'İstanbul');
  assert.equal(finans.category, 'finansman');
  assert.ok(finans.paymentToIncome > 0);
});

test('computeDecisionScoreV3 returns 0-100', () => {
  const ctx = buildDecisionContext('tatil', { budget_range: 'dengeli' }, {});
  const score = computeDecisionScoreV3('tatil', ctx);
  assert.ok(score >= 0 && score <= 100);
});

test('computeConfidenceScoreV3 returns 0-100', () => {
  const full = computeConfidenceScoreV3('konut', {
    formData: {
      city: 'Ankara',
      district: 'Çankaya',
      totalBudget: 4_000_000,
      homeType: 'daire',
      purchasePurpose: 'Oturmak',
      monthlyIncome: 80_000
    }
  });
  const partial = computeConfidenceScoreV3('konut', { formData: { city: 'Ankara' } });
  assert.ok(full >= 0 && full <= 100);
  assert.ok(partial >= 0 && partial <= 100);
  assert.ok(full > partial);
});

test('konut high credit load increases risk level', () => {
  const ctx = buildDecisionContext('konut', {}, { dti: 52, monthlyPayment: 50_000, capacity: 40_000 });
  const risks = buildRiskAnalysisV3('konut', ctx);
  const credit = risks.find((r) => r.key === 'credit');
  assert.ok(credit);
  assert.equal(credit.level, 'yüksek');
});

test('finansman high payment to income lowers decision score', () => {
  const lowCtx = buildDecisionContext(
    'finansman',
    { monthly_income: 80_000, existing_debt: 2_000 },
    {},
    { primaryResult: { metrics: { monthlyPayment: 15_000 } } }
  );
  const highCtx = buildDecisionContext(
    'finansman',
    { monthly_income: 40_000, existing_debt: 8_000 },
    {},
    { primaryResult: { metrics: { monthlyPayment: 22_000 } } }
  );
  const lowScore = computeDecisionScoreV3('finansman', lowCtx);
  const highScore = computeDecisionScoreV3('finansman', highCtx);
  assert.ok(highScore < lowScore);
});

test('tatil insufficient budget raises budget risk', () => {
  const ctx = buildDecisionContext(
    'tatil',
    { budget_range: 'manuel', budget_total: 50_000 },
    {},
    { primaryResult: { costs: { realTotal: 95_000 } } }
  );
  const risks = buildRiskAnalysisV3('tatil', ctx);
  const budgetRisk = risks.find((r) => r.key === 'budget');
  assert.equal(budgetRisk?.level, 'yüksek');
});

test('auto usage appears in score factors with Turkish labels', () => {
  const ctx = buildDecisionContext(
    'auto',
    { usage: 'family', fuel: 'hybrid', budget: 1_200_000 },
    { topResult: { fuel: 'hybrid', body: 'suv' } },
    { totalCost: 1_000_000 }
  );
  computeDecisionScoreV3('auto', ctx);
  const usageFactor = ctx.scoreFactors.find((f) => /Kullanım/i.test(f.label));
  assert.ok(usageFactor);
  assert.match(usageFactor.reason, /Aile kullanımı profili/);
  assert.doesNotMatch(usageFactor.reason, /\bfamily\b/i);
});

test('auto intelligence result avoids raw enum leakage in user-facing copy', () => {
  const result = buildDecisionIntelligenceResult(
    'auto',
    { usage: 'family', fuel: 'gasoline', budget: 1_500_000, km: 15_000, body: 'suv', loan: 'hayir' },
    { topResult: { fuel: 'gasoline', body: 'suv', price: 1_400_000, score: 84 } },
    { totalCost: 1_200_000, budget: 1_500_000 }
  );

  const serialized = JSON.stringify({
    scoreFactors: result.scoreFactors,
    riskAnalysis: result.riskAnalysis,
    executiveSummary: result.executiveSummary,
    recommendationLabel: result.recommendationLabel
  });

  assert.doesNotMatch(serialized, /\bfamily\b/i);
  assert.doesNotMatch(serialized, /\bgasoline\b/i);
  assert.match(serialized, /Aile kullanımı/i);
  assert.match(serialized, /Benzin/i);

  const usageFactor = result.scoreFactors.find((f) => f.label === 'Kullanım amacı');
  assert.match(usageFactor?.reason || '', /Aile kullanımı profili/);
  assert.equal(usageFactor?.impact, 'Nötr');

  const fuelFactor = result.scoreFactors.find((f) => f.label === 'Yakıt/enerji');
  assert.match(fuelFactor?.reason || '', /Benzin yakıt profili/);

  const usageRisk = result.riskAnalysis.find((r) => r.key === 'usage');
  assert.match(usageRisk?.description || '', /Aile kullanımı profiline göre/);
});

test('auto proceed recommendation uses softer Turkish label', () => {
  const result = buildDecisionIntelligenceResult(
    'auto',
    { usage: 'city', fuel: 'hybrid', budget: 2_000_000, km: 12_000, body: 'sedan', loan: 'hayir' },
    { topResult: { fuel: 'hybrid', body: 'sedan', price: 1_600_000, score: 90 } },
    { totalCost: 1_100_000, budget: 2_000_000 }
  );

  if (result.recommendationLevel === 'proceed') {
    assert.equal(result.recommendationLabel, 'Devam edilebilir');
  }
});

test('buildAlternativesV3 returns at least three options', () => {
  const alts = buildAlternativesV3('finansman', buildDecisionContext('finansman', {}, {}));
  assert.ok(alts.length >= 3);
});

test('resolveRecommendationLevel maps score thresholds', () => {
  assert.equal(resolveRecommendationLevel(88, { riskAnalysis: [] }), 'proceed');
  assert.equal(
    resolveRecommendationLevel(70, { riskAnalysis: [{ level: 'orta' }] }),
    'proceed_with_caution'
  );
  assert.equal(resolveRecommendationLevel(52, { riskAnalysis: [] }), 'wait');
  assert.equal(
    resolveRecommendationLevel(40, { riskAnalysis: [{ level: 'yüksek' }, { level: 'yüksek' }] }),
    'avoid'
  );
});

test('fallback executive summary is non-empty', () => {
  const result = buildDecisionIntelligenceResult('konut', { city: 'İzmir', totalBudget: 3_000_000 }, { dti: 30 });
  const text = buildExecutiveSummaryFallbackV3('konut', result.context);
  assert.ok(text.length > 40);
  assert.match(text, /karar destek/i);
});

test('buildDecisionIntelligenceResult includes explainability fields', () => {
  const result = buildDecisionIntelligenceResult(
    'finansman',
    { monthly_income: 60_000, purpose: 'konut', amount_range: '1m', term_months: '36' },
    {},
    { primaryResult: { metrics: { monthlyPayment: 18_000 } } }
  );
  assert.ok(result.decisionScore >= 0 && result.decisionScore <= 100);
  assert.ok(Array.isArray(result.scoreFactors) && result.scoreFactors.length > 0);
  assert.equal(result.riskAnalysis.length, 6);
  assert.ok(result.recommendationLevel);
  assert.ok(result.executiveSummary);
});
