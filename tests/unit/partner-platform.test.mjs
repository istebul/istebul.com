import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PARTNER_RATE_CARD,
  PARTNER_FUNNEL_EVENTS,
  renderRateCardHtml
} from '../../js/features/partner/partner-platform.js';

test('PARTNER_RATE_CARD includes starter growth enterprise tiers', () => {
  const ids = PARTNER_RATE_CARD.map((p) => p.id);
  assert.ok(ids.includes('starter'));
  assert.ok(ids.includes('growth'));
  assert.ok(ids.includes('enterprise'));
});

test('renderRateCardHtml outputs offer grid markup', () => {
  const html = renderRateCardHtml({ origin: 'https://example.com', showPilot: false });
  assert.match(html, /ib-partner-offer-grid/);
  assert.match(html, /Starter/);
});

test('PARTNER_FUNNEL_EVENTS includes pricing events', () => {
  assert.equal(PARTNER_FUNNEL_EVENTS.PRICING_VIEW, 'partner_pricing_view');
  assert.equal(PARTNER_FUNNEL_EVENTS.APPLICATION_SUBMIT, 'partner_application_submit');
});
