import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FUNNEL_STEPS,
  SAMPLE_WEBHOOK_PAYLOAD,
  PARTNER_FUNNEL_STEP_EVENTS,
  renderStepper
} from '../../js/features/partner/partner-funnel.js';
import { buildOnboardingUrl } from '../../js/features/partner/partner-platform.js';

test('FUNNEL_STEPS defines six acquisition steps', () => {
  assert.equal(FUNNEL_STEPS.length, 6);
  assert.equal(FUNNEL_STEPS[0].key, 'application');
  assert.equal(FUNNEL_STEPS[5].key, 'complete');
});

test('PARTNER_FUNNEL_STEP_EVENTS maps steps 2-6', () => {
  assert.equal(PARTNER_FUNNEL_STEP_EVENTS[2], 'partner_funnel_qualification');
  assert.equal(PARTNER_FUNNEL_STEP_EVENTS[6], 'partner_onboarding_complete');
});

test('renderStepper marks current and done steps', () => {
  const html = renderStepper(3, 2);
  assert.match(html, /ib-partner-funnel-stepper/);
  assert.match(html, /is-current/);
  assert.match(html, /is-done/);
});

test('SAMPLE_WEBHOOK_PAYLOAD includes lead_score and partner_route', () => {
  assert.ok(SAMPLE_WEBHOOK_PAYLOAD.lead_score >= 100);
  assert.equal(SAMPLE_WEBHOOK_PAYLOAD.partner_route, 'dealer_partner');
});

test('buildOnboardingUrl points to partner-basvuru', () => {
  const url = buildOnboardingUrl('abc123token', 4);
  assert.match(url, /partner-basvuru\.html/);
  assert.match(url, /token=abc123token/);
  assert.match(url, /step=4/);
});
