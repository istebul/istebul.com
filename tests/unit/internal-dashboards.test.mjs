import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildInternalDashboardContext } from '../../js/features/dashboards/internal-dashboard-context.js';
import { renderInternalDashboard } from '../../js/features/dashboards/internal-dashboard-views.js';

const esc = (s) => String(s);

describe('internal-dashboards', () => {
  it('buildInternalDashboardContext returns p14 structure', () => {
    const ctx = buildInternalDashboardContext({
      analyticsEvents: [
        { event_name: 'landing_visit', created_at: new Date().toISOString() },
        { event_name: 'lead_submit', created_at: new Date().toISOString() }
      ],
      subscriptions: [{ status: 'active', cancel_at_period_end: false }],
      autoLeads: [{ lead_score: 80, partner_status: 'won', created_at: new Date().toISOString() }]
    });
    assert.equal(ctx.version, 'p14.0');
    assert.ok(ctx.executive);
    assert.ok(ctx.growth);
    assert.ok(ctx.revenue);
    assert.ok(ctx.partnerOps);
    assert.ok(ctx.support);
  });

  it('renderInternalDashboard outputs CEO section', () => {
    const ctx = buildInternalDashboardContext({
      analyticsEvents: [{ event_name: 'page_view', created_at: new Date().toISOString() }]
    });
    const html = renderInternalDashboard('ceo', ctx, esc);
    assert.match(html, /CEO Özeti · Son/);
    assert.match(html, /CEO sağlığı/);
    assert.match(html, /CEO özeti/);
    assert.doesNotMatch(html, /Executive summary/);
  });

  it('operation and analytics CTA labels stay aligned with nav labels', () => {
    const ctx = buildInternalDashboardContext({
      analyticsEvents: [{ event_name: 'page_view', created_at: new Date().toISOString() }]
    });
    const ceoHtml = renderInternalDashboard('ceo', ctx, esc);
    const growthHtml = renderInternalDashboard('growth', ctx, esc);
    const revenueHtml = renderInternalDashboard('revenue', ctx, esc);
    const supportHtml = renderInternalDashboard('support', ctx, esc);
    const combined = `${ceoHtml}${growthHtml}${revenueHtml}${supportHtml}`;

    assert.match(combined, />Yatırımcı KPI</);
    assert.match(combined, />Operasyon Komuta Merkezi</);
    assert.match(combined, />Platform analitik</);
    assert.match(combined, />Auto analitik</);
    assert.doesNotMatch(combined, /Executive KPIs(?: \(detail\))?/);
    assert.doesNotMatch(combined, />Ops Command Center</);
    assert.doesNotMatch(combined, />Platform Analytics</);
    assert.doesNotMatch(combined, />Auto Analytics</);
  });
});
