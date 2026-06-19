import test from 'node:test';
import assert from 'node:assert/strict';

const {
  HIGH_RISK_THRESHOLD,
  normalizeListingsDataset,
  filterListingsForDisplay,
  isArchivedListing,
  isDuplicateListing,
  computeNormalizedKpiStats
} = await import('../../js/admin/ai-listings-admin-kpi.js');

const { buildKpiCardsHtml } = await import('../../js/admin/ai-listings-admin-core.js');

const today = new Date().toISOString();

const listings = [
  {
    id: '1',
    title: 'BMW 320i',
    category: 'vehicle',
    status: 'approved',
    created_at: today,
    latest_analysis: { ai_score: 80, risk_score: 30, quality_score: 85 }
  },
  {
    id: '2',
    title: 'Audi A4',
    category: 'vehicle',
    status: 'approved',
    created_at: today,
    latest_analysis: { ai_score: 70, risk_score: 65, quality_score: 75 }
  },
  {
    id: '3',
    title: 'Eski Konut',
    category: 'housing',
    status: 'archived',
    created_at: '2020-01-01T00:00:00.000Z',
    latest_analysis: { ai_score: 60, risk_score: 40, quality_score: 70 }
  },
  {
    id: '4',
    title: 'Mükerrer İlan',
    category: 'vehicle',
    status: 'review',
    duplicate_status: 'duplicate',
    created_at: today,
    latest_analysis: { risk_score: 80, quality_score: 50 }
  }
];

test('4 listings produce total 4', () => {
  const stats = computeNormalizedKpiStats(listings);
  assert.equal(stats.total, 4);
});

test('active excludes archived', () => {
  const stats = computeNormalizedKpiStats(listings);
  assert.equal(stats.active, 3);
  assert.equal(stats.archived, 1);
});

test('duplicate count consistent', () => {
  const stats = computeNormalizedKpiStats(listings);
  assert.equal(stats.duplicate, 1);
});

test('today count consistent', () => {
  const stats = computeNormalizedKpiStats(listings);
  assert.equal(stats.todayAdded, 3);
});

test('7 day count includes recent listings', () => {
  const stats = computeNormalizedKpiStats(listings);
  assert.ok(stats.last7Days >= 3);
});

test('30 day count includes all recent', () => {
  const stats = computeNormalizedKpiStats(listings);
  assert.ok(stats.last30Days >= 3);
});

test('high risk threshold consistent', () => {
  assert.equal(HIGH_RISK_THRESHOLD, 61);
  const stats = computeNormalizedKpiStats(listings);
  assert.equal(stats.highRisk, 2);
});

test('average AI ignores missing scores safely', () => {
  const stats = computeNormalizedKpiStats(listings);
  assert.ok(stats.averageAi >= 60 && stats.averageAi <= 80);
});

test('average risk ignores missing scores safely', () => {
  const stats = computeNormalizedKpiStats(listings);
  assert.ok(stats.averageRisk >= 30 && stats.averageRisk <= 70);
});

test('average quality ignores missing scores safely', () => {
  const stats = computeNormalizedKpiStats(listings);
  assert.ok(stats.averageQuality >= 50 && stats.averageQuality <= 90);
});

test('search filter reduces total consistently', () => {
  const stats = computeNormalizedKpiStats(listings, { searchQuery: 'bmw' });
  assert.equal(stats.total, 1);
});

test('filterListingsForDisplay matches search', () => {
  const filtered = filterListingsForDisplay(listings, 'audi');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, 'Audi A4');
});

test('normalizeListingsDataset handles null', () => {
  assert.deepEqual(normalizeListingsDataset(null), []);
});

test('isArchivedListing detects archived', () => {
  assert.equal(isArchivedListing({ status: 'archived' }), true);
  assert.equal(isArchivedListing({ status: 'approved' }), false);
});

test('isDuplicateListing detects duplicate_status', () => {
  assert.equal(isDuplicateListing({ duplicate_status: 'duplicate' }), true);
  assert.equal(isDuplicateListing({}), false);
});

test('empty dataset returns zeros', () => {
  const stats = computeNormalizedKpiStats([]);
  assert.equal(stats.total, 0);
  assert.equal(stats.active, 0);
  assert.equal(stats.averageAi, 0);
});

test('buildKpiCardsHtml uses total from stats', () => {
  const stats = computeNormalizedKpiStats(listings);
  const html = buildKpiCardsHtml(stats, listings);
  assert.match(html, /Toplam İlan/);
  assert.match(html, /Bugün Analiz/);
  assert.match(html, /Yüksek Risk/);
  assert.match(html, /İncelemede/);
  assert.match(html, /data-kpi-value="4"/);
});

test('buildKpiCardsHtml renders decision KPI hint copy', () => {
  const html = buildKpiCardsHtml(computeNormalizedKpiStats(listings), listings);
  assert.match(html, /aktif kayıt/);
  assert.match(html, /risk ≥ 61/);
});

test('pending review counted', () => {
  const stats = computeNormalizedKpiStats(listings);
  assert.equal(stats.pendingReview, 1);
});

test('KPI stats JSON stable for same input', () => {
  const a = JSON.stringify(computeNormalizedKpiStats(listings));
  const b = JSON.stringify(computeNormalizedKpiStats(listings));
  assert.equal(a, b);
});
