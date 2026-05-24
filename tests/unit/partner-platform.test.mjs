import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PARTNER_RATE_CARD,
  PARTNER_FUNNEL_EVENTS,
  renderRateCardHtml
} from '../../js/features/partner/partner-platform.js';

test('PARTNER_RATE_CARD includes pilot and enterprise tiers', () => {
  const ids = PARTNER_RATE_CARD.map((p) => p.id);
  assert.ok(ids.includes('pilot'));
  assert.ok(ids.includes('cpl'));
  assert.ok(ids.includes('enterprise'));
});

test('renderRateCardHtml outputs rate grid markup', () => {
  const html = renderRateCardHtml();
  assert.match(html, /ib-partner-rate-grid/);
  assert.match(html, /Pilot/);
});

test('PARTNER_FUNNEL_EVENTS uses partner_ prefix', () => {
  assert.equal(PARTNER_FUNNEL_EVENTS.APPLICATION_SUBMIT, 'partner_application_submit');
  assert.equal(PARTNER_FUNNEL_EVENTS.FUNNEL_QUALIFICATION, 'partner_funnel_qualification');
  assert.equal(PARTNER_FUNNEL_EVENTS.ONBOARDING_COMPLETE, 'partner_onboarding_complete');
});
