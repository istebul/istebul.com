import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GROWTH_FUNNEL_EVENTS,
  trackGrowthFunnel
} from '../../js/features/growth/growth-funnel.js';
import { STORAGE_KEYS } from '../../js/core/storage-keys.js';

test('GROWTH_FUNNEL_EVENTS defines canonical acquisition funnel', () => {
  assert.equal(GROWTH_FUNNEL_EVENTS.CHECKOUT_START, 'checkout_start');
  assert.equal(GROWTH_FUNNEL_EVENTS.PAID_CONVERSION, 'paid_conversion');
  assert.ok(GROWTH_FUNNEL_EVENTS.LANDING_VISIT);
});

test('trackGrowthFunnel is no-op without cookie consent', () => {
  const events = [];
  const original = global.localStorage;
  global.localStorage = {
    getItem(key) {
      if (key === STORAGE_KEYS.COOKIE_CONSENT) return null;
      return original?.getItem?.(key) ?? null;
    },
    setItem() {},
    removeItem() {}
  };

  trackGrowthFunnel('landing_visit', {}, { dedupeKey: 'test' });
  assert.equal(events.length, 0);
  global.localStorage = original;
});
