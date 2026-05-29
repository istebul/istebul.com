import test from 'node:test';
import assert from 'node:assert/strict';
import { supabase } from '../../js/core/supabase.js';
import {
  PAYWALL_STATE,
  resolvePaywallState,
  renderPaywallV1,
  renderPaywallGate,
  shouldShowPaywall,
  requestProCheckout
} from '../../js/features/billing/paywall-v1.js';
import { PRO_FEATURE } from '../../js/features/billing/pro-features.js';

const proCtx = {
  isAuthenticated: true,
  subscription: { status: 'active' }
};

const freeCtx = {
  isAuthenticated: true,
  subscription: { status: 'inactive' },
  profile: { plan: 'free', subscription_status: 'inactive' }
};

const guestCtx = { isAuthenticated: false };

test('resolvePaywallState maps guest, free, and pro', () => {
  assert.equal(resolvePaywallState(guestCtx), PAYWALL_STATE.GUEST);
  assert.equal(resolvePaywallState(freeCtx), PAYWALL_STATE.FREE);
  assert.equal(resolvePaywallState(proCtx), PAYWALL_STATE.PRO);
});

test('free user sees paywall markup', () => {
  const html = renderPaywallV1({
    feature: PRO_FEATURE.PDF_HISTORY,
    state: PAYWALL_STATE.FREE
  });
  assert.match(html, /data-paywall-state="free"/);
  assert.match(html, /data-paywall-v1-checkout/);
  assert.match(html, /PDF geçmişi/);
});

test('pro user gets empty paywall shell', () => {
  const html = renderPaywallV1({ state: PAYWALL_STATE.PRO });
  assert.equal(html, '');
});

test('guest user sees login CTA', () => {
  const html = renderPaywallV1({ state: PAYWALL_STATE.GUEST });
  assert.match(html, /data-paywall-state="guest"/);
  assert.match(html, /data-paywall-v1-login/);
  assert.match(html, /Giriş yap/);
});

test('error state shows fallback without checkout', () => {
  const html = renderPaywallV1({
    state: PAYWALL_STATE.ERROR,
    errorMessage: 'Stripe yapılandırması eksik'
  });
  assert.match(html, /data-paywall-state="error"/);
  assert.match(html, /Stripe yapılandırması eksik/);
  assert.doesNotMatch(html, /data-paywall-v1-checkout/);
});

test('renderPaywallGate shows content for pro only', () => {
  const gated = renderPaywallGate({
    feature: PRO_FEATURE.PDF_HISTORY,
    ctx: freeCtx,
    contentHtml: '<p class="secret-pdf">PDF list</p>'
  });
  assert.match(gated, /paywall-v1-gate/);
  assert.match(gated, /secret-pdf/);

  const open = renderPaywallGate({
    feature: PRO_FEATURE.PDF_HISTORY,
    ctx: proCtx,
    contentHtml: '<p class="secret-pdf">PDF list</p>'
  });
  assert.equal(open, '<p class="secret-pdf">PDF list</p>');
});

test('shouldShowPaywall respects feature matrix', () => {
  assert.equal(shouldShowPaywall(PRO_FEATURE.PDF_HISTORY, freeCtx), true);
  assert.equal(shouldShowPaywall(PRO_FEATURE.PDF_HISTORY, proCtx), false);
  assert.equal(shouldShowPaywall(PRO_FEATURE.BASIC_DECISION_SCORE, freeCtx), false);
});

test('requestProCheckout without session returns auth_required', async () => {
  const original = supabase.auth.getSession;
  supabase.auth.getSession = async () => ({ data: { session: null } });
  try {
    const result = await requestProCheckout();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'auth_required');
  } finally {
    supabase.auth.getSession = original;
  }
});

test('requestProCheckout calls create-checkout with bearer token', async () => {
  const originalSession = supabase.auth.getSession;
  const originalFetch = globalThis.fetch;

  supabase.auth.getSession = async () => ({
    data: { session: { access_token: 'unit-test-token' } }
  });

  let captured = null;
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/c/test_session' })
    };
  };

  try {
    const result = await requestProCheckout({ billingInterval: 'monthly', useTrial: true });
    assert.equal(result.ok, true);
    assert.equal(result.url, 'https://checkout.stripe.com/c/test_session');
    assert.equal(captured.url, '/api/create-checkout');
    assert.equal(captured.init.method, 'POST');
    assert.match(captured.init.headers.Authorization, /unit-test-token/);
    const body = JSON.parse(captured.init.body);
    assert.equal(body.billingInterval, 'monthly');
    assert.equal(body.useTrial, true);
  } finally {
    supabase.auth.getSession = originalSession;
    globalThis.fetch = originalFetch;
  }
});

test('requestProCheckout handles API failure gracefully', async () => {
  const originalSession = supabase.auth.getSession;
  const originalFetch = globalThis.fetch;

  supabase.auth.getSession = async () => ({
    data: { session: { access_token: 'unit-test-token' } }
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: 'checkout_failed' })
  });

  try {
    const result = await requestProCheckout();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'checkout_failed');
    assert.equal(result.url, null);
  } finally {
    supabase.auth.getSession = originalSession;
    globalThis.fetch = originalFetch;
  }
});
