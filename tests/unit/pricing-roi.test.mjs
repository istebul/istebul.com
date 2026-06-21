import test from 'node:test';
import assert from 'node:assert/strict';

import { PLANS } from '../../js/features/monetization/plans.js';
import {
  calculatePricingRoi,
  getAnnualSavingsFacts,
  parseDisplayAmount,
  buildRoiSummaryCopy
} from '../../js/features/monetization/pricing-roi.js';

test('parseDisplayAmount parses Turkish lira display', () => {
  assert.equal(parseDisplayAmount('₺299'), 299);
  assert.equal(parseDisplayAmount('₺2.870'), 2870);
});

test('getAnnualSavingsFacts uses listed monthly vs annual prices', () => {
  const facts = getAnnualSavingsFacts();
  assert.equal(facts.twelveMonthly, facts.monthly * 12);
  assert.equal(facts.savingsAmount, facts.twelveMonthly - facts.annual);
  assert.ok(facts.savingsPercent >= 15 && facts.savingsPercent <= 25);
});

test('calculatePricingRoi scales drift with budget and percent', () => {
  const base = calculatePricingRoi({
    purchaseBudget: 1_000_000,
    costDriftPercent: 2,
    billing: 'annual'
  });
  const annualDisplay = PLANS.pro.billing.annual.priceDisplay;
  const expectedAnnualYearlyCost = parseDisplayAmount(annualDisplay) || 1990;

  assert.equal(base.driftCost, 20_000);
  assert.equal(
    base.proYearlyCost,
    expectedAnnualYearlyCost,
    'annual Pro cost uses parsed priceDisplay or 1990 fallback when copy has no digits'
  );
  assert.ok(base.coverageRatio > 5);
});

test('buildRoiSummaryCopy mentions drift and pro cost', () => {
  const result = calculatePricingRoi({
    purchaseBudget: 800_000,
    costDriftPercent: 2,
    billing: 'monthly'
  });
  const copy = buildRoiSummaryCopy(result);
  assert.ok(copy.includes('TCO') || copy.includes('sapma'));
  assert.ok(copy.length > 40);
});
