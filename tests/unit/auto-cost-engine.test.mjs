import test from 'node:test';
import assert from 'node:assert/strict';

const { buildOwnershipCosts, normalizeOwnershipForm } = await import('../../js/auto/cost-engine.js');
const { computeDepreciationProfile } = await import('../../js/auto/depreciation-engine.js');

test('normalizeOwnershipForm sets city ratio from usage', () => {
  const form = normalizeOwnershipForm({ usage: 'city', km: 12000 });
  assert.equal(form.city_ratio, 0.85);
  assert.equal(form.km, 12000);
});

test('buildOwnershipCosts returns ownership breakdown and legacy totals', () => {
  const costs = buildOwnershipCosts(
    { name: 'Test', price: 1000000, fuel: 'gasoline', body: 'sedan', maintenance: 7, resale: 6 },
    { km: 15000, loan: 'yes', ownership_months: 36 }
  );
  assert.ok(costs.total > 0);
  assert.ok(costs.ownership?.purchaseCost === 1000000);
  assert.ok(costs.ownership?.totals?.months12 > 0);
  assert.ok(costs.ownership?.annual?.fuel >= 0);
  assert.ok(costs.ownership?.depreciation?.value12 > 0);
});

test('computeDepreciationProfile returns liquidity and value estimates', () => {
  const dep = computeDepreciationProfile(
    { price: 2000000, fuel: 'hybrid', body: 'suv', resale: 8, year: 2024 },
    { ownership_months: 36 }
  );
  assert.ok(dep.value12 < dep.purchasePrice);
  assert.ok(dep.liquidityScore >= 20 && dep.liquidityScore <= 95);
  assert.ok(dep.resaleRiskScore >= 15);
});
