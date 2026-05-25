import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  percentDrop,
  buildCeoAlertMetrics,
  buildCeoAlertSnapshot
} from '../../js/features/ops/ceo-alert-engine.js';

function event(name, hoursAgo) {
  return {
    event_name: name,
    created_at: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    session_id: 's1'
  };
}

describe('ceo-alert-engine', () => {
  it('percentDrop calculates relative decline', () => {
    assert.equal(percentDrop(5, 10), 50);
  });

  it('detects conversion crash when CR drops sharply', () => {
    const nowMs = Date.now();
    const landingCur = Array.from({ length: 30 }, () => event('landing_visit', 2));
    const landingPrior = Array.from({ length: 30 }, () => event('landing_visit', 30));
    const priorLeads = Array.from({ length: 10 }, () => event('lead_submit', 30));
    const curLeads = [event('lead_submit', 2)];

    const metrics = buildCeoAlertMetrics({
      config: { thresholds: { conversionDropPctMin: 35, conversionMinLanding24h: 20 } },
      analyticsEvents: [...landingCur, ...landingPrior, ...priorLeads, ...curLeads],
      nowMs
    });

    assert.equal(metrics.conversion.crashSignal, 1);
  });

  it('fires CEO checkout failure alert', () => {
    const snap = buildCeoAlertSnapshot({
      config: { thresholds: { checkoutFailureCount24h: 2 } },
      analyticsEvents: [
        event('checkout_start', 1),
        event('checkout_start', 1),
        event('checkout_abandoned', 1)
      ],
      alertRules: [
        {
          id: 'ceo_checkout_failures',
          domain: 'revenue',
          severity: 'error',
          metric: 'checkout.failureAlertSignal',
          op: 'gte',
          threshold: 1,
          message: 'checkout'
        }
      ]
    });
    assert.ok(snap.alerts.triggered.some((a) => a.id === 'ceo_checkout_failures'));
  });

  it('detects stripe webhook failures from ops events', () => {
    const metrics = buildCeoAlertMetrics({
      operationalEvents: [
        {
          event_name: 'webhook_stripe_signature_invalid',
          severity: 'critical',
          created_at: new Date().toISOString()
        }
      ]
    });
    assert.equal(metrics.stripe.webhookFailCount24h, 1);
  });
});
