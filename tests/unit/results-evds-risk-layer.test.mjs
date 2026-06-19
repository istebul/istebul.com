import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildEvdsRiskLayer,
  buildEvdsAiMarketSentence,
  renderEvdsRiskLayerHtml,
  mountEvdsRiskLayer,
  containsDirectivePhrases,
  EVDS_AI_MARKET_SENTENCE
} = await import('../../js/features/results/results-evds-risk-layer.js');

const { buildExecutiveSummary, normalizeInsightInput } = await import(
  '../../js/features/ai/ai-insight-engine.js'
);

const { buildDecisionIntelligenceResult } = await import(
  '../../js/features/results/decision-intelligence-engine.js'
);

const HIGH_FINANCE = { policyRate: 50, housingLoanRate: 45, cpiAnnual: 55 };
const LOW_FINANCE = { policyRate: 18, housingLoanRate: 22, cpiAnnual: 12 };
const HIGH_AUTO = { usdTry: 42, eurTry: 45, cpiAnnual: 55 };
const NORMAL_AUTO = { usdTry: 32, eurTry: 34, cpiAnnual: 22 };

test('finance yüksek faiz + yüksek TÜFE → high risk', () => {
  const layer = buildEvdsRiskLayer('finance', HIGH_FINANCE);
  assert.equal(layer.hasData, true);
  assert.equal(layer.riskLevel, 'high');
  assert.equal(layer.title, 'Finansman Piyasası Görünümü');
  assert.ok(layer.bullets.length >= 2);
  assert.ok(layer.usedIndicators.length >= 3);
  assert.match(layer.summary, /risk katmanı/);
});

test('konut veri yok → unavailable ama ekran kırılmaz', () => {
  const layer = buildEvdsRiskLayer('konut', {});
  assert.equal(layer.hasData, false);
  assert.equal(layer.riskLevel, 'unavailable');
  assert.equal(renderEvdsRiskLayerHtml(layer), '');
  assert.doesNotThrow(() => mountEvdsRiskLayer(null, layer));
});

test('auto yüksek kur + yüksek TÜFE → high risk', () => {
  const layer = buildEvdsRiskLayer('auto', HIGH_AUTO);
  assert.equal(layer.riskLevel, 'high');
  assert.match(layer.summary, /Kur ve enflasyon/);
  assert.ok(layer.bullets.some((b) => /USD\/TRY|EUR\/TRY|yedek parça|kasko/i.test(b)));
});

test('normal veri → medium veya low risk', () => {
  const finance = buildEvdsRiskLayer('finance', LOW_FINANCE);
  const auto = buildEvdsRiskLayer('auto', NORMAL_AUTO);
  assert.ok(['low', 'medium'].includes(finance.riskLevel));
  assert.ok(['low', 'medium'].includes(auto.riskLevel));
});

test('AI summary EVDS varsa piyasa cümlesi içerir', () => {
  const layer = buildEvdsRiskLayer('finance', HIGH_FINANCE);
  const sentence = buildEvdsAiMarketSentence(layer);
  assert.match(sentence, /Piyasa verileri/);
  assert.match(sentence, /faiz, enflasyon veya kur koşullarına/);

  const summary = buildExecutiveSummary(
    normalizeInsightInput({
      vertical: 'finansman',
      answers: { monthly_income: 50_000 },
      scores: { decision: 70, overallRisk: 'Orta' },
      marketAssessment: sentence
    })
  );
  assert.match(summary, /Piyasa verileri/);
});

test('yönlendirici ifadeler kullanılmaz', () => {
  const presets = ['finance', 'konut', 'auto'];
  const rates = [HIGH_FINANCE, HIGH_FINANCE, HIGH_AUTO];
  for (let i = 0; i < presets.length; i += 1) {
    const layer = buildEvdsRiskLayer(presets[i], rates[i]);
    const html = renderEvdsRiskLayerHtml(layer);
    const blob = [layer.summary, ...layer.bullets, html, buildEvdsAiMarketSentence(layer)].join(' ');
    assert.equal(containsDirectivePhrases(blob), false, presets[i]);
    assert.doesNotMatch(blob, /\bkredi çek\b/i);
    assert.doesNotMatch(blob, /\bkesin avantajlı\b/i);
  }
});

test('EVDS risk katmanı ana karar skorunu değiştirmez', () => {
  const state = { monthly_income: 60_000, existing_debt: 4_000, term_months: '36' };
  const primary = { metrics: { monthlyPayment: 18_000 }, score: 72 };

  const without = buildDecisionIntelligenceResult('finansman', state, {}, { primaryResult: primary });
  const withRates = buildEvdsRiskLayer('finance', HIGH_FINANCE);
  assert.ok(withRates.hasData);

  const withoutAgain = buildDecisionIntelligenceResult('finansman', state, {}, { primaryResult: primary });
  assert.equal(without.decisionScore, withoutAgain.decisionScore);
});

test('renderEvdsRiskLayerHtml kart bileşenlerini içerir', () => {
  const layer = buildEvdsRiskLayer('konut', HIGH_FINANCE);
  const html = renderEvdsRiskLayerHtml(layer);
  assert.match(html, /Konut Finansman Görünümü/);
  assert.match(html, /ib-evds-risk-layer__badge/);
  assert.match(html, /Kullanılan göstergeler/);
  assert.match(html, /Bilgilendirme amaçlıdır/);
});

test('mountEvdsRiskLayer veri yoksa güvenli no-op', () => {
  assert.doesNotThrow(() => mountEvdsRiskLayer(null, buildEvdsRiskLayer('konut', {})));
  assert.doesNotThrow(() => mountEvdsRiskLayer({}, buildEvdsRiskLayer('auto', HIGH_AUTO)));
});

test('EVDS_AI_MARKET_SENTENCE karar destek dilinde', () => {
  assert.match(EVDS_AI_MARKET_SENTENCE, /değerlendirilmesi gerektiğini/);
  assert.equal(containsDirectivePhrases(EVDS_AI_MARKET_SENTENCE), false);
});
