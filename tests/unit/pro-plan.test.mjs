import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveProPlan, resolveIsPro } from '../../js/features/billing/pro-features.js';

test('resolveProPlan returns guest for anonymous users', () => {
  assert.deepEqual(resolveProPlan(null, {}), { isPro: false, planTier: 'guest' });
});

test('resolveProPlan returns free for authenticated non-pro users', () => {
  assert.deepEqual(resolveProPlan({ id: 'u1' }, {}), { isPro: false, planTier: 'free' });
});

test('resolveProPlan returns pro for active pro subscription', () => {
  const plan = resolveProPlan(
    { id: 'u1' },
    { subscription: { status: 'active' }, profile: { plan: 'pro', subscription_status: 'active' } }
  );
  assert.equal(plan.isPro, true);
  assert.equal(plan.planTier, 'pro');
});

test('resolveProPlan returns pro for enterprise plan', () => {
  const plan = resolveProPlan(
    { id: 'u1' },
    { profile: { plan: 'enterprise', subscription_status: 'active' } }
  );
  assert.equal(plan.isPro, true);
  assert.equal(plan.planTier, 'pro');
});

test('resolveIsPro boolean stays backward compatible', () => {
  assert.equal(resolveIsPro({ isPro: true }), true);
  assert.equal(resolveIsPro({ user: { id: 'u1' } }), false);
});
