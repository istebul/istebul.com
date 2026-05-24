import test from 'node:test';
import assert from 'node:assert/strict';
import {
  peekCheckoutIntent,
  storeCheckoutIntentPayload,
  clearCheckoutIntent,
  mapCheckoutApiError,
  buildCheckoutTriggerEvent
} from '../../js/core/checkout-intent.js';
import { STORAGE_KEYS } from '../../js/core/storage-keys.js';

function mockSessionStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

test('checkout intent survives peek until explicit clear', () => {
  const storage = mockSessionStorage();
  storeCheckoutIntentPayload({ billing: 'annual', useTrial: true }, storage);

  const first = peekCheckoutIntent(storage);
  assert.deepEqual(first, { billing: 'annual', useTrial: true });

  const second = peekCheckoutIntent(storage);
  assert.deepEqual(second, first);
  assert.ok(storage.getItem(STORAGE_KEYS.CHECKOUT_INTENT));

  clearCheckoutIntent(storage);
  assert.equal(peekCheckoutIntent(storage), null);
});

test('buildCheckoutTriggerEvent maps trial flag', () => {
  const event = buildCheckoutTriggerEvent({ billing: 'monthly', useTrial: false });
  assert.equal(event.target.closest().dataset.trial, '0');
  assert.equal(event.target.closest().dataset.billing, 'monthly');
});

test('mapCheckoutApiError maps status codes', () => {
  assert.match(mapCheckoutApiError(409, { error: 'Active subscription already exists' }), /aktif/i);
  assert.match(mapCheckoutApiError(401, { error: 'Invalid token' }), /giriş/i);
});
