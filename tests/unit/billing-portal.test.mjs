import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapBillingPortalError,
  canOpenBillingPortal
} from '../../js/core/billing-portal.js';

test('mapBillingPortalError handles auth and missing customer', () => {
  assert.match(mapBillingPortalError(401, { error: 'Invalid token' }), /giriş/i);
  assert.match(
    mapBillingPortalError(404, { error: 'no_billing_customer' }),
    /faturalandırılmış/i
  );
});

test('canOpenBillingPortal allows billable subscription states', () => {
  assert.equal(canOpenBillingPortal({ status: 'active' }), true);
  assert.equal(canOpenBillingPortal({ status: 'past_due' }), true);
  assert.equal(canOpenBillingPortal({ status: 'canceled' }), true);
  assert.equal(canOpenBillingPortal(null), false);
  assert.equal(canOpenBillingPortal({ status: 'incomplete' }), false);
});
