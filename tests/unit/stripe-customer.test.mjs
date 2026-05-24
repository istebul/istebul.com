import test from 'node:test';
import assert from 'node:assert/strict';
import { pickStripeCustomerIdFromRows } from '../../functions/api/_shared/stripe-customer.js';

test('pickStripeCustomerIdFromRows returns first valid cus_ id', () => {
  assert.equal(
    pickStripeCustomerIdFromRows([
      { stripe_customer_id: null },
      { stripe_customer_id: 'cus_abc123' }
    ]),
    'cus_abc123'
  );
});

test('pickStripeCustomerIdFromRows rejects invalid ids', () => {
  assert.equal(
    pickStripeCustomerIdFromRows([{ stripe_customer_id: 'not-a-customer' }]),
    null
  );
});
