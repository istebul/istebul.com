import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const {
  computeDecisionScore,
  computeConfidenceScore,
  buildRiskAnalysis,
  buildTotalCostView,
  buildAlternatives,
  buildFinansmanResultsV2Payload,
  buildBddkBandExamples,
  syncCanonicalFinansScores,
  resolvePrimaryFinansResult,
  isGenericFinansAlternative
} = await import('../../js/features/finansman/finansman-results-v2.js');

const sampleState = {
  purpose: 'konut',
  amount_range: '1m',
  term_months: '36',
  capacity_range: '25k',
  monthly_income: 55_000,
  monthly_expense: 18_000,
  existing_debt: 6_000,
  income_type: 'stabil',
  early_payment: 'belki',
  rate_sensitivity: 'orta',
  risk_tolerance: 'dengeli'
};

const sampleResults = [
  {
    id: 'logical',
    title: 'Konut — Dengeli vade',
    score: 74,
    why: 'Dengeli vade ile aylık ve toplam maliyet dengesi.',
    badge: { label: 'En Dengeli Senaryo' },
    metrics: {
      monthlyPayment: 36_963,
      totalRepay: 1_330_668,
      cashPressure: 'Yüksek'
    }
  },
  {
    id: 'economic',
    title: 'Konut — Uzun vade / düşük taksit',
    score: 78,
    why: 'Uzun vade ile aylık yükü düşürür.',
    badge: { label: 'En Düşük Aylık Yük' },
    metrics: {
      monthlyPayment: 31_200,
      totalRepay: 1_495_200,
      cashPressure: 'Orta'
    }
  },
  {
    id: 'comfort',
    title: 'Konut — Kısa vade',
    score: 72,
    why: 'Kısa vade ile toplam faiz düşebilir.',
    badge: { label: 'Esnek Nakit Akışı' },
    metrics: {
      monthlyPayment: 42_500,
      totalRepay: 1_275_000,
      cashPressure: 'Yüksek'
    }
  }
];

test('decisionScore is between 0 and 100', () => {
  const score = computeDecisionScore(sampleState, sampleResults[0]);
  assert.ok(score >= 0 && score <= 100);
});

test('confidenceScore is between 0 and 100', () => {
  const full = computeConfidenceScore(sampleState);
  const partial = computeConfidenceScore({ purpose: 'arac' });
  assert.ok(full >= 0 && full <= 100);
  assert.ok(partial >= 0 && partial <= 100);
  assert.ok(full > partial);
});

test('syncCanonicalFinansScores overwrites legacy scenario scores', () => {
  const results = sampleResults.map((r) => ({ ...r, score: 99 }));
  syncCanonicalFinansScores(sampleState, results, 'logical');
  assert.ok(results.every((r) => r.score >= 0 && r.score <= 100));
  assert.ok(results.every((r) => r.score !== 99));
  results.forEach((r, index) => {
    assert.equal(r.score, computeDecisionScore(sampleState, sampleResults[index]));
  });
  assert.ok(results[1].score > results[0].score);
});

test('buildRiskAnalysis returns six risk headings', () => {
  const risks = buildRiskAnalysis(sampleState, sampleResults[0]);
  assert.equal(risks.length, 6);
  assert.ok(risks.every((r) => r.title && ['düşük', 'orta', 'yüksek'].includes(r.level)));
});

test('buildTotalCostView includes extended TCO estimate fields', () => {
  const cost = buildTotalCostView(sampleState, sampleResults[0]);
  assert.ok(cost.principal > 0);
  assert.ok(cost.monthlyPayment > 0);
  assert.ok(cost.totalRepayment > 0);
  assert.ok(cost.kkdfBsmvEstimate >= 0);
  assert.ok(cost.insuranceEstimate >= 0);
  assert.ok(cost.effectiveAnnualRate != null);
});

test('buildAlternatives returns TRY-rich descriptions', () => {
  const alts = buildAlternatives(sampleState, sampleResults, 'logical');
  assert.ok(alts.length >= 3);
  assert.ok(alts.every((a) => /Aylık taksit|₺/.test(a.description)));
  assert.ok(alts.every((a) => a.why && a.why.length > 0));
});

test('isGenericFinansAlternative detects V3 placeholder text', () => {
  assert.equal(
    isGenericFinansAlternative({ description: 'Toplam faizi düşürmek için vade kısaltma' }),
    true
  );
  assert.equal(
    isGenericFinansAlternative({
      description: 'Aylık taksit: ₺31.200 · Toplam geri ödeme: ₺1.495.200'
    }),
    false
  );
});

test('buildFinansmanResultsV2Payload uses canonical decisionScore in PDF', () => {
  const payload = buildFinansmanResultsV2Payload({
    state: sampleState,
    results: sampleResults,
    selectedOption: 'logical'
  });
  assert.ok(payload.pdfReportData);
  assert.equal(payload.pdfReportData.decisionScore, payload.decisionScore);
  assert.equal(payload.riskAnalysis.length, 6);
  assert.ok(payload.alternatives.every((a) => a.description && /₺|taksit/i.test(a.description)));
});

test('selected scenario updates hero TCO and decisionScore', () => {
  const logical = buildFinansmanResultsV2Payload({
    state: sampleState,
    results: sampleResults,
    selectedOption: 'logical'
  });
  const economic = buildFinansmanResultsV2Payload({
    state: sampleState,
    results: sampleResults,
    selectedOption: 'economic'
  });

  assert.equal(resolvePrimaryFinansResult(sampleResults, 'economic')?.id, 'economic');
  assert.notEqual(logical.totalCost.monthlyPayment, economic.totalCost.monthlyPayment);
  assert.equal(economic.selectedOption, 'economic');
  assert.ok(economic.alternatives.some((a) => a.id === 'economic' && a.isSelected));
});

test('BDDK band examples are independent from selected monthly payment', () => {
  const payload = buildFinansmanResultsV2Payload({
    state: sampleState,
    results: sampleResults,
    selectedOption: 'logical'
  });
  const bands = buildBddkBandExamples(sampleState);
  assert.ok(bands.low > 0 && bands.mid > 0 && bands.high > 0);
  assert.notEqual(bands.low, payload.totalCost.monthlyPayment);
  assert.ok(bands.low < bands.high);
});

test('legacy suppression CSS hides panels when V2 root is present', () => {
  const css = readFileSync(join(root, 'css/finansman-results-v2.css'), 'utf8');
  assert.match(css, /\.finansman-v2-root ~ \.ib-premium-dashboard/);
  assert.match(css, /\.finansman-v2-root ~ \.vacation-result-cards/);
  assert.match(css, /display:\s*none\s*!important/);
});

test('mobile overflow containment rules exist for finans results', () => {
  const css = readFileSync(join(root, 'css/finansman-mobile-results.css'), 'utf8');
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /body\.finans-page #finans-results/);
  assert.match(css, /overflow-x:\s*clip/);
});
