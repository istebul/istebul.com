import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleCookieConsentReveal } from '../../js/runtime/cookie-consent-scheduler.js';

describe('cookie-consent-scheduler', () => {
  it('invokes callback', async () => {
    let calls = 0;
    scheduleCookieConsentReveal(() => {
      calls += 1;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(calls, 1);
  });
});
