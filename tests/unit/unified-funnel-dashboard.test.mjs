import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildUnifiedFunnelMetrics,
  renderUnifiedFunnelDashboard,
  resolveFunnelStage,
  FUNNEL_STAGE_ALIASES,
  FUNNEL_METRICS_CUTOVER_NOTE
} = await import('../../js/admin/unified-funnel-dashboard.js');

test('buildUnifiedFunnelMetrics aggregates category funnel rows', () => {
  const rows = [
    { event_name: 'auto_page_view', session_id: 'a1' },
    { event_name: 'auto_results_rendered', session_id: 'a1' },
    { event_name: 'auto_lead_submit', session_id: 'a1' },
    { event_type: 'home_results_view', session_id: 'h1' },
    { event_type: 'vacation_results_view', session_id: 't1' },
    { event_name: 'finans_start', session_id: 'f1' }
  ];
  const metrics = buildUnifiedFunnelMetrics(rows);
  assert.equal(metrics.length, 6);
  const auto = metrics.find((m) => m.id === 'auto');
  assert.ok(auto.visits >= 1);
  assert.ok(auto.results >= 1);
  assert.ok(auto.leads >= 1);
});

test('buildUnifiedFunnelMetrics reads vertical_events finans rows', () => {
  const rows = [
    { event_type: 'finans_start', session_id: 'vf1', vertical: 'finans' },
    { event_type: 'finans_results_view', session_id: 'vf1', vertical: 'finans' },
    { event_type: 'finans_lead_submit', session_id: 'vf1', vertical: 'finans' }
  ];
  const metrics = buildUnifiedFunnelMetrics(rows);
  const finans = metrics.find((m) => m.id === 'finans');
  assert.ok(finans.visits >= 1, 'finans_start should count as visit');
  assert.ok(finans.results >= 1, 'finans_results_view should count as results');
  assert.ok(finans.leads >= 1, 'finans_lead_submit should count as lead');
});

test('resolveFunnelStage maps kasko_wizard_complete to complete', () => {
  assert.equal(resolveFunnelStage('kasko_wizard_complete'), 'complete');
  assert.ok(FUNNEL_STAGE_ALIASES.complete.includes('kasko_wizard_complete'));
});

test('resolveFunnelStage maps insurance_interest to lead_open', () => {
  assert.equal(resolveFunnelStage('insurance_interest'), 'lead_open');
  assert.ok(FUNNEL_STAGE_ALIASES.lead_open.includes('insurance_interest'));
});

test('resolveFunnelStage maps lead_submit and auto_lead_submit to lead_submit', () => {
  assert.equal(resolveFunnelStage('lead_submit'), 'lead_submit');
  assert.equal(resolveFunnelStage('auto_lead_submit'), 'lead_submit');
});

test('buildUnifiedFunnelMetrics counts kasko_wizard_complete in results', () => {
  const rows = [{ event_name: 'kasko_wizard_complete', session_id: 'k1' }];
  const metrics = buildUnifiedFunnelMetrics(rows);
  const kasko = metrics.find((m) => m.id === 'kasko');
  assert.ok(kasko.results >= 1);
});

test('buildUnifiedFunnelMetrics counts insurance_lead_submit for sigorta', () => {
  const rows = [{ event_name: 'insurance_lead_submit', session_id: 's1' }];
  const metrics = buildUnifiedFunnelMetrics(rows);
  const sigorta = metrics.find((m) => m.id === 'sigorta');
  assert.ok(sigorta.leads >= 1);
});

test('renderUnifiedFunnelDashboard shows cutover note', () => {
  const html = renderUnifiedFunnelDashboard(buildUnifiedFunnelMetrics([]), (s) => String(s));
  assert.match(html, /5 Haziran 2026/);
  assert.match(html, /wizard_start/);
  assert.equal(FUNNEL_METRICS_CUTOVER_NOTE.includes('5 Haziran 2026'), true);
});

test('admin-panel fetch chain includes vertical_events', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../../js/admin-panel.js', import.meta.url), 'utf8');
  assert.match(src, /table: 'vertical_events'/);
  assert.match(src, /\.\.\.\(verticalRes\.data \|\| \[\]\)/);
});
