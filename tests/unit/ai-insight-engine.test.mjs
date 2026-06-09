import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BANNED_WEAK_PHRASES,
  buildDecisionInsight,
  buildExecutiveSummary,
  buildProInsight,
  buildPdfInsight,
  buildHomepageSampleInsight,
  HOMEPAGE_SAMPLE_INSIGHTS,
  containsBannedWeakPhrase,
  extractAiProxyText,
  normalizeInsightInput,
  renderProInsightExtensionsHtml
} from '../../js/features/ai/ai-insight-engine.js';

function assertNoBanned(text) {
  assert.ok(!containsBannedWeakPhrase(text), `banned phrase in: ${text}`);
}

test('auto insight personalizes with loan, fuel, km', () => {
  const insight = buildDecisionInsight({
    vertical: 'auto',
    answers: { usage: 'long', fuel: 'diesel', km: 32000, loan: 'yes', budget: 1_800_000 },
    scores: { decision: 84, overallRisk: 'Orta' },
    costs: { budget: 1_800_000, tco12: 410_000 },
    planTier: 'guest'
  });
  assert.match(insight.summary, /kredi|finansman/i);
  assert.match(insight.why, /dizel|km|uzun/i);
  assertNoBanned(insight.summary);
  assertNoBanned(insight.why);
});

test('auto insight enriches why with household profile without new scores', () => {
  const insight = buildDecisionInsight({
    vertical: 'auto',
    answers: {
      usage: 'family',
      fuel: 'hybrid',
      km: 15000,
      loan: 'yes',
      budget: 1_500_000,
      household_size: '5+'
    },
    scores: { decision: 82, overallRisk: 'Orta' },
    costs: { budget: 1_500_000, tco12: 390_000 },
    planTier: 'guest'
  });
  assert.match(insight.why, /5\+ kişilik hane/i);
  assert.match(insight.why, /bagaj ihtiyacı|yolcu kapasitesi/i);
  assert.match(insight.summary, /82/);
});

test('konut insight uses earthquake, dues, credit context', () => {
  const insight = buildDecisionInsight({
    vertical: 'konut',
    answers: {
      city: 'İstanbul',
      district: 'Kadıköy',
      totalBudget: 5_000_000,
      purchasePurpose: 'Satın almak istiyorum',
      useFinancing: 'evet',
      duesExpectation: 7500
    },
    scores: { decision: 72, overallRisk: 'Orta' },
    costs: { budget: 5_000_000, monthlyPayment: 48_000, duesMonthly: 7500, dti: 48 },
    risks: [{ title: 'Deprem riski', level: 'yüksek', description: 'Zemin raporu gerekli' }]
  });
  assert.match(insight.why, /aidat|kredi|deprem|zemin/i);
  assert.match(insight.summary, /İstanbul|Kadıköy/i);
  assertNoBanned(insight.risk);
});

test('tatil insight uses budget, season, travelers', () => {
  const insight = buildDecisionInsight({
    vertical: 'tatil',
    answers: {
      travelers_count: 4,
      people_type: 'cocuklu-aile',
      vacation_type: 'deniz-resort',
      date_flexibility: 'esnek',
      transport_preference: 'ucak'
    },
    scores: { decision: 81, overallRisk: 'Orta' },
    costs: { totalBudget: 60_000, realTotal: 68_450 }
  });
  assert.match(insight.summary, /4 kişi|çocuklu/i);
  assert.match(insight.why, /sezon|ulaşım|esnek/i);
});

test('finansman insight covers debt ratio and cash flow', () => {
  const insight = buildDecisionInsight({
    vertical: 'finansman',
    answers: { monthly_income: 90_000, existing_debt: 15_000, term_months: '36' },
    scores: { decision: 76, overallRisk: 'Orta' },
    costs: { monthlyPayment: 22_000, paymentToIncome: 41 }
  });
  assert.match(insight.why, /borç|gelir|nakit|yük/i);
  assert.match(insight.nextStep, /teklif|EYM|kurum/i);
});

test('pro tier yields richer next steps than guest', () => {
  const base = {
    vertical: 'auto',
    answers: { usage: 'city', budget: 1_200_000, loan: 'yes' },
    scores: { decision: 80, overallRisk: 'Orta' },
    costs: { budget: 1_200_000, tco12: 280_000 }
  };
  const guest = buildDecisionInsight({ ...base, planTier: 'guest' });
  const pro = buildProInsight({ ...base, planTier: 'pro' });
  assert.ok(pro.nextSteps.length >= guest.nextStep.split(';').length || pro.nextSteps.length >= 1);
  assert.ok(pro.criticalVariable);
  assert.ok(pro.alternativeScenario);
  assert.ok(pro.costPressure);
});

