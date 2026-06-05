import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const {
  computeDecisionScore,
  computeConfidenceScore,
  buildRiskAnalysis,
  buildTotalCostView,
  buildAlternatives,
  buildTatilResultsV2Payload,
  syncCanonicalTatilScore,
  renderTatilActionsBarHtml
} = await import('../../js/features/tatil/tatil-results-v2.js');

const { buildReportHtml } = await import('../../js/features/results/pdf-report.js');

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
  title: 'Antalya Aile Resort',
  description: 'Deniz ve çocuk dostu resort',
  estimatedCost: '95.000 ₺',
  why: 'Çocuklu aile profiliniz ile uyumlu',
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
  },
  alternatives: [
    {
      title: 'Kaş (Antalya) alternatifi',
      reason: 'Daha düşük yoğunluk',
      delta: 'Maliyet ~%11 daha düşük',
      cost: '84.500 ₺',
      risk: 'Düşük-Orta',
      score: 86
    }
  ]
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

test('buildTotalCostView fills canonical cost fields', () => {
  const cost = buildTotalCostView(sampleState, sampleResult);
  assert.ok(cost.accommodation > 0);
  assert.ok(cost.transport > 0);
  assert.ok(cost.realTotal > 0);
  assert.ok(cost.reserveCost > 0);
  assert.equal(cost.totalBudget, cost.realTotal + cost.reserveCost);
  assert.ok(cost.perPerson > 0);
});

test('buildAlternatives returns destination-based items with costs', () => {
  const cost = buildTotalCostView(sampleState, sampleResult);
  const alts = buildAlternatives(sampleState, [sampleResult], cost);
  assert.ok(alts.length >= 3);
  assert.ok(alts.some((a) => a.title.includes('Kaş')));
  assert.ok(alts.every((a) => a.description && a.description.length > 10));
  assert.ok(alts.some((a) => a.why));
});

test('syncCanonicalTatilScore overwrites legacy scenario scores', () => {
  const results = [
    { ...sampleResult, score: 78 },
    { ...sampleResult, id: 'economic', score: 62 }
  ];
  const summary = { fitScore: 78, scoreBand: 'Eski' };
  const decisionScore = syncCanonicalTatilScore(sampleState, results, summary);
  assert.equal(results[0].score, decisionScore);
  assert.equal(results[1].score, decisionScore);
  assert.equal(summary.fitScore, decisionScore);
  assert.equal(computeDecisionScore(sampleState, sampleResult), decisionScore);
});

test('buildTatilResultsV2Payload includes pdfReportData with canonical score', () => {
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
  assert.equal(payload.totalCost.totalBudget, payload.totalCost.realTotal + payload.totalCost.reserveCost);
  assert.ok(payload.alternatives.some((a) => a.title.includes('Kaş')));
});

test('PDF report uses same decision score and cost fields as V2 payload', () => {
  const payload = buildTatilResultsV2Payload({
    state: sampleState,
    results: [sampleResult]
  });
  const html = buildReportHtml(payload.pdfReportData);
  assert.match(html, new RegExp(String(payload.decisionScore)));
  assert.match(html, /Toplam tatil bütçesi|Konaklama tahmini/);
});

test('legacy suppression CSS hides panels when V2 root is present', () => {
  const css = readFileSync(join(root, 'css/tatil-results-v2.css'), 'utf8');
  assert.match(css, /\.tatil-v2-root ~ \.ib-premium-dashboard/);
  assert.match(css, /\.tatil-v2-root ~ \.vacation-cost-panel/);
  assert.match(css, /\.tatil-v2-root ~ \.vacation-alternative-panel/);
  assert.match(css, /display:\s*none\s*!important/);
});

test('mobile overflow containment rules exist for tatil results', () => {
  const css = readFileSync(join(root, 'css/tatil-mobile-results.css'), 'utf8');
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /body\.vacation-page #vacation-results/);
  assert.match(css, /overflow-x:\s*clip/);
});

test('renderTatilActionsBarHtml renders V2 action bar', () => {
  const html = renderTatilActionsBarHtml({ userId: 'user-1' });
  assert.match(html, /tatil-v2-actions/);
  assert.match(html, /aria-label="Sonuç aksiyonları"/);
  assert.match(html, /data-tatil-v2-pdf/);
  assert.match(html, /data-tatil-v2-restart/);
  assert.match(html, /data-tatil-v2-partner/);
  assert.match(html, /Tekrar planla/);
  assert.match(html, /Teklif iste/);
});

test('guest users get login hint in V2 action bar', () => {
  const html = renderTatilActionsBarHtml({ userId: null });
  assert.match(html, /tatil-v2-login-hint/);
  assert.match(html, /Giriş yapın/);
  assert.match(html, /returnTo=\/tatil\//);
});
