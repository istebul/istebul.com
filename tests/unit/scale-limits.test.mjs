import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCALE_LIMITS, dedupeAnalyticsQueue } from '../../js/core/scale-limits.js';

test('SCALE_LIMITS defines analytics and admin caps', () => {
  assert.ok(SCALE_LIMITS.analytics.maxQueue >= 25);
  assert.ok(SCALE_LIMITS.admin.analyticsRowLimit >= 500);
  assert.equal(SCALE_LIMITS.aiProxy.sessionCallsPerHour, 3);
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
