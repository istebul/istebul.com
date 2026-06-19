import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectClientInternalReason,
  isInternalTestParam,
  isInternalLocalStorageFlag
} from '../../js/core/analytics-internal.js';

describe('analytics-internal client signals', () => {
  it('detects internal_test=1 in URL', () => {
    const prev = globalThis.window;
    globalThis.window = {
      location: {
        pathname: '/auto/',
        hostname: 'istebul.com',
        search: '?internal_test=1'
      }
    };
    try {
      assert.equal(isInternalTestParam(), true);
      assert.equal(detectClientInternalReason(), 'internal_param');
    } finally {
      globalThis.window = prev;
    }
  });

  it('detects localStorage istebul_internal_test flag', () => {
    const store = { istebul_internal_test: 'true' };
    const prevWindow = globalThis.window;
    const prevStorage = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v;
      }
    };
    globalThis.window = {
      location: { pathname: '/', hostname: 'istebul.com', search: '' }
    };
    try {
      assert.equal(isInternalLocalStorageFlag(), true);
      assert.equal(detectClientInternalReason(), 'internal_param');
    } finally {
      globalThis.window = prevWindow;
      globalThis.localStorage = prevStorage;
    }
  });
});
