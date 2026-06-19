import test from 'node:test';
import assert from 'node:assert/strict';

const { buildDecisionInsightPanels } = await import(
  '../../js/features/moat/decision-insight-panels.js'
);

test('buildDecisionInsightPanels uses vehicle reasons and risks when present', () => {
  const panels = buildDecisionInsightPanels(
    {
      name: 'Test Sedan',
      score: 82,
      reasons: ['Düşük TCO', 'Uygun finansman'],
      risks: ['Sigorta primi değişken'],
      costs: { total: 480000 }
    },
    { budget: 600000, usage: 'sehir' },
    { alternatives: [{ name: 'Alt Model', score: 75 }], rank: 0 }
  );

  assert.match(panels.whyThisRecommendation, /Düşük TCO/);
  assert.match(panels.risks, /Sigorta/);
  assert.ok(panels.budgetPressure);
  assert.ok(panels.confidenceLevel);
  assert.ok(panels.notSuitableFor);
});

test('buildDecisionInsightPanels reflects budget pressure when TCO exceeds budget', () => {
  const panels = buildDecisionInsightPanels(
    { name: 'Premium SUV', score: 65, costs: { total: 720000 } },
    { budget: 480000 }
  );

  assert.match(panels.budgetPressure, /aşıyor|yüksek/i);
});
