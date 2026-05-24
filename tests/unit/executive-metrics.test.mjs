import test from 'node:test';
import assert from 'node:assert/strict';

const {
  analyticsIdentityKey,
  countActiveUsers,
  computeActiveUserMetrics,
  isQualifiedLead,
  isWonLead,
  computeExecutiveLeadMetrics,
  computeExecutiveFunnel,
  computeChurnMetrics,
  buildExecutiveSnapshot
} = await import('../../js/features/metrics/executive-metrics.js');

const NOW = new Date('2026-05-23T12:00:00Z');

test('analyticsIdentityKey prefers user_id', () => {
  assert.equal(analyticsIdentityKey({ user_id: 'u1', session_id: 's1' }), 'u:u1');
});

test('countActiveUsers counts distinct identities in window', () => {
  const rows = [
    { created_at: '2026-05-23T10:00:00Z', user_id: 'a' },
    { created_at: '2026-05-23T11:00:00Z', user_id: 'a' },
    { created_at: '2026-05-23T09:00:00Z', session_id: 'b' }
  ];
  const n = countActiveUsers(rows, {
    days: 1,
    now: NOW,
    getTimestamp: (r) => new Date(r.created_at).getTime(),
    getKey: (r) => analyticsIdentityKey(r)
  });
  assert.equal(n, 2);
});

test('computeActiveUserMetrics returns DAU/WAU/MAU', () => {
  const events = [
    { created_at: '2026-05-23T10:00:00Z', user_id: 'u1' },
    { created_at: '2026-05-20T10:00:00Z', user_id: 'u2' },
    { created_at: '2026-04-25T10:00:00Z', user_id: 'u3' }
  ];
  const m = computeActiveUserMetrics(events, [], { now: NOW });
  assert.ok(m.dau >= 1);
  assert.ok(m.wau >= m.dau);
  assert.ok(m.mau >= m.wau);
});

test('isQualifiedLead uses priority and score', () => {
  assert.equal(isQualifiedLead({ priority: 'cold', lead_score: 40 }), false);
  assert.equal(isQualifiedLead({ priority: 'warm', lead_score: 10 }), true);
  assert.equal(isQualifiedLead({ priority: 'cold', lead_score: 55 }), true);
});

test('isWonLead recognizes partner win statuses', () => {
  assert.equal(isWonLead({ partner_status: 'won' }), true);
  assert.equal(isWonLead({ partner_status: 'new' }), false);
});

test('computeExecutiveLeadMetrics close rate uses qualified denominator', () => {
  const m = computeExecutiveLeadMetrics([
    { priority: 'warm', partner_status: 'won', created_at: '2026-05-20T00:00:00Z' },
    { priority: 'cold', partner_status: 'new', created_at: '2026-05-21T00:00:00Z' }
  ]);
  assert.equal(m.qualifiedLeads, 1);
  assert.equal(m.wins, 1);
  assert.equal(m.closeRatePct, 100);
});

test('computeExecutiveFunnel builds staged funnel', () => {
  const funnel = computeExecutiveFunnel(
    [{ event_name: 'page_view' }, { event_name: 'lead_submit' }],
    [{ priority: 'hot', partner_status: 'won', lead_score: 120 }]
  );
  assert.equal(funnel.stages.length, 6);
  assert.ok(funnel.stages.some((s) => s.key === 'qualified' && s.count >= 1));
});

test('computeChurnMetrics surfaces logo churn signal', () => {
  const c = computeChurnMetrics([
    { status: 'active', cancel_at_period_end: true },
    { status: 'active', cancel_at_period_end: false }
  ]);
  assert.equal(c.cancelAtPeriodEnd, 1);
  assert.equal(c.logoChurnSignalPct, 50);
});

test('buildExecutiveSnapshot includes CEO sections', () => {
  const snap = buildExecutiveSnapshot({
    subscriptions: [
      {
        status: 'active',
        current_period_start: '2026-05-01',
        current_period_end: '2026-06-01',
        cancel_at_period_end: false
      }
    ],
    leads: [
      {
        priority: 'hot',
        lead_score: 110,
        partner_status: 'won',
        actual_revenue: 3000,
        estimated_revenue: 5000,
        created_at: '2026-05-15T00:00:00Z'
      }
    ],
    analyticsEvents: [
      { event_name: 'page_view', created_at: '2026-05-23T08:00:00Z', user_id: 'x' }
    ],
    assumptions: { marketingSpendTry30d: 10000 },
    now: NOW
  });
  assert.ok(snap.activeUsers);
  assert.ok(snap.revenue.subscriptionMrrTry > 0);
  assert.ok(snap.unitEconomics.blendedLtvTry > 0);
  assert.equal(snap.unitEconomics.cacTry, 10000);
});
