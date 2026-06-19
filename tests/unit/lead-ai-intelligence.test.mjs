import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLeadAiSummary,
  computePartnerMatchScores
} from '../../js/features/admin/lead-ai-intelligence.js';
import { mapPartnerEndpointRow } from '../../js/features/partner/partner-match-engine.js';

test('buildLeadAiSummary produces admin narrative fields', () => {
  const summary = buildLeadAiSummary({
    usage: 'family',
    loan: 'yes',
    budget: 1_500_000,
    purchase_timeline: '0-30',
    urgency: 'high',
    lead_score: 82,
    body: 'suv'
  });

  assert.match(summary.narrative, /Finansman|yüksek|dönüşüm/i);
  assert.ok(summary.userType);
  assert.match(summary.partnerRecommendation, /finansman|Finans/i);
});

test('computePartnerMatchScores ranks SUV partner for SUV lead', () => {
  const scores = computePartnerMatchScores({
    body: 'suv',
    budget: 1_400_000,
    purchase_timeline: '1-3',
    urgency: 'medium',
    lead_score: 70
  });

  assert.ok(scores.length >= 3);
  assert.ok(scores[0].score >= scores[1].score);
  assert.ok(scores[0].category);
  assert.ok(scores[0].reason);
});

test('mapPartnerEndpointRow maps live partner endpoint', () => {
  const mapped = mapPartnerEndpointRow({
    id: 'ep-1',
    name: 'Live Dealer',
    route_type: 'dealer_partner',
    is_active: true,
    priority_weight: 120,
    health_status: 'healthy'
  });

  assert.equal(mapped.name, 'Live Dealer');
  assert.equal(mapped.route, 'dealer_partner');
  assert.equal(mapped.source, 'live');
});
