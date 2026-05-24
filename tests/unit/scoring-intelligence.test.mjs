import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSegmentKey,
  describeCalibration,
  priorityFromScore
} from '../../js/features/moat/scoring-intelligence.js';

test('buildSegmentKey encodes interest budget body fuel', () => {
  const key = buildSegmentKey({
    interest_type: 'vehicle_offer',
    budget: 1500000,
    body: 'suv',
    fuel: 'hybrid'
  });
  assert.match(key, /vehicle_offer/);
  assert.match(key, /1m-2m/);
  assert.match(key, /suv/);
});

test('priorityFromScore maps thresholds', () => {
  assert.equal(priorityFromScore(160), 'very_hot');
  assert.equal(priorityFromScore(120), 'hot');
  assert.equal(priorityFromScore(60), 'warm');
  assert.equal(priorityFromScore(10), 'cold');
});

test('describeCalibration explains outcome delta', () => {
  const up = describeCalibration({ delta: 8, reason: 'outcome_calibrated' });
  assert.match(up.label, /kalibrasyon/i);
  const none = describeCalibration({ delta: 0, reason: 'insufficient_outcome_data' });
  assert.match(none.label, /Standart/i);
});
