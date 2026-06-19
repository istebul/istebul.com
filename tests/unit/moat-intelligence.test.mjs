import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateSegmentBenchmarksFromLeads,
  computeMoatDashboard
} from '../../js/features/moat/moat-intelligence-shared.js';

test('aggregateSegmentBenchmarksFromLeads requires min 3 samples', () => {
  const rows = aggregateSegmentBenchmarksFromLeads([
    { segment_key: 'a|b|c|d', partner_status: 'won', lead_score: 120, top_match_score: 88 },
    { segment_key: 'a|b|c|d', partner_status: 'lost', lead_score: 110, top_match_score: 80 },
    { segment_key: 'a|b|c|d', partner_status: 'won', lead_score: 130, top_match_score: 90 }
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sample_size, 3);
  assert.ok(rows[0].win_rate_pct > 0);
});

test('computeMoatDashboard counts outcomes, feedback, and signals', () => {
  const dash = computeMoatDashboard(
    [
      { partner_status: 'won', decision_session_id: 'x', scoring_calibration_delta: 4, segment_key: 's1' },
      { partner_status: 'pending', decision_session_id: 'y', scoring_calibration_delta: 0, segment_key: 's1' },
      { partner_status: 'pending', segment_key: 's1' }
    ],
    [{ feedback_type: 'helpful' }, { feedback_type: 'unclear' }],
    [
      { signal_type: 'lead_submitted', signal_source: 'user' },
      { signal_type: 'partner_sale', signal_source: 'partner' }
    ]
  );
  assert.equal(dash.outcomeCount, 1);
  assert.equal(dash.calibratedLeadCount, 1);
  assert.equal(dash.feedbackTotal, 2);
  assert.equal(dash.feedbackCounts.helpful, 1);
  assert.equal(dash.outcomeSignalTotal, 2);
  assert.equal(dash.outcomeSignalByType.lead_submitted, 1);
});
