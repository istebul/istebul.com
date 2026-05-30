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

function stubFunctionsInvoke(impl) {
  Object.defineProperty(supabase, 'functions', {
    configurable: true,
    value: { invoke: impl }
  });
}

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

test('requestProCheckout invokes create-payment-session edge function', async () => {
  const originalSession = supabase.auth.getSession;
  const originalFunctions = supabase.functions;

  supabase.auth.getSession = async () => ({
    data: { session: { access_token: 'unit-test-token' } }
  });

  let captured = null;
  stubFunctionsInvoke(async (name, opts) => {
    captured = { name, opts };
    return {
      data: {
        ok: true,
        paymentPageUrl: 'https://sandbox.iyzipay.com/checkout',
        conversationId: 'istebul_test'
      },
      error: null
    };
  });

  try {
    const result = await requestProCheckout({ billingInterval: 'monthly' });
    assert.equal(result.ok, true);
    assert.equal(result.url, 'https://sandbox.iyzipay.com/checkout');
    assert.equal(captured.name, 'create-payment-session');
    assert.equal(captured.opts.body.product_code, 'pro_monthly');
  } finally {
    supabase.auth.getSession = originalSession;
    Object.defineProperty(supabase, 'functions', {
      configurable: true,
      value: originalFunctions
    });
  }
});

test('requestProCheckout handles provider not configured', async () => {
  const originalSession = supabase.auth.getSession;
  const originalFunctions = supabase.functions;

  supabase.auth.getSession = async () => ({
    data: { session: { access_token: 'unit-test-token' } }
  });

  stubFunctionsInvoke(async () => ({
    data: {
      ok: false,
      code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      message: 'Ödeme sağlayıcı yapılandırması bekleniyor.',
      fallbackAvailable: false
    },
    error: null
  }));

  try {
    const result = await requestProCheckout();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
    assert.equal(result.status, 503);
  } finally {
    supabase.auth.getSession = originalSession;
    Object.defineProperty(supabase, 'functions', {
      configurable: true,
      value: originalFunctions
    });
  }
});
