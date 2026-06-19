import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOpsDecisionBrief,
  buildSanitizedOpsBriefForAi
} from '../../js/features/ops/ops-decision-assistant.js';
import { buildInternalDashboardContext } from '../../js/features/dashboards/internal-dashboard-context.js';

function hoursAgo(h, name) {
  return {
    event_name: name,
    created_at: new Date(Date.now() - h * 3600000).toISOString(),
    session_id: 's1'
  };
}

describe('ops-decision-assistant', () => {
  it('buildOpsDecisionBrief covers six capability domains', () => {
    const events = [];
    for (let i = 0; i < 40; i++) events.push(hoursAgo(2, 'landing_visit'));
    for (let i = 0; i < 2; i++) events.push(hoursAgo(2, 'lead_submit'));
    for (let i = 0; i < 30; i++) events.push(hoursAgo(30, 'landing_visit'));
    for (let i = 0; i < 12; i++) events.push(hoursAgo(30, 'lead_submit'));

    const ctx = buildInternalDashboardContext({
      analyticsEvents: events,
      subscriptions: [
        { status: 'active', cancel_at_period_end: true },
        { status: 'active', cancel_at_period_end: true }
      ],
      autoLeads: [{ lead_score: 40, partner_status: 'dispatch_failed', created_at: new Date().toISOString() }]
    });

    const brief = buildOpsDecisionBrief(ctx, { analyticsEvents: events });
    const domains = new Set(brief.insights.map((i) => i.domain));
    assert.ok(domains.has('growth'));
    assert.ok(domains.has('funnel') || brief.insights.some((i) => i.id === 'funnel_crash_24h'));
    assert.ok(domains.has('churn'));
    assert.ok(domains.has('partner'));
    assert.ok(domains.has('pricing'));
    assert.ok(domains.has('conversion'));
    assert.equal(brief.version, 'p15.0');
  });

  it('buildSanitizedOpsBriefForAi returns JSON without throwing', () => {
    const ctx = buildInternalDashboardContext({
      analyticsEvents: [{ event_name: 'page_view', created_at: new Date().toISOString() }]
    });
    const brief = buildOpsDecisionBrief(ctx, { analyticsEvents: [] });
    const json = buildSanitizedOpsBriefForAi(brief);
    assert.ok(JSON.parse(json).insights);
  });
});

describe('ops-ai-assistant-views', () => {
  it('ops assistant CTA labels stay canonical', () => {
    const source = fs.readFileSync(
      new URL('../../js/features/ops/ops-ai-assistant-views.js', import.meta.url),
      'utf8'
    );

    assert.match(source, /Operasyon Komuta Merkezi/);
    assert.match(source, /CEO Özeti/);
    assert.match(source, /ops-command-center/);
    assert.match(source, /dashboard-ceo/);

    assert.doesNotMatch(source, /Ops Command Center/);
    assert.doesNotMatch(source, /CEO Dashboard/);
  });
});