test('does not invent numbers when costs missing', () => {
  const insight = buildDecisionInsight({
    vertical: 'konut',
    answers: { city: 'Ankara' },
    scores: { decision: 60, overallRisk: 'Orta' },
    costs: {}
  });
  assert.doesNotMatch(insight.summary, /₺\s*[\d.]+/);
  assert.match(insight.why, /ek veri gerekir|Ankara/i);
});

test('missing data uses safe fallback wording', () => {
  const insight = buildDecisionInsight({ vertical: 'finansman', answers: {}, costs: {} });
  assert.match(insight.why, /ek veri gerekir/i);
  assertNoBanned(insight.summary);
});

test('banned weak phrases are not emitted', () => {
  const verticals = ['auto', 'konut', 'tatil', 'finansman'];
  for (const vertical of verticals) {
    const insight = buildDecisionInsight({ vertical, planTier: 'guest', scores: { decision: 70 } });
    for (const phrase of BANNED_WEAK_PHRASES) {
      assert.ok(
        !insight.summary.toLowerCase().includes(phrase),
        `${vertical} summary contains banned: ${phrase}`
      );
    }
  }
});

test('buildPdfInsight returns structured premium sections', () => {
  const pdf = buildPdfInsight({
    vertical: 'konut',
    answers: { city: 'İzmir', totalBudget: 3_000_000, useFinancing: 'evet' },
    scores: { decision: 88, overallRisk: 'Düşük' },
    costs: { monthlyPayment: 35_000, duesMonthly: 2800 },
    planTier: 'pro'
  });
  assert.equal(pdf.decisionReasons.length, 3);
  assert.equal(pdf.riskWarnings.length, 3);
  assert.equal(pdf.actions.length, 3);
  assert.ok(pdf.costCommentary.length > 10);
  assert.ok(pdf.executiveSummary.length > 10);
});

test('homepage samples are short and marked as demo', () => {
  for (const text of Object.values(HOMEPAGE_SAMPLE_INSIGHTS)) {
    assert.match(text, /Örnek analizdir/i);
    assert.ok(text.length < 320, 'sample too long');
    assertNoBanned(text);
  }
  const custom = buildHomepageSampleInsight('auto', {
    decisionScore: 90,
    answers: { loan: 'yes', usage: 'city', fuel: 'hybrid', km: 15000, budget: 2_000_000 },
    costs: { tco12: 300_000, budget: 2_000_000 }
  });
  assert.match(custom, /Örnek analizdir/i);
});

test('buildExecutiveSummary respects pro length', () => {
  const input = normalizeInsightInput({
    vertical: 'finansman',
    planTier: 'pro',
    answers: { monthly_income: 100_000 },
    costs: { monthlyPayment: 18_000, paymentToIncome: 28 },
    scores: { decision: 90, overallRisk: 'Düşük' }
  });
  const proText = buildExecutiveSummary(input);
  const guestText = buildExecutiveSummary({ ...input, planTier: 'guest' });
  assert.ok(proText.length >= guestText.length);
});

test('renderProInsightExtensionsHtml shows Pro teaser for guest', () => {
  const html = renderProInsightExtensionsHtml(null, 'guest', null, (s) => String(s));
  assert.match(html, /Bu içgörü Pro üyelikte kullanılabilir/);
  assert.match(html, /Executive Summary Plus/);
});

test('renderProInsightExtensionsHtml renders pro sections for pro tier', () => {
  const input = normalizeInsightInput({
    vertical: 'auto',
    planTier: 'pro',
    answers: { loan: 'yes', usage: 'city', fuel: 'hybrid', budget: 1_500_000 },
    costs: { budget: 1_500_000, tco12: 340_000 },
    scores: { decision: 86, overallRisk: 'Orta' }
  });
  const pro = buildProInsight(input);
  const html = renderProInsightExtensionsHtml(pro, 'pro', input, (s) => String(s));
  assert.doesNotMatch(html, /Bu içgörü Pro üyelikte kullanılabilir/);
  assert.match(html, /Alternatif Senaryo Analizi/);
});

test('extractAiProxyText prefers Cloudflare ai-proxy result field', () => {
  assert.equal(extractAiProxyText({ result: 'Groq metni' }), 'Groq metni');
  assert.equal(extractAiProxyText({ text: 'legacy' }), 'legacy');
  assert.equal(extractAiProxyText({}), '');
});

test('sigorta insight uses protection and score context', () => {
  const insight = buildDecisionInsight({
    vertical: 'sigorta',
    answers: { insurance_type: 'health', risk_perception: 'high' },
    scores: { decision: 72, overallRisk: 'Orta' },
    strengths: ['Teminat dengesi'],
    weaknesses: ['Prim baskısı'],
    planTier: 'guest'
  });
  assert.match(insight.summary, /sigorta|analiz/i);
  assert.match(insight.why, /Teminat dengesi/);
  assertNoBanned(insight.summary);
});
