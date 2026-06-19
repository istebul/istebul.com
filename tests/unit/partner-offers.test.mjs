import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PARTNER_PRODUCT_TIERS,
  normalizeBillingPlan,
  isAllowedBillingPlan,
  buildOfferApplicationUrl,
  renderComparisonTable,
  renderProductTierCards
} from '../../js/features/partner/partner-offers.js';

test('PARTNER_PRODUCT_TIERS includes starter growth enterprise', () => {
  const ids = PARTNER_PRODUCT_TIERS.map((t) => t.id);
  assert.deepEqual(ids, ['starter', 'growth', 'enterprise']);
});

test('normalizeBillingPlan maps legacy aliases', () => {
  assert.equal(normalizeBillingPlan('cpl'), 'starter');
  assert.equal(normalizeBillingPlan('subscription'), 'growth');
  assert.equal(normalizeBillingPlan('enterprise'), 'enterprise');
});

test('isAllowedBillingPlan accepts pilot and legacy', () => {
  assert.equal(isAllowedBillingPlan('pilot'), true);
  assert.equal(isAllowedBillingPlan('cpl'), true);
  assert.equal(isAllowedBillingPlan('invalid'), false);
});

test('buildOfferApplicationUrl includes plan query', () => {
  const url = buildOfferApplicationUrl('growth', 'https://www.istebul.com');
  assert.match(url, /plan=growth/);
  assert.match(url, /partner-basvuru/);
});

test('renderComparisonTable includes SLA row', () => {
  const html = renderComparisonTable();
  assert.match(html, /SLA/);
  assert.match(html, /Starter/);
  assert.match(html, /Enterprise/);
});

test('renderProductTierCards includes quote CTA', () => {
  const html = renderProductTierCards({ origin: 'https://example.com', showPilot: false });
  assert.match(html, /Teklif iste/);
  assert.match(html, /intent=quote/);
});
