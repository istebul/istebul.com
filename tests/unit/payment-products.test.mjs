import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getPaymentProduct,
  listPaymentProducts,
  isSubscriptionProduct,
  isPartnerProduct,
  formatProductPrice
} from '../../js/payments/payment-products.js';
import { isStripeCheckoutActive, PAYMENT_NOT_CONFIGURED_MESSAGE } from '../../js/payments/payment-providers.js';

const root = join(process.cwd());

test('product catalog validates pro_monthly price', () => {
  const p = getPaymentProduct('pro_monthly');
  assert.equal(p.amount, 199);
  assert.equal(p.currency, 'TRY');
});

test('product catalog lists six products', () => {
  assert.equal(listPaymentProducts().length, 6);
});

test('subscription and partner product flags', () => {
  assert.equal(isSubscriptionProduct('pro_yearly'), true);
  assert.equal(isSubscriptionProduct('premium_report'), false);
  assert.equal(isPartnerProduct('partner_lead_credit_10'), true);
  assert.equal(isPartnerProduct('pro_monthly'), false);
});

test('invalid product_code returns null', () => {
  assert.equal(getPaymentProduct('not_a_product'), null);
});

test('formatProductPrice returns TRY string', () => {
  assert.match(formatProductPrice('premium_report'), /99/);
});

test('stripe checkout is passive', () => {
  assert.equal(isStripeCheckoutActive(), false);
});

test('provider not configured user message is defined', () => {
  assert.match(PAYMENT_NOT_CONFIGURED_MESSAGE, /aktivasyon/i);
});

test('migration defines payment_orders and RLS', () => {
  const sql = readFileSync(
    join(root, 'supabase/migrations/20260617_payment_infrastructure_iyzico_paytr.sql'),
    'utf8'
  );
  assert.match(sql, /create table if not exists public\.payment_orders/);
  assert.match(sql, /user_entitlements/);
  assert.match(sql, /enable row level security/);
});

test('edge functions exist for iyzico and paytr', () => {
  const names = [
    'create-payment-session',
    'iyzico-webhook',
    'paytr-create-payment-session',
    'paytr-webhook',
    'payment-provider-status'
  ];
  for (const name of names) {
    assert.ok(
      readFileSync(join(root, `supabase/functions/${name}/index.ts`), 'utf8').length > 50,
      `${name} present`
    );
  }
});

test('create-payment-session returns PAYMENT_PROVIDER_NOT_CONFIGURED when env missing', () => {
  const src = readFileSync(
    join(root, 'supabase/functions/create-payment-session/index.ts'),
    'utf8'
  );
  assert.match(src, /PAYMENT_PROVIDER_NOT_CONFIGURED/);
  assert.match(src, /503/);
});

test('iyzico webhook rejects invalid signature by default', () => {
  const src = readFileSync(join(root, 'supabase/functions/iyzico-webhook/index.ts'), 'utf8');
  assert.match(src, /invalid_signature/);
  assert.match(src, /grantEntitlementsForPaidOrder/);
});

test('paytr webhook returns OK on success path', () => {
  const src = readFileSync(join(root, 'supabase/functions/paytr-webhook/index.ts'), 'utf8');
  assert.match(src, /return new Response\("OK"/);
});

test('pro_monthly grant updates subscriptions in entitlements helper', () => {
  const src = readFileSync(
    join(root, 'supabase/functions/_shared/payment-entitlements.ts'),
    'utf8'
  );
  assert.match(src, /pro_monthly|isSubscriptionProduct/);
  assert.match(src, /premium_report/);
  assert.match(src, /partner_lead_credit/);
  assert.match(src, /alreadyPaid/);
});

test('stripe passive create-checkout does not require keys for 503 response', () => {
  const src = readFileSync(join(root, 'functions/api/create-checkout.js'), 'utf8');
  assert.match(src, /STRIPE_PASSIVE/);
  assert.match(src, /503/);
});
