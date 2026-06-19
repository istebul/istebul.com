import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCALE_LIMITS,
  dedupeAnalyticsQueue,
  hasAiNarrationBudget
} from '../../js/core/scale-limits.js';

test('SCALE_LIMITS defines analytics and admin caps', () => {
  assert.equal(SCALE_LIMITS.analytics.maxQueue, 40);
  assert.ok(SCALE_LIMITS.admin.analyticsRowLimit >= 500);
  assert.equal(SCALE_LIMITS.aiProxy.sessionCallsPerHour, 12);
  assert.equal(SCALE_LIMITS.aiProxy.proSessionCallsPerHour, 40);
  assert.equal(SCALE_LIMITS.aiProxy.maxOutputTokens, 800);
});

test('dedupeAnalyticsQueue drops prior page_exit for same session', () => {
  const queue = [{ event_name: 'page_exit', session_id: 'b' }];
  const next = dedupeAnalyticsQueue(queue, 'page_exit', 'b');
  assert.equal(next.length, 0);
});

test('hasAiNarrationBudget returns true without sessionStorage', () => {
  assert.equal(hasAiNarrationBudget(), true);
});

test('dedupeAnalyticsQueue drops prior page_view for same session', () => {
  const queue = [
    { event_name: 'page_view', session_id: 'a' },
    { event_name: 'cta_click', session_id: 'a' }
  ];
  const next = dedupeAnalyticsQueue(queue, 'page_view', 'a');
  assert.equal(next.length, 1);
  assert.equal(next[0].event_name, 'cta_click');
});
