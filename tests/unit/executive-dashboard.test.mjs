import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExecutiveDashboard,
  computeConversionMetrics,
  computePartnerLeadQuality,
  computeTrafficMetrics
} from '../../js/features/metrics/executive-dashboard.js';

describe('executive dashboard P5.3', () => {
  it('computeTrafficMetrics counts sessions', () => {
    const rows = [
      { event_name: 'page_view', session_id: 'a' },
      { event_name: 'page_view', session_id: 'a' },
      { event_name: 'auto_page_view', session_id: 'b' }
    ];
    const t = computeTrafficMetrics(rows);
    assert.equal(t.pageViews, 3);
    assert.equal(t.uniqueSessions, 2);
  });

  it('computeConversionMetrics derives wizard CR', () => {
    const rows = [
      { event_name: 'auto_form_started' },
      { event_name: 'auto_wizard_complete' },
      { event_name: 'auto_lead_submit' }
    ];
    const c = computeConversionMetrics(rows);
    assert.equal(c.counts.wizardComplete, 1);
    assert.equal(c.counts.autoStarts, 1);
    assert.equal(c.wizardCompletionPct, 100);
  });

  it('computePartnerLeadQuality scores leads', () => {
    const leads = [
      { lead_score: 80, partner_status: 'dispatched' },
      { lead_score: 50, partner_status: 'dispatch_failed' },
      { lead_score: 90, partner_status: 'won' }
    ];
    const q = computePartnerLeadQuality(leads);
    assert.equal(q.totalLeads, 3);
    assert.equal(q.highIntentLeads, 2);
    assert.ok(q.avgLeadScore >= 70);
  });

  it('buildExecutiveDashboard includes ceoSummary', () => {
    const dash = buildExecutiveDashboard({
      analyticsEvents: [
        { event_name: 'page_view', session_id: 's1' },
        { event_name: 'auto_lead_submit' },
        { event_name: 'paid_conversion', revenue_cents: 29900 }
      ],
      subscriptions: [
        {
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          cancel_at_period_end: false
        }
      ],
      autoLeads: [{ lead_score: 75, partner_status: 'sent', estimated_revenue: 1000 }]
    });
    assert.ok(dash.ceoSummary.length >= 2);
    assert.ok(dash.revenue.arpuTry >= 0);
    assert.ok(dash.funnel.length >= 5);
  });
});
