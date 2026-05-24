import test from 'node:test';
import assert from 'node:assert/strict';

import {
  describeRetryState,
  computePartnerOpsKpis,
  aggregatePartnerFunnelEvents,
  partnerStatusBadge
} from '../../js/features/admin/partner-ops.js';

test('describeRetryState for dispatch_dead', () => {
  const r = describeRetryState({ partner_status: 'dispatch_dead', dispatch_retry_count: 5 });
  assert.equal(r.tone, 'danger');
  assert.match(r.headline, /5/);
});

test('describeRetryState shows next retry for dispatch_failed', () => {
  const next = new Date(Date.now() + 3600000).toISOString();
  const r = describeRetryState({
    partner_status: 'dispatch_failed',
    dispatch_retry_count: 2,
    next_retry_at: next
  });
  assert.equal(r.tone, 'warning');
  assert.match(r.detail, /Sonraki otomatik retry/);
});

test('computePartnerOpsKpis counts partner buckets', () => {
  const kpi = computePartnerOpsKpis([
    { partner_status: 'dispatched', priority: 'hot' },
    { partner_status: 'dispatch_failed', priority: 'warm' },
    { partner_status: 'pending', priority: 'very_hot', follow_up_at: '2020-01-01', follow_up_done: false }
  ]);
  assert.equal(kpi.dispatched, 1);
  assert.equal(kpi.dispatch_failed, 1);
  assert.equal(kpi.hot, 2);
  assert.equal(kpi.overdueFollowUp, 1);
});

test('aggregatePartnerFunnelEvents sums known events', () => {
  const c = aggregatePartnerFunnelEvents([
    { event_name: 'partner_landing_view' },
    { event_name: 'partner_landing_view' },
    { event_name: 'partner_application_submit' }
  ]);
  assert.equal(c.partner_landing_view, 2);
  assert.equal(c.partner_application_submit, 1);
});

test('partnerStatusBadge returns known meta', () => {
  const b = partnerStatusBadge('dispatched');
  assert.equal(b.label, 'Teslim edildi');
});
