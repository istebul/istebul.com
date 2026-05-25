import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldSampleAnalyticsEvent,
  estimateGroqCallUsd,
  estimateMonthlyInfraUsd
} from '../../js/core/unit-economics.js';
import { SCALE_LIMITS } from '../../js/core/scale-limits.js';

describe('unit-economics', () => {
  it('SCALE_LIMITS aligns with infra guardrails', () => {
    assert.equal(SCALE_LIMITS.aiProxy.maxOutputTokens, 400);
    assert.equal(SCALE_LIMITS.analytics.maxQueue, 40);
    assert.equal(SCALE_LIMITS.analytics.flushDebounceMs, 1500);
  });

  it('estimateGroqCallUsd returns small positive number', () => {
    const usd = estimateGroqCallUsd({ promptChars: 2000 });
    assert.ok(usd > 0 && usd < 0.01);
  });

  it('estimateMonthlyInfraUsd scales with MAU', () => {
    const small = estimateMonthlyInfraUsd({ mau: 1000 });
    const large = estimateMonthlyInfraUsd({ mau: 100000 });
    assert.ok(large.totalUsd > small.totalUsd);
  });

  it('shouldSampleAnalyticsEvent may drop low-priority events', () => {
    let kept = 0;
    for (let i = 0; i < 200; i += 1) {
      if (shouldSampleAnalyticsEvent('page_exit')) kept += 1;
    }
    assert.ok(kept > 20 && kept < 180);
    assert.equal(shouldSampleAnalyticsEvent('checkout_started'), true);
  });
});
