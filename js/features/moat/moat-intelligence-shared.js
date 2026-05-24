/**
 * Shared moat aggregates (browser + tests).
 */

const WIN_STATUSES = new Set(['paid', 'closed', 'won', 'delivered', 'funded', 'purchased']);

export function aggregateSegmentBenchmarksFromLeads(leads = []) {
  const buckets = new Map();

  for (const lead of leads) {
    const key = String(lead.segment_key || '');
    if (!key) continue;

    const bucket = buckets.get(key) || { total: 0, wins: 0, scoreSum: 0, matchSum: 0, calibrated: 0 };
    bucket.total += 1;
    if (WIN_STATUSES.has(String(lead.partner_status || ''))) bucket.wins += 1;
    bucket.scoreSum += Number(lead.lead_score || 0);
    bucket.matchSum += Number(lead.top_match_score || 0);
    if (Number(lead.scoring_calibration_delta || 0) !== 0) bucket.calibrated += 1;
    buckets.set(key, bucket);
  }

  const rows = [];
  for (const [segment_key, bucket] of buckets) {
    if (bucket.total < 3) continue;
    rows.push({
      segment_key,
      sample_size: bucket.total,
      win_rate_pct: Math.round((bucket.wins / bucket.total) * 1000) / 10,
      avg_lead_score: Math.round((bucket.scoreSum / bucket.total) * 10) / 10,
      avg_match_score: Math.round((bucket.matchSum / bucket.total) * 10) / 10,
      calibrated_leads: bucket.calibrated
    });
  }

  return rows.sort((a, b) => b.sample_size - a.sample_size);
}

export function computeMoatDashboard(leads = [], feedbackRows = []) {
  const rows = Array.isArray(leads) ? leads : [];
  const feedback = Array.isArray(feedbackRows) ? feedbackRows : [];

  const outcomeCount = rows.filter((l) => WIN_STATUSES.has(String(l.partner_status || ''))).length;
  const calibratedLeadCount = rows.filter((l) => Number(l.scoring_calibration_delta || 0) !== 0).length;
  const decisionLinkedCount = rows.filter((l) => l.decision_session_id).length;
  const topSegments = aggregateSegmentBenchmarksFromLeads(rows).slice(0, 6);

  const feedbackCounts = feedback.reduce((acc, row) => {
    const t = String(row.feedback_type || 'unknown');
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return {
    leadCount: rows.length,
    outcomeCount,
    calibratedLeadCount,
    decisionLinkedCount,
    segmentCount: topSegments.length,
    topSegments,
    feedbackCounts,
    feedbackTotal: feedback.length
  };
}
