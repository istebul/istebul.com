import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeBySeverity,
  summarizeByCategory,
  countEventsWithPrefix,
  isLcpRegression,
  LCP_SLOW_MS
} from '../../js/features/ops/ops-health.js';

describe('ops-health', () => {
  it('summarizes severity counts', () => {
    const rows = [
      { severity: 'error' },
      { severity: 'error' },
      { severity: 'warning' }
    ];
    const s = summarizeBySeverity(rows);
    assert.equal(s.error, 2);
    assert.equal(s.warning, 1);
  });

  it('summarizes categories', () => {
    const s = summarizeByCategory([
      { category: 'webhook' },
      { category: 'auth' },
      { category: 'webhook' }
    ]);
    assert.equal(s.webhook, 2);
    assert.equal(s.auth, 1);
  });

  it('counts event prefixes', () => {
    const n = countEventsWithPrefix([
      { event_name: 'webhook_partner_dispatch_failed' },
      { event_name: 'auth_login_failed' }
    ], 'webhook_');
    assert.equal(n, 1);
  });

  it('detects LCP regression threshold', () => {
    assert.equal(isLcpRegression(LCP_SLOW_MS), true);
    assert.equal(isLcpRegression(2500), false);
  });
});
