import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const {
  computeConfidenceScore,
  computeDecisionScore,
  buildRiskAnalysis,
  buildTotalCostView,
  buildKonutResultsV2Payload,
  buildAlternatives,
  syncCanonicalDecisionScore,
  renderKonutWarningsHtml,
  renderKonutActionsBarHtml,
  resolveKonutPartnerCtaLabel
} = await import('../../js/features/konut/konut-results-v2.js');

const { formatKonutAlternativeDescription, buildAlternativesV3 } = await import(
  '../../js/features/results/decision-intelligence-engine.js'
);

const { buildReportHtml } = await import('../../js/features/results/pdf-report.js');

const sampleState = {
  city: 'İstanbul',
  district: 'Kadıköy',
  totalBudget: 4_000_000,
  homeType: 'Daire',
  roomCount: '3',
  purchasePurpose: 'Satın almak istiyorum',
  useFinancing: 'evet',
  monthlyIncome: 80_000,
  monthlyCapacity: 45_000,
  locationPreferences: ['ulasim'],
  riskPreferences: ['Düşük aidat'],
  squareMeters: 95
};

const sampleMetrics = {
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
};

const housingScenarios = [
  {
    title: 'Daha düşük bütçeli konut',
    monthlyEffect: '-2.100 TL',
    totalEffect: '-%11 toplam maliyet',
    riskEffect: 'Likidite riski azalır',
    score: 74
  },
  {
    title: 'Daha yüksek peşinat',
    monthlyEffect: '-3.450 TL',
    totalEffect: '-%8 faiz yükü',
    riskEffect: 'Kredi yükü riski düşer',
    score: 76
  }
];

test('computeConfidenceScore drops when city missing', () => {
  const full = computeConfidenceScore(sampleState);
  const partial = computeConfidenceScore({ city: 'Ankara' });
  assert.ok(full > partial);
  assert.ok(partial >= 32);
});

test('decisionScore is canonical and matches payload', () => {
  const payload = buildKonutResultsV2Payload({
    state: sampleState,
    metrics: sampleMetrics,
    scenarios: housingScenarios,
    attention: []
  });
  assert.ok(payload.decisionScore >= 0 && payload.decisionScore <= 100);
  assert.ok(['Çok uygun', 'Uygun', 'Dikkatli değerlendir', 'Riskli karar'].includes(payload.scoreLabel));
  assert.equal(payload.riskAnalysis.length, 6);
  assert.equal(payload.pdfReportData.decisionScore, payload.decisionScore);
});

