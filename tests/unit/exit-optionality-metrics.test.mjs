import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeExitOptionalityMetrics,
  computeAcquisitionAttractivenessScore,
  computePartnerConcentrationRisk,
  renderExitOptionalityMarkdown,
  buildExitOptionalityReport,
  CLOSED_DEAL_STATUSES
} from '../../metrics/exit-optionality.js';

describe('exit-optionality metrics', () => {
  it('computes lead funnel and attractiveness from sample rows', () => {
    const leads = [
      {
        partner_status: 'qualified',
        lead_score: 80,
        estimated_revenue: 10000,
        actual_revenue: 0,
        partner_endpoint_id: 'a',
        decision_session_id: 's1'
      },
      {
        partner_status: CLOSED_DEAL_STATUSES[0],
        lead_score: 90,
        estimated_revenue: 20000,
        actual_revenue: 15000,
        partner_endpoint_id: 'a',
        decision_session_id: 's2'
      },
      {
        partner_status: 'new',
        lead_score: 40,
        estimated_revenue: 5000,
        partner_endpoint_id: 'b',
        decision_session_id: 's3'
      }
    ];

    const metrics = computeExitOptionalityMetrics({
      leads,
      subscriptions: [{ status: 'active', current_period_start: '2026-01-01', current_period_end: '2026-02-01' }],
      analyticsEvents: [
        { event_name: 'auto_start', session_id: 'x1' },
        { event_name: 'wizard_complete', session_id: 'x1' },
        { event_name: 'lead_submit', session_id: 'x1' }
      ],
      dataSource: 'test'
    });

    assert.equal(metrics.totalLeads, 3);
    assert.equal(metrics.closedDeals, 1);
    assert.ok(metrics.qualifiedLeads >= 2);
    assert.ok(metrics.estimatedArrTry > 0);
    assert.ok(metrics.acquisitionAttractiveness.score >= 0);
    assert.ok(metrics.acquisitionAttractiveness.score <= 100);
  });

  it('flags high partner concentration', () => {
    const risk = computePartnerConcentrationRisk([
      { partner_endpoint_id: 'partner-a', actual_revenue: 90000 },
      { partner_endpoint_id: 'partner-a', actual_revenue: 5000 },
      { partner_endpoint_id: 'partner-b', actual_revenue: 2000 }
    ]);
    assert.ok(risk.topPartnerSharePct >= 85);
    assert.ok(risk.riskScore >= 55);
  });

  it('renders markdown report', () => {
    const metrics = computeExitOptionalityMetrics({ dataSource: 'test' });
    const report = buildExitOptionalityReport({ metrics });
    const md = renderExitOptionalityMarkdown(report);
    assert.ok(md.includes('Exit / M&A Optionality Report'));
    assert.ok(md.includes('Acquisition attractiveness'));
  });

  it('attractiveness score is bounded', () => {
    const s = computeAcquisitionAttractivenessScore({
      conversionPct: 50,
      estimatedArrTry: 5_000_000,
      partnerConcentrationRisk: 10,
      funnelEfficiencyPct: 80,
      repeatActorPct: 30,
      aiMoatScore: 70,
      dataMoatDepthScore: 65
    });
    assert.ok(s.score >= 0 && s.score <= 100);
    assert.ok(s.band);
  });
});
