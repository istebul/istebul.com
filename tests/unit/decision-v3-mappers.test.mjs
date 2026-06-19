import test from 'node:test';
import assert from 'node:assert/strict';

const { mapDecisionSnapshot, mapDecisionToRenderModel } = await import(
  '../../js/decision/decision-v3-mappers.js'
);
const { buildDecisionIntelligenceResult } = await import(
  '../../js/features/results/decision-intelligence-engine.js'
);

test('mapDecisionSnapshot maps intelligence to storage schema', () => {
  const intelligence = buildDecisionIntelligenceResult(
    'finansman',
    { monthly_income: 60_000, existing_debt: 4_000 },
    {},
    { primaryResult: { metrics: { monthlyPayment: 18_000 } } }
  );

  const snapshot = mapDecisionSnapshot(intelligence, {
    vertical: 'finansman',
    totalCost: 420_000,
    badges: ['term-36']
  });

  assert.equal(snapshot.vertical, 'finansman');
  assert.ok(snapshot.decisionScore >= 0 && snapshot.decisionScore <= 100);
  assert.ok(snapshot.confidenceScore >= 0 && snapshot.confidenceScore <= 100);
  assert.ok(snapshot.riskScore >= 0 && snapshot.riskScore <= 100);
  assert.ok(snapshot.decisionQualityScore >= 0 && snapshot.decisionQualityScore <= 100);
  assert.equal(snapshot.totalCost, 420_000);
  assert.deepEqual(snapshot.badges, ['term-36']);
  assert.ok(snapshot.createdAt);
});

test('mapDecisionToRenderModel includes optional memory block', () => {
  const intelligence = buildDecisionIntelligenceResult('auto', { budget: 900_000 }, { totalCost: 950_000 });
  const memory = {
    version: 'memory-lite-v1',
    profile: {
      riskPreference: 55,
      budgetDiscipline: 60,
      comfortPriority: 58,
      investmentFocus: 52,
      financeSensitivity: 49
    },
    trend: { direction: 'stable', explanation: 'Test trend' },
    insights: ['Insight 1'],
    historyCount: 2
  };

  const model = mapDecisionToRenderModel(intelligence, { vertical: 'auto', memory, title: 'Araç Kararı' });

  assert.equal(model.vertical, 'auto');
  assert.equal(model.title, 'Araç Kararı');
  assert.ok(Array.isArray(model.nextSteps));
  assert.equal(model.memory.version, 'memory-lite-v1');
});

test('mapDecisionSnapshot normalizes legacy vertical aliases', () => {
  const snapshot = mapDecisionSnapshot(
    { decisionScore: 70, confidenceScore: 65, riskAnalysis: [] },
    { vertical: 'finans' }
  );
  assert.equal(snapshot.vertical, 'finansman');
});
