import test from 'node:test';
import assert from 'node:assert/strict';

const {
  mrrForSubscription,
  computeSubscriptionMetrics,
  computeLeadPipelineMetrics,
  buildInvestorSnapshot
} = await import('../../js/features/metrics/investor-kpis.js');

test('mrrForSubscription uses annual equivalent for long period', () => {
  const annual = mrrForSubscription({
    status: 'active',
    current_period_start: '2026-01-01T00:00:00Z',
    current_period_end: '2027-01-01T00:00:00Z'
  });
  const monthly = mrrForSubscription({
    status: 'active',
    current_period_start: '2026-05-01T00:00:00Z',
    current_period_end: '2026-06-01T00:00:00Z'
  });
  assert.ok(annual < monthly);
});

test('computeSubscriptionMetrics sums active MRR', () => {
  const metrics = computeSubscriptionMetrics([
    {
      status: 'active',
      current_period_start: '2026-05-01',
      current_period_end: '2026-06-01',
      cancel_at_period_end: false
    }
  ]);
  assert.equal(metrics.activeSubscriptions, 1);
  assert.ok(metrics.mrrTry > 0);
});

test('computeLeadPipelineMetrics aggregates revenue', () => {
  const metrics = computeLeadPipelineMetrics([
    { estimated_revenue: 5000, actual_revenue: 2000, partner_status: 'won' },
    { estimated_revenue: 3000, actual_revenue: 0, partner_status: 'new' }
  ]);
  assert.equal(metrics.pipelineEstimatedTry, 8000);
  assert.equal(metrics.pipelineActualTry, 2000);
  assert.equal(metrics.partnerWinCount, 1);
});

test('buildInvestorSnapshot returns blended ARR signal', () => {
  const snap = buildInvestorSnapshot({
    subscriptions: [{ status: 'active', current_period_start: '2026-05-01', current_period_end: '2026-06-01' }],
    leads: [{ estimated_revenue: 1000, actual_revenue: 500, partner_status: 'new' }],
    analyticsEvents: [{ event_name: 'page_view' }]
  });
  assert.ok(snap.subscription.arrTry > 0);
  assert.ok(snap.blendedArrTry >= snap.subscription.arrTry);
});
