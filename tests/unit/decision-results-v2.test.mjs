import test from 'node:test';
import assert from 'node:assert/strict';

const {
  autoResultAdapter,
  housingResultAdapter,
  travelResultAdapter,
  financeResultAdapter,
  trackDecisionV2Event
} = await import('../../js/core/decision-results-v2.js');

const { renderDecisionResultsV2Html } = await import('../../js/ui/decision-results-ui.js');

const { computeHousingDecisionV2 } = await import('../../js/core/housing-decision-engine-v2.js');

const { computeFinanceWizardV2, computeFinansVerticalV2 } = await import(
  '../../js/core/finance-decision-engine-v2.js'
);

test('computeHousingDecisionV2 penalizes missing city', () => {
  const withCity = computeHousingDecisionV2({ city: 'İstanbul', district: 'Kadıköy' }, { score: 70 });
  const without = computeHousingDecisionV2({}, { score: 70 });
  assert.ok(withCity.confidenceScore > without.confidenceScore);
  assert.ok(withCity.dataGaps.length === 0);
  assert.ok(without.dataGaps.some((g) => g.includes('İl')));
});

test('computeFinanceWizardV2 returns gap message when income missing', () => {
  const v2 = computeFinanceWizardV2({ loanAmount: 500_000, termMonths: 36, monthlyRate: 2.5 }, {});
  assert.match(v2.gapMessage, /gelir/i);
  assert.ok(v2.confidenceScore < 90);
});

test('computeFinansVerticalV2 produces decision score', () => {
  const v2 = computeFinansVerticalV2(
    { amount_range: 'orta', term_months: '36', monthly_income: 50_000 },
    { score: 72, metrics: { monthlyPayment: 18_000, totalRepay: 648_000, months: 36 } }
  );
  assert.ok(v2.financeDecisionScore >= 35 && v2.financeDecisionScore <= 96);
});

test('autoResultAdapter maps top result', () => {
  const data = autoResultAdapter({
    topResult: {
      name: 'Test Araç',
      score: 82,
      reasons: ['Uygun'],
      risks: ['Faiz değişken'],
      costs: { total: 1_200_000 }
    },
    formData: {},
    results: []
  });
  assert.equal(data.category, 'auto');
  assert.equal(data.decisionScore, 82);
  assert.ok(data.strengths.includes('Uygun'));
});

test('financeResultAdapter supports wizard shape', () => {
  const data = financeResultAdapter({
    state: { loanAmount: 400_000, termMonths: 24, monthlyRate: 2, monthlyIncome: 40_000 },
    metrics: {
      monthlyPayment: 20_000,
      totalRepayment: 480_000,
      decisionScore: 71,
      paymentComfort: 68,
      cashFlowFit: 70,
      dti: 38,
      risk: { label: 'Orta', score: 45 }
    },
    scenarios: []
  });
  assert.equal(data.category, 'finansman');
  assert.ok(data.decisionScore >= 20);
});

test('renderDecisionResultsV2Html includes V2 blocks', () => {
  const html = renderDecisionResultsV2Html({
    category: 'tatil',
    categoryLabel: 'Tatil',
    decisionScore: 77,
    confidenceScore: 85,
    riskLevel: 'Orta',
    totalCost: { label: 'Toplam', value: '₺50.000' },
    strengths: ['A'],
    weaknesses: ['B'],
    alternatives: [{ title: 'Alt', description: 'neden' }],
    executiveSummary: 'Özet metni',
    nextSteps: ['Adım 1']
  });
  assert.match(html, /Karar Skoru/);
  assert.match(html, /Güven Skoru/);
  assert.match(html, /AI Executive Summary/);
  assert.match(html, /Karar Raporunu İndir/);
});

test('trackDecisionV2Event does not throw without trackFn', () => {
  assert.doesNotThrow(() => trackDecisionV2Event('decision_result_v2_view', { category: 'auto' }));
});

test('housingResultAdapter includes sub-scores', () => {
  const data = housingResultAdapter({
    state: { city: 'Ankara', purchasePurpose: 'Satın almak istiyorum' },
    metrics: {
      score: 68,
      risk: { label: 'Orta' },
      ownership: { realTotal: 3_000_000, monthlyPayment: 45_000 },
      locationFit: 70,
      investmentPotential: 65
    },
    ai: { text: 'test' },
    scenarios: [],
    attention: [],
    nextStep: 'Ekspertiz'
  });
  assert.equal(data.category, 'konut');
  assert.ok(data.subScores.some((s) => s.label === 'Nihai skor'));
});
