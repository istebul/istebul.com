import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  rollupSeverity24h,
  rollupHealth24h,
  countEventsWithPrefix
} from '../../js/features/ops/ops-health.js';

describe('ops-health rollups', () => {
  it('rollupSeverity24h counts last 24h only', () => {
    const now = Date.now();
    const rows = [
      { severity: 'critical', created_at: new Date(now - 1000).toISOString() },
      { severity: 'error', created_at: new Date(now - 48 * 3600 * 1000).toISOString() }
    ];
    const out = rollupSeverity24h(rows);
    const critical = out.find((r) => r.severity === 'critical');
    assert.equal(critical?.events, 1);
    const error = out.find((r) => r.severity === 'error');
    assert.equal(error?.events, 0);
  });

  it('rollupHealth24h aggregates by category/event/severity', () => {
    const now = new Date().toISOString();
    const rows = [
      { category: 'webhook', event_name: 'webhook_fail', severity: 'error', created_at: now },
      { category: 'webhook', event_name: 'webhook_fail', severity: 'error', created_at: now }
    ];
    const health = rollupHealth24h(rows);
    assert.equal(health.length, 1);
    assert.equal(health[0].events, 2);
    assert.equal(health[0].errors, 2);
  });

  it('countEventsWithPrefix matches event_name', () => {
    const rows = [{ event_name: 'auth_fail' }, { event_name: 'page_view' }];
    assert.equal(countEventsWithPrefix(rows, 'auth_'), 1);
  });
});
