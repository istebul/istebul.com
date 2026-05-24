import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeExecutiveFunnel,
  computeChannelBreakdown,
  countFunnelStep,
  conversionRate
} from '../../js/features/growth/growth-kpis.js';

describe('growth-kpis', () => {
  it('conversionRate handles zero denominator', () => {
    assert.equal(conversionRate(5, 0), null);
    assert.equal(conversionRate(1, 4), 25);
  });

  it('countFunnelStep dedupes legacy aliases', () => {
    const rows = [
      { event_name: 'page_view' },
      { event_name: 'landing_visit' },
      { event_name: 'auto_lead_submit' }
    ];
    assert.equal(countFunnelStep(rows, 'landing_visit'), 2);
    assert.equal(countFunnelStep(rows, 'lead_submit'), 1);
  });

  it('computeExecutiveFunnel returns north star metrics', () => {
    const rows = [
      { event_name: 'landing_visit' },
      { event_name: 'hero_cta_click' },
      { event_name: 'auto_lead_submit', properties: { growth_channel: 'paid' } },
      { event_name: 'checkout_start' },
      { event_name: 'paid_conversion', revenue_cents: 29900 }
    ];
    const result = computeExecutiveFunnel(rows);
    assert.equal(result.northStar.qualifiedLeads, 1);
    assert.equal(result.northStar.paidConversions, 1);
    assert.ok(result.steps.length >= 8);
  });

  it('computeChannelBreakdown groups leads by channel', () => {
    const rows = [
      { event_name: 'auto_lead_submit', properties: { growth_channel: 'seo' } },
      { event_name: 'auto_lead_submit', properties: { growth_channel: 'paid' } }
    ];
    const channels = computeChannelBreakdown(rows);
    assert.equal(channels.find((c) => c.channel === 'seo')?.leads, 1);
    assert.equal(channels.find((c) => c.channel === 'paid')?.leads, 1);
  });
});
