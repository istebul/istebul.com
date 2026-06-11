import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOpsCommandCenter } from '../../js/features/ops/ops-command-center.js';

describe('ops-command-center', () => {
  it('builds eight domains and alert evaluation', () => {
    const snapshot = buildOpsCommandCenter({
      analyticsEvents: [
        { event_name: 'checkout_abandoned', created_at: new Date().toISOString() }
      ],
      subscriptions: [{ status: 'active', cancel_at_period_end: true }],
      autoLeads: [{ lead_score: 80, partner_status: 'won', created_at: new Date().toISOString() }],
      operationalEvents: [
        { severity: 'critical', event_name: 'webhook_fail', created_at: new Date().toISOString() }
      ],
      alertRules: [
        {
          id: 'ops_critical_events',
          domain: 'operations',
          severity: 'critical',
          metric: 'ops.criticalCount',
          op: 'gte',
          threshold: 1,
          message: 'critical ops'
        }
      ],
      windowDays: 30
    });

    assert.equal(snapshot.version, 'p9.0');
    assert.equal(snapshot.domains.length, 8);
    assert.ok(snapshot.domains.find((d) => d.id === 'revenue'));
    assert.ok(snapshot.alerts.triggeredCount >= 1);
    assert.equal(snapshot.overallHealth, 'critical');
  });

  it('internal dashboard highlights stay canonical', () => {
    const snapshot = buildOpsCommandCenter({
      analyticsEvents: [],
      subscriptions: [],
      autoLeads: [],
      operationalEvents: [],
      alertRules: [],
      windowDays: 30
    });
    const dashboards = snapshot.domains.find((d) => d.id === 'dashboards');
    assert.ok(dashboards);
    assert.deepEqual(dashboards.highlights, [
      'Yatırımcı KPI',
      'Observability',
      'Operasyon Komuta Merkezi'
    ]);

    const source = fs.readFileSync(
      new URL('../../js/features/ops/ops-command-center.js', import.meta.url),
      'utf8'
    );
    assert.doesNotMatch(source, /'Executive KPIs'/);
    assert.doesNotMatch(source, /'Ops Command Center'/);
  });
});