test('syncCanonicalDecisionScore overwrites legacy metrics.score', () => {
  const metrics = { ...sampleMetrics, score: 78 };
  const decisionScore = syncCanonicalDecisionScore(sampleState, metrics, (s) => ({
    label: s >= 75 ? 'Güçlü' : 'Orta',
    tone: s >= 75 ? 'good' : 'mid'
  }));
  assert.equal(metrics.score, decisionScore);
  assert.equal(computeDecisionScore(sampleState, sampleMetrics), decisionScore);
  assert.equal(metrics.scoreBand.label, decisionScore >= 75 ? 'Güçlü' : 'Orta');
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

test('formatKonutAlternativeDescription uses scenario effects when description empty', () => {
  const desc = formatKonutAlternativeDescription(housingScenarios[0]);
  assert.match(desc, /-2\.100 TL/);
  assert.match(desc, /Likidite riski azalır/);
  assert.match(desc, /-%11 toplam maliyet/);
});

test('buildAlternativesV3 never returns empty konut descriptions', () => {
  const alts = buildAlternativesV3('konut', {
    extras: { scenarios: housingScenarios }
  });
  assert.equal(alts.length, 2);
  assert.ok(alts.every((a) => a.description && a.description.trim().length > 0));
  assert.match(alts[0].description, /-2\.100 TL/);
});

test('buildKonutResultsV2Payload alternatives are never empty', () => {
  const payload = buildKonutResultsV2Payload({
    state: { ...sampleState, totalBudget: 4_000_000 },
    metrics: { ...sampleMetrics, dti: 50 },
    scenarios: housingScenarios,
    attention: []
  });
  assert.ok(payload.alternatives.length >= 1);
  assert.ok(payload.alternatives.every((a) => a.description && a.description.trim().length > 0));
});

test('renderKonutWarningsHtml renders Risk Uyarıları banner', () => {
  const html = renderKonutWarningsHtml(['Borç/gelir oranı yüksek görünüyor.']);
  assert.match(html, /Risk Uyarıları/);
  assert.match(html, /Borç\/gelir oranı yüksek/);
  assert.equal(renderKonutWarningsHtml([]), '');
});

test('warnings appear in PDF when intel.warnings present', () => {
  const payload = buildKonutResultsV2Payload({
    state: sampleState,
    metrics: { ...sampleMetrics, dti: 50 },
    scenarios: housingScenarios,
    attention: []
  });
  assert.ok(payload.warnings.length >= 1);
  const pdf = buildReportHtml(payload.pdfReportData);
  assert.match(pdf, /Risk Uyarıları/);
  assert.match(pdf, /Borç\/gelir oranı yüksek/);
});

test('legacy suppression CSS hides panels when V2 root is present', () => {
  const css = readFileSync(join(root, 'css/konut-results-v2.css'), 'utf8');
  assert.match(css, /\.konut-v2-root ~ \.ib-premium-dashboard/);
  assert.match(css, /\.konut-v2-root ~ \.housing-result-grid/);
  assert.match(css, /display:\s*none\s*!important/);
});

test('mobile overflow containment rules exist for housing results', () => {
  const css = readFileSync(join(root, 'css/konut-results-v2.css'), 'utf8');
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /body\.housing-page #housing-results/);
  assert.match(css, /overflow-x:\s*clip/);
});

test('renderKonutActionsBarHtml renders V2 action bar', () => {
  const html = renderKonutActionsBarHtml({ userId: 'user-1', state: sampleState });
  assert.match(html, /konut-v2-actions/);
  assert.match(html, /aria-label="Sonuç aksiyonları"/);
  assert.match(html, /data-konut-v2-pdf/);
  assert.match(html, /data-konut-v2-restart/);
  assert.match(html, /data-konut-v2-partner/);
});

test('V2 action bar includes PDF save button', () => {
  const html = renderKonutActionsBarHtml({ userId: 'user-1', state: sampleState });
  assert.match(html, /PDF olarak kaydet/);
  assert.match(html, /data-konut-v2-pdf/);
});

test('V2 action bar includes restart analysis button', () => {
  const html = renderKonutActionsBarHtml({ userId: 'user-1', state: sampleState });
  assert.match(html, /Tekrar analiz yap/);
  assert.match(html, /data-konut-v2-restart/);
});

test('V2 action bar includes partner CTA for purchase profile', () => {
  const html = renderKonutActionsBarHtml({ userId: 'user-1', state: sampleState });
  assert.match(html, /Bana uygun konut fırsatlarını göster/);
  assert.match(html, /data-konut-v2-partner/);
});

test('partner CTA switches to advisor label for investment profile', () => {
  const label = resolveKonutPartnerCtaLabel({ purchasePurpose: 'Yatırım amaçlı düşünüyorum' });
  assert.equal(label, 'Danışman/partner teklifi al');
  const html = renderKonutActionsBarHtml({
    userId: 'user-1',
    state: { purchasePurpose: 'Yatırım amaçlı düşünüyorum' }
  });
  assert.match(html, /Danışman\/partner teklifi al/);
});

test('guest users still get login hint in V2 action bar', () => {
  const html = renderKonutActionsBarHtml({ userId: null, state: sampleState });
  assert.match(html, /konut-v2-login-hint/);
  assert.match(html, /Giriş yapın/);
  assert.match(html, /returnTo=\/konut\//);
});

test('legacy actions hidden but V2 preserves user actions', () => {
  const css = readFileSync(join(root, 'css/konut-results-v2.css'), 'utf8');
  assert.match(css, /\.konut-v2-root ~ \.housing-result-actions/);
  const html = renderKonutActionsBarHtml({ userId: null, state: sampleState });
  assert.match(html, /PDF olarak kaydet/);
  assert.match(html, /Tekrar analiz yap/);
  assert.match(html, /data-konut-v2-partner/);
  assert.match(html, /konut-v2-login-hint/);
});
