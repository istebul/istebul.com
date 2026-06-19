import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildDecisionReportModel,
  buildDecisionReportSummaryText,
  copyDecisionReportSummary,
  renderDecisionReportHtml,
  REPORT_DISCLAIMER,
  REPORT_VERSION
} = await import('../../js/decision/decision-v3-report.js');
const { buildDecisionIntelligenceResult } = await import(
  '../../js/features/results/decision-intelligence-engine.js'
);
const { mapDecisionSnapshot, mapDecisionToRenderModel } = await import(
  '../../js/decision/decision-v3-mappers.js'
);

function sampleDecision(overrides = {}) {
  const intelligence = buildDecisionIntelligenceResult(
    'konut',
    { city: 'İzmir', totalBudget: 3_500_000, purchasePurpose: 'Oturmak' },
    { dti: 32, totalCost: 3_500_000 },
    { totalCost: 3_500_000 }
  );
  const snapshot = mapDecisionSnapshot(intelligence, {
    vertical: 'konut',
    totalCost: 3_500_000
  });
  const model = mapDecisionToRenderModel(intelligence, {
    vertical: 'konut',
    title: 'Konut Kararı'
  });

  return {
    ...model,
    snapshot,
    totalCost: snapshot.totalCost,
    riskScore: snapshot.riskScore,
    decisionQualityScore: snapshot.decisionQualityScore,
    ...overrides
  };
}

test('buildDecisionReportModel returns expected schema', () => {
  const decision = sampleDecision();
  const report = buildDecisionReportModel(decision, null, null);

  assert.equal(report.version, REPORT_VERSION);
  assert.ok(report.generatedAt);
  assert.equal(report.title, 'Konut Kararı');
  assert.equal(report.verticalLabel, 'Konut');
  assert.ok(typeof report.summary === 'string');
  assert.ok(report.scores);
  assert.equal(typeof report.scores.decisionScore, 'number');
  assert.equal(typeof report.scores.confidenceScore, 'number');
  assert.equal(typeof report.scores.riskScore, 'number');
  assert.equal(typeof report.scores.decisionQualityScore, 'number');
  assert.ok(Array.isArray(report.topRisks));
  assert.ok(Array.isArray(report.actionPlan));
  assert.equal(report.disclaimer, REPORT_DISCLAIMER);
});

test('buildDecisionReportModel carries scores correctly', () => {
  const decision = sampleDecision({
    decisionScore: 81,
    confidenceScore: 74,
    riskScore: 42,
    decisionQualityScore: 77,
    totalCost: 4_200_000
  });

  const report = buildDecisionReportModel(decision, null, null);
  assert.equal(report.scores.decisionScore, 81);
  assert.equal(report.scores.confidenceScore, 74);
  assert.equal(report.scores.riskScore, 42);
  assert.equal(report.scores.decisionQualityScore, 77);
  assert.equal(report.totalCost, 4_200_000);
});

test('buildDecisionReportModel carries actionPlan and topRisks', () => {
  const decision = sampleDecision({
    nextSteps: ['Adım A', 'Adım B'],
    riskAnalysis: [{ label: 'Kredi', level: 'yüksek', detail: 'DTI yüksek' }]
  });

  const report = buildDecisionReportModel(decision, null, null);
  assert.deepEqual(report.actionPlan, ['Adım A', 'Adım B']);
  assert.equal(report.topRisks.length, 1);
  assert.match(report.topRisks[0], /Kredi/);
  assert.match(report.topRisks[0], /yüksek/);
});

test('renderDecisionReportHtml returns HTML string', () => {
  const html = renderDecisionReportHtml(buildDecisionReportModel(sampleDecision(), null, null));
  assert.equal(typeof html, 'string');
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /isteBul/);
  assert.match(html, /Konut Kararı/);
});

test('renderDecisionReportHtml includes disclaimer', () => {
  const html = renderDecisionReportHtml(buildDecisionReportModel(sampleDecision(), null, null));
  assert.match(html, /bilgilendirme amaçlıdır/i);
  assert.match(html, /finansal, hukuki veya yatırım tavsiyesi değildir/i);
});

test('copy summary text is not empty', async () => {
  const text = buildDecisionReportSummaryText(buildDecisionReportModel(sampleDecision(), null, null));
  assert.ok(text.length > 0);
  assert.match(text, /isteBul Karar Özeti/);
  assert.match(text, /Karar Skoru:/);

  const result = await copyDecisionReportSummary(buildDecisionReportModel(sampleDecision(), null, null));
  assert.ok(result.text.length > 0);
});

test('missing memory and whatIf do not throw', () => {
  assert.doesNotThrow(() => {
    const report = buildDecisionReportModel(sampleDecision(), null, null);
    assert.equal(report.whatIfSummary, null);
    assert.equal(report.memorySummary, null);
    renderDecisionReportHtml(report);
  });
});

test('buildDecisionReportModel includes memory and whatIf summaries when provided', () => {
  const memory = {
    version: 'memory-lite-v1',
    profile: {
      riskPreference: 55,
      budgetDiscipline: 60,
      comfortPriority: 58,
      investmentFocus: 52,
      financeSensitivity: 49
    },
    trend: { direction: 'stable', explanation: 'Profil dengeli seyrediyor.' },
    insights: ['Finansman odaklı analizler belirgin.'],
    historyCount: 2
  };
  const whatIfResult = {
    before: { decisionScore: 70, riskScore: 40, totalCost: 3_000_000 },
    after: { decisionScore: 74, riskScore: 44, totalCost: 3_300_000 },
    delta: { decisionScore: 4, riskScore: 4, totalCost: 300_000 },
    explanation: 'Bütçe artışı karar skorunu yükseltti.'
  };

  const report = buildDecisionReportModel(sampleDecision(), memory, whatIfResult);
  assert.ok(report.whatIfSummary);
  assert.match(report.whatIfSummary, /Bütçe artışı/);
  assert.ok(report.memorySummary);
  assert.equal(report.memorySummary.trend, 'Profil dengeli seyrediyor.');
});
