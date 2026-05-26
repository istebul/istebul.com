import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasMarketingConsent, getPublisherId } from '../../js/core/adsense.js';

describe('adsense', () => {
  it('requires accepted consent', () => {
    const key = 'istebul_cookie_consent';
    const prev = globalThis.localStorage?.getItem?.(key);
    try {
      if (!globalThis.localStorage) {
        globalThis.localStorage = {
          _m: new Map(),
          getItem(k) {
            return this._m.get(k) ?? null;
          },
          setItem(k, v) {
            this._m.set(k, v);
          }
        };
      }
      globalThis.localStorage.setItem(key, 'declined');
      assert.equal(hasMarketingConsent(), false);
      globalThis.localStorage.setItem(key, 'accepted');
      assert.equal(hasMarketingConsent(), true);
    } finally {
      if (prev == null) globalThis.localStorage?.removeItem?.(key);
      else globalThis.localStorage?.setItem?.(key, prev);
    }
  });

  it('reads publisher from __env', () => {
    const prev = globalThis.window?.__env;
    globalThis.window = globalThis.window || {};
    globalThis.window.__env = { ADSENSE_PUBLISHER_ID: 'ca-pub-test' };
    assert.equal(getPublisherId(), 'ca-pub-test');
    globalThis.window.__env = prev;
  });
});
