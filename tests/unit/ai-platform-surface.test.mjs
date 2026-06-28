import test from 'node:test';
import assert from 'node:assert/strict';

const { resolveRiskTitleTr, resolveRiskDetailTr, renderAiPlatformBanner, RISK_KEY_LABELS_TR } =
  await import('../../js/ui/ai-platform-surface.js');

const { renderDecisionV3Panel } = await import('../../js/decision/decision-v3-renderer.js');
const { buildDecisionIntelligenceResult } = await import(
  '../../js/features/results/decision-intelligence-engine.js'
);

test('resolveRiskTitleTr maps English keys to Turkish titles', () => {
  assert.equal(resolveRiskTitleTr({ key: 'payment' }), 'Aylık ödeme riski');
  assert.equal(resolveRiskTitleTr({ key: 'dti' }), 'Borç/gelir oranı');
  assert.equal(resolveRiskTitleTr({ key: 'term' }), 'Vade riski');
  assert.equal(resolveRiskTitleTr({ key: 'interest' }), 'Faiz yükü riski');
  assert.equal(resolveRiskTitleTr({ title: 'Özel risk' }), 'Özel risk');
});

test('resolveRiskDetailTr prefers description field', () => {
  assert.equal(
    resolveRiskDetailTr({ description: 'Açıklama metni', reason: 'Eski neden' }),
    'Açıklama metni'
  );
});

test('renderAiPlatformBanner outputs Turkish AI branding', () => {
  const html = renderAiPlatformBanner({ title: 'Test AI', subtitle: 'Alt metin' });
  assert.match(html, /Test AI/);
  assert.match(html, /AI aktif/);
  assert.match(html, /ib-ai-platform-banner/);
});

test('renderDecisionV3Panel uses Turkish risk titles not English keys', () => {
  const intelligence = buildDecisionIntelligenceResult(
    'finansman',
    { monthly_income: 55_000, existing_debt: 4_000, term_months: '36' },
    {},
    { primaryResult: { metrics: { monthlyPayment: 5_000, cashPressure: 'Düşük' } } }
  );

  const html = renderDecisionV3Panel({
    vertical: 'finansman',
    decisionScore: intelligence.decisionScore,
    confidenceScore: intelligence.confidenceScore,
    overallRisk: intelligence.overallRisk,
    scoreLabel: intelligence.scoreLabel,
    executiveSummary: intelligence.executiveSummary,
    nextSteps: intelligence.nextSteps,
    scoreFactors: intelligence.scoreFactors,
    riskAnalysis: intelligence.riskAnalysis.slice(0, 4),
    recommendationLabel: intelligence.recommendationLabel,
    title: 'Finansman Kararı'
  });

  assert.match(html, /Risk Özeti/);
  assert.match(html, /Aylık ödeme riski/);
  assert.match(html, /Borç\/gelir oranı/);
  assert.match(html, /Yapay Zeka Karar Analizi/);
  assert.doesNotMatch(html, /<strong>payment<\/strong>/);
  assert.doesNotMatch(html, /<strong>dti<\/strong>/);
});

test('RISK_KEY_LABELS_TR covers all finansman risk keys', () => {
  for (const key of ['payment', 'dti', 'term', 'interest', 'cashflow', 'flex']) {
    assert.ok(RISK_KEY_LABELS_TR[key], `Missing TR label for ${key}`);
  }
});

test('renderDecisionV3Panel auto surface clarifies decision score vs data confidence', () => {
  const intelligence = buildDecisionIntelligenceResult(
    'auto',
    { usage: 'family', fuel: 'gasoline', budget: 1_500_000, km: 15_000, body: 'suv', loan: 'hayir' },
    { topResult: { fuel: 'gasoline', body: 'suv', price: 1_400_000, score: 84 } },
    { totalCost: 1_200_000, budget: 1_500_000 }
  );

  const html = renderDecisionV3Panel({
    vertical: 'auto',
    decisionScore: intelligence.decisionScore,
    confidenceScore: intelligence.confidenceScore,
    overallRisk: intelligence.overallRisk,
    scoreLabel: intelligence.scoreLabel,
    executiveSummary: intelligence.executiveSummary,
    nextSteps: intelligence.nextSteps,
    scoreFactors: intelligence.scoreFactors,
    riskAnalysis: intelligence.riskAnalysis.slice(0, 4),
    recommendationLabel: intelligence.recommendationLabel,
    title: 'Araç Kararı'
  });

  assert.match(html, /Veri güveni:/);
  assert.doesNotMatch(html, /\/100 güven/);
  assert.doesNotMatch(html, /\bfamily\b/i);
  assert.doesNotMatch(html, /\bgasoline\b/i);
  assert.match(html, /Aile kullanımı profili/);
  assert.match(html, /Benzin yakıt profili/);
});
