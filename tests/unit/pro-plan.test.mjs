import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolvePlanTier,
  resolveProPlan,
  resolveIsPro,
  isProSubscriptionStatus,
  isLimitedSubscriptionStatus
} from '../../js/features/billing/pro-features.js';

test('resolvePlanTier returns guest for anonymous users', () => {
  assert.deepEqual(resolvePlanTier(null, {}), {
    isPro: false,
    planTier: 'guest',
    subscriptionState: 'guest'
  });
});

test('resolvePlanTier returns free for authenticated non-pro users', () => {
  assert.deepEqual(resolvePlanTier({ id: 'u1' }, {}), {
    isPro: false,
    planTier: 'free',
    subscriptionState: 'free'
  });
});

test('resolvePlanTier returns pro for active pro subscription', () => {
  const plan = resolvePlanTier(
    { id: 'u1' },
    { subscription: { status: 'active' }, profile: { plan: 'pro', subscription_status: 'active' } }
  );
  assert.equal(plan.isPro, true);
  assert.equal(plan.planTier, 'pro');
  assert.equal(plan.subscriptionState, 'pro');
});

test('resolvePlanTier returns pro for enterprise plan', () => {
  const plan = resolvePlanTier(
    { id: 'u1' },
    { profile: { plan: 'enterprise', subscription_status: 'active' } }
  );
  assert.equal(plan.isPro, true);
  assert.equal(plan.planTier, 'pro');
});

test('past_due is limited free tier, not pro', () => {
  const plan = resolvePlanTier(
    { id: 'u1' },
    { subscription: { status: 'past_due' }, profile: { plan: 'pro', subscription_status: 'past_due' } }
  );
  assert.equal(plan.isPro, false);
  assert.equal(plan.planTier, 'free');
  assert.equal(plan.subscriptionState, 'limited');
  assert.equal(isProSubscriptionStatus('past_due'), false);
  assert.equal(isLimitedSubscriptionStatus('past_due'), true);
});

test('resolveProPlan alias matches resolvePlanTier', () => {
  assert.equal(resolveProPlan, resolvePlanTier);
});

test('resolveIsPro boolean stays backward compatible', () => {
  assert.equal(resolveIsPro({ isPro: true }), true);
  assert.equal(resolveIsPro({ user: { id: 'u1' } }), false);
  assert.equal(resolveIsPro({ user: { id: 'u1' }, subscription: { status: 'past_due' } }), false);
});
