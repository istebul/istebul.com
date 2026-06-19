import test from 'node:test';
import assert from 'node:assert/strict';

const {
  computeAdminDecisionAnalytics,
  computeDuplicateRatePercent,
  sumDistributionCounts,
  clearAnalyticsMemoCache
} = await import('../../js/admin/ai-listings-admin-analytics-stats.js');

const {
  normalizeAdminDataset,
  normalizeListingRecord
} = await import('../../js/admin/ai-listings-dataset.js');

const today = '2026-06-08T10:00:00.000Z';

const listings = [
  {
    id: '1',
    title: 'BMW 320i',
    category: 'vehicle',
    status: 'approved',
    created_at: today,
    latest_analysis: { ai_score: 80, risk_score: 30, quality_score: 85, decision_score: 80 }
  },
  {
    id: '2',
    title: 'Audi A4',
    category: 'vehicle',
    status: 'review',
    duplicate_status: 'exact',
    created_at: today,
    latest_analysis: { ai_score: 70, risk_score: 65, quality_score: 75, decision_score: 70 }
  },
  {
    id: '3',
    title: 'Broken',
    category: null,
    status: null,
    created_at: 'invalid',
    latest_analysis: { risk_score: 'bad', quality_score: null }
  },
  null,
  'invalid'
];

test('normalizeListingRecord drops invalid entries and coerces fields', () => {
  const dataset = normalizeAdminDataset(listings);
  assert.equal(dataset.length, 3);
  assert.equal(dataset[2].status, 'draft');
  assert.equal(dataset[2].category, 'general');
  assert.equal(dataset[2].latest_analysis?.risk_score, null);
});

test('duplicate rate percent is deterministic', () => {
  clearAnalyticsMemoCache();
  const stats = computeAdminDecisionAnalytics(listings);
  assert.equal(stats.total, 3);
  assert.match(String(stats.duplicateRate), /%$/);
  assert.equal(stats.duplicateRatePercent, computeDuplicateRatePercent(stats.duplicate, stats.total));
});

test('high risk and pending review counts are stable', () => {
  clearAnalyticsMemoCache();
  const stats = computeAdminDecisionAnalytics(listings);
  assert.equal(stats.highRisk, 1);
  assert.equal(stats.pendingReview, 1);
  assert.equal(stats.highRiskThreshold, 61);
});

test('average AI and quality stay finite with malformed analysis rows', () => {
  clearAnalyticsMemoCache();
  const stats = computeAdminDecisionAnalytics(listings);
  assert.ok(Number.isFinite(stats.averageAi));
  assert.ok(Number.isFinite(stats.averageQuality));
  assert.ok(Number.isFinite(stats.averageRisk));
  assert.equal(stats.decisionKpi.averageAi, 75);
  assert.equal(stats.decisionKpi.averageQuality, 80);
  assert.equal(stats.decisionKpi.averageRisk, 48);
});

test('distribution totals match bucket counts', () => {
  clearAnalyticsMemoCache();
  const stats = computeAdminDecisionAnalytics(listings);
  assert.equal(stats.distributionTotals.ai_score, sumDistributionCounts(stats.distributions.ai_score));
  assert.equal(stats.distributionTotals.risk, sumDistributionCounts(stats.distributions.risk));
  assert.equal(stats.distributionTotals.quality, sumDistributionCounts(stats.distributions.quality));
  assert.equal(stats.distributionTotals.duplicate, sumDistributionCounts(stats.distributions.duplicate));
});

test('empty dataset returns safe defaults', () => {
  clearAnalyticsMemoCache();
  const stats = computeAdminDecisionAnalytics([]);
  assert.equal(stats.total, 0);
  assert.equal(stats.duplicateRate, '—');
  assert.equal(stats.duplicateRatePercent, 0);
  assert.equal(stats.pendingReview, 0);
});

test('search query reduces analytics total deterministically', () => {
  clearAnalyticsMemoCache();
  const filtered = computeAdminDecisionAnalytics(listings, { searchQuery: 'bmw' });
  assert.equal(filtered.total, 1);
});

test('same input yields stable JSON snapshot', () => {
  clearAnalyticsMemoCache();
  const a = JSON.stringify(computeAdminDecisionAnalytics(listings));
  const b = JSON.stringify(computeAdminDecisionAnalytics(listings));
  assert.equal(a, b);
});

test('normalizeListingRecord returns null without id', () => {
  assert.equal(normalizeListingRecord({ title: 'No id' }), null);
});
