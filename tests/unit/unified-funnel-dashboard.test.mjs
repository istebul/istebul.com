import test from 'node:test';
import assert from 'node:assert/strict';

const { buildUnifiedFunnelMetrics } = await import('../../js/admin/unified-funnel-dashboard.js');

test('buildUnifiedFunnelMetrics aggregates category funnel rows', () => {
  const rows = [
    { event_name: 'auto_page_view', session_id: 'a1' },
    { event_name: 'auto_results_rendered', session_id: 'a1' },
    { event_name: 'auto_lead_submit', session_id: 'a1' },
    { event_type: 'home_results_view', session_id: 'h1' },
    { event_type: 'vacation_results_view', session_id: 't1' },
    { event_name: 'finans_start', session_id: 'f1' },
    { event_type: 'kasko_results_view', session_id: 'k1' }
  ];
  const metrics = buildUnifiedFunnelMetrics(rows);
  assert.equal(metrics.length, 6);
  const auto = metrics.find((m) => m.id === 'auto');
  assert.ok(auto.visits >= 1);
  assert.ok(auto.results >= 1);
  assert.ok(auto.leads >= 1);
  const kasko = metrics.find((m) => m.id === 'kasko');
  assert.ok(kasko.results >= 1);
});
