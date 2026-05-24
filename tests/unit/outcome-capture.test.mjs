import test from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeOutcomeProperties,
  mapPartnerStatusToSignals,
  mapCrmLeadUpdateSignals,
  mapDecisionFeedbackToSignals,
  isClientOutcomeSignalType,
  aggregateOutcomeSignalCounts
} from '../../js/features/moat/outcome-capture-shared.js';

test('sanitizeOutcomeProperties strips PII keys', () => {
  const out = sanitizeOutcomeProperties({
    email: 'a@b.com',
    phone: '555',
    match_score: 88,
    vehicle_slug: 'toyota-corolla'
  });
  assert.equal(out.email, undefined);
  assert.equal(out.phone, undefined);
  assert.equal(out.match_score, 88);
  assert.equal(out.vehicle_slug, 'toyota-corolla');
});

test('mapPartnerStatusToSignals maps wins and funding', () => {
  const won = mapPartnerStatusToSignals('won');
  assert.ok(won.some((s) => s.signal_type === 'partner_sale'));
  assert.ok(won.some((s) => s.signal_type === 'lead_closed'));

  const funded = mapPartnerStatusToSignals('funded');
  assert.ok(funded.some((s) => s.signal_type === 'financing_accepted'));
});

test('mapCrmLeadUpdateSignals uses crm source', () => {
  const rows = mapCrmLeadUpdateSignals({ status: 'won', partner_status: 'paid' });
  assert.ok(rows.every((r) => r.signal_source === 'crm'));
  assert.ok(rows.some((r) => r.signal_type === 'lead_closed'));
});

test('mapDecisionFeedbackToSignals maps helpful to usefulness', () => {
  const rows = mapDecisionFeedbackToSignals('helpful');
  assert.ok(rows.some((r) => r.signal_type === 'recommendation_usefulness'));
  assert.ok(rows.some((r) => r.signal_type === 'user_satisfaction'));
});

test('isClientOutcomeSignalType allows user-facing signals only', () => {
  assert.equal(isClientOutcomeSignalType('vehicle_recommended_selected'), true);
  assert.equal(isClientOutcomeSignalType('partner_sale'), false);
});

test('aggregateOutcomeSignalCounts groups by type', () => {
  const agg = aggregateOutcomeSignalCounts([
    { signal_type: 'lead_submitted', signal_source: 'user' },
    { signal_type: 'lead_submitted', signal_source: 'user' },
    { signal_type: 'partner_sale', signal_source: 'partner' }
  ]);
  assert.equal(agg.total, 3);
  assert.equal(agg.byType.lead_submitted, 2);
});
