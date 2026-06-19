import test from 'node:test';
import assert from 'node:assert/strict';

const { buildRecommendationIntelligence, renderComparisonMatrix } = await import(
  '../../js/auto/recommendation-intelligence.js'
);

test('buildRecommendationIntelligence returns score dimensions', () => {
  const intel = buildRecommendationIntelligence(
    {
      name: 'A',
      score: 84,
      price: 1200000,
      maintenance: 8,
      resale: 7,
      reasons: ['Uyum'],
      risks: ['Risk'],
      confidenceMeta: { score: 72 },
      costs: { total: 180000, ownership: { depreciation: { liquidityScore: 70 } } }
    },
    { budget: 1500000 },
    { alternatives: [], rank: 0, leader: { name: 'A', score: 84 } }
  );
  assert.equal(intel.intelligenceVersion, 'auto-v2');
  assert.ok(intel.budgetFitScore >= 50);
  assert.ok(intel.operatingCostScore >= 0);
});

test('renderComparisonMatrix outputs table for two vehicles', () => {
  const html = renderComparisonMatrix(
    [
      { name: 'A', score: 80, costs: { total: 200000, ownership: { totals: { months12: 220000 } } }, confidenceMeta: { score: 70 } },
      { name: 'B', score: 75, costs: { total: 190000, ownership: { totals: { months12: 210000 } } }, confidenceMeta: { score: 65 } }
    ],
  );
  assert.match(html, /ib-auto-compare-table/);
  assert.match(html, /Model A|A/);
  assert.doesNotMatch(html, /199999999999996/);
});
