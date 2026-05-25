import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  scorePartnerApplication,
  recommendNextSalesAction,
  SALES_TOUCH_TYPES
} from '../../js/features/sales/partner-sales-crm.js';
import {
  recommendPartnerTier,
  getPricingTalkTrack,
  estimatePartnerPipelineValue
} from '../../js/features/sales/partner-pricing-strategy.js';
import { computeOnboardingVelocity, velocityBadgeClass } from '../../js/features/sales/partner-onboarding-velocity.js';
import { interpolateOutboundTemplate } from '../../js/features/sales/partner-sales-assets.js';

describe('P6 B2B sales machine', () => {
  it('scores enterprise applications higher', () => {
    const low = scorePartnerApplication({ billing_plan: 'pilot', status: 'new' });
    const high = scorePartnerApplication({
      billing_plan: 'enterprise',
      status: 'qualified',
      webhook_ready: true
    });
    assert.ok(high > low);
  });

  it('recommendNextSalesAction for integrating without webhook', () => {
    const next = recommendNextSalesAction({ status: 'integrating', webhook_ready: false });
    assert.match(next.action, /webhook/i);
    assert.equal(next.priority, 'high');
  });

  it('recommendPartnerTier by volume', () => {
    assert.equal(recommendPartnerTier({ monthly_lead_volume: 200 }).tierId, 'enterprise');
    assert.equal(recommendPartnerTier({ monthly_lead_volume: 10 }).tierId, 'starter');
  });

  it('getPricingTalkTrack returns band copy', () => {
    const track = getPricingTalkTrack('starter');
    assert.ok(track.bandLine.includes('5.000') || track.bandLine.includes('5000'));
  });

  it('computeOnboardingVelocity flags stuck apps', () => {
    const old = new Date(Date.now() - 8 * 86400000).toISOString();
    const v = computeOnboardingVelocity({
      created_at: old,
      onboarding_step: 1,
      status: 'integrating'
    });
    assert.equal(v.health, 'stuck');
    assert.equal(velocityBadgeClass(v), 'badge-red');
  });

  it('interpolateOutboundTemplate replaces vars', () => {
    const out = interpolateOutboundTemplate('Hello {{name}}', { name: 'Test' });
    assert.equal(out, 'Hello Test');
  });

  it('sales data files are p6.1', () => {
    const machine = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/sales/sales-machine.json'), 'utf8')
    );
    assert.equal(machine.version, 'p6.1');
    assert.ok(SALES_TOUCH_TYPES.length >= 5);
  });

  it('estimatePartnerPipelineValue returns ROI', () => {
    const roi = estimatePartnerPipelineValue({
      monthlyLeads: 80,
      closeRate: 0.1,
      avgDealValue: 500000,
      tierId: 'growth'
    });
    assert.ok(roi.estimatedMonthlyGrossTry > 0);
  });
});
