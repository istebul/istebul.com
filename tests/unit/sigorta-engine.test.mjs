import test from 'node:test';
import assert from 'node:assert/strict';

const {
  computeProtectionScore,
  computeCoverageAdequacyScore,
  computeCostEfficiencyScore,
  computeOverallDecisionScore,
  buildRiskAnalysis,
  buildEngineResult
} = await import('../../js/features/sigorta/sigorta-engine.js');

const { buildSigortaAiSummary } = await import('../../js/features/sigorta/sigorta-ai-summary.js');
const { buildSigortaPdfPayload } = await import('../../js/features/sigorta/sigorta-pdf.js');

const sampleState = {
  insurance_type: 'saglik',
  age: 38,
  children_count: '2',
  risk_perception: 'yuksek',
  budget_level: 'orta'
};

test('computeOverallDecisionScore uses weighted formula', () => {
  const protection = computeProtectionScore(sampleState);
  const coverage = computeCoverageAdequacyScore(sampleState);
  const costEfficiency = computeCostEfficiencyScore(sampleState);
  const result = computeOverallDecisionScore(sampleState);

  const expected = Math.round(protection * 0.35 + coverage * 0.35 + costEfficiency * 0.3);
  assert.equal(result.overall, expected);
  assert.equal(result.protection, protection);
  assert.equal(result.coverage, coverage);
  assert.equal(result.costEfficiency, costEfficiency);
  assert.ok(result.overall >= 0 && result.overall <= 100);
});

test('buildRiskAnalysis returns six categories', () => {
  const risks = buildRiskAnalysis(sampleState);
  assert.equal(risks.length, 6);
  assert.ok(risks.every((r) => r.title && r.level && r.description && r.recommendation));
});

test('buildSigortaAiSummary does not mutate engine scores', () => {
  const engine = buildEngineResult(sampleState);
  const beforeDecision = engine.decisionScore;
  const beforeProtection = engine.protectionScore;
  const beforeScores = { ...engine.scores };
  const ai = buildSigortaAiSummary(engine, sampleState);
  assert.ok(ai.summary.length > 50);
  assert.equal(ai.source, 'deterministic');
  assert.equal(engine.decisionScore, beforeDecision);
  assert.equal(engine.protectionScore, beforeProtection);
  assert.deepEqual(engine.scores, beforeScores);
  assert.ok(ai.scoresSnapshot.decisionScore === engine.decisionScore);
});

test('buildSigortaPdfPayload includes scores and profile', () => {
  const pdf = buildSigortaPdfPayload({ state: sampleState });
  assert.equal(pdf.category, 'sigorta');
  assert.equal(pdf.decisionScore, buildEngineResult(sampleState).decisionScore);
  assert.ok(pdf.riskAnalysis.length === 6);
  assert.ok(pdf.executiveSummary);
  assert.ok(pdf.profile.insuranceType);
  assert.ok(pdf.scoreFactors.length === 3);
});

test('high risk with low budget lowers coverage score', () => {
  const weak = computeCoverageAdequacyScore({
    ...sampleState,
    budget_level: 'dusuk',
    risk_perception: 'yuksek'
  });
  const strong = computeCoverageAdequacyScore({
    ...sampleState,
    budget_level: 'yuksek',
    risk_perception: 'yuksek'
  });
  assert.ok(strong > weak);
});
