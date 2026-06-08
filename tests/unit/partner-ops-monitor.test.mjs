import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  percentile,
  summarizeDispatchLogs24h,
  summarizeRetryQueue,
  summarizeEndpointHealth,
  buildPartnerOpsSnapshot
} from '../../js/features/partner/partner-ops-monitor.js';

describe('partner-ops-monitor', () => {
  it('percentile returns p95 of durations', () => {
    const sorted = [100, 200, 300, 400, 1000000];
    assert.equal(percentile(sorted, 95), 1000000);
  });

  it('summarizeDispatchLogs24h computes fail rate', () => {
    const s = summarizeDispatchLogs24h([
      { success: true, latency_ms: 100 },
      { success: false, latency_ms: 200 },
      { success: true, latency_ms: 300 }
    ]);
    assert.equal(s.attempts24h, 3);
    assert.equal(s.failCount24h, 1);
    assert.ok(s.successRatePct24h > 60);
  });

  it('summarizeRetryQueue counts due retries', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    const r = summarizeRetryQueue(
      [
        { partner_status: 'dispatch_failed', next_retry_at: past },
        { partner_status: 'dispatch_dead' }
      ],
      new Date().toISOString()
    );
    assert.equal(r.retryDueNow, 1);
    assert.equal(r.dispatch_dead, 1);
  });

  it('summarizeEndpointHealth flags inactive active endpoints', () => {
    const h = summarizeEndpointHealth(
      [
        {
          id: '1',
          name: 'A',
          is_active: true,
          health_status: 'healthy',
          last_success_at: null
        }
      ],
      { inactivityDays: 7 }
    );
    assert.equal(h.inactiveEndpointCount, 1);
  });

  it('buildPartnerOpsSnapshot fires SLA rule', () => {
    const snap = buildPartnerOpsSnapshot({
      config: { sla: { dispatchLatencyP95Ms: 900000 } },
      dispatchLogs24h: Array.from({ length: 5 }, () => ({
        success: true,
        latency_ms: 1_000_000
      })),
      endpoints: [],
      leads: [],
      alertRules: [
        {
          id: 'partner_sla_p95_breach',
          domain: 'partner',
          severity: 'warning',
          metric: 'partner.dispatchP95Ms',
          op: 'gt',
          threshold: 900000,
          message: 'sla'
        }
      ]
    });
    assert.equal(snap.sla.breached, true);
    assert.ok(snap.alerts.triggered.some((a) => a.id === 'partner_sla_p95_breach'));
  });
});
