import test from 'node:test';
import assert from 'node:assert/strict';

const {
  normalizeRepositoryListing,
  normalizeRepository,
  extractRawAnalyses,
  buildRepositoryDataset,
  buildAdminRepositorySnapshot,
  traceRepositoryFilterPipeline
} = await import('../../js/admin/ai-listings-dataset.js');

const { runRepositoryQuery } = await import('../../js/ai-listings-repository/index.js');

const { buildRepositoryDashboardHtml } = await import('../../js/admin/ai-listings-repository-admin.js');

const vehicleListing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2021 BMW 320i M Sport',
  source_type: 'manual',
  status: 'approved',
  created_at: '2026-06-07T10:00:00.000Z',
  attributes: { brand: 'BMW', model: '320i', year: 2021 },
  latest_analysis: { ai_score: 82, risk_score: 28, quality_score: 88, decision_score: 82 }
};

const housingListing = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'housing',
  title: 'Kadıköy 3+1 Daire',
  source_type: 'csv',
  status: 'pending_review',
  created_at: '2026-06-06T08:00:00.000Z',
  attributes: {},
  latest_analysis: { ai_score: 65, risk_score: 72, quality_score: 60, decision_score: 65 }
};

test('normalizeRepositoryListing preserves latest_analysis', () => {
  const normalized = normalizeRepositoryListing(vehicleListing);
  assert.equal(normalized?.id, vehicleListing.id);
  assert.equal(normalized?.latest_analysis?.ai_score, 82);
});

test('extractRawAnalyses collects embedded analyses', () => {
  const analyses = extractRawAnalyses([vehicleListing, housingListing]);
  assert.equal(analyses.length, 2);
  assert.equal(analyses[0].listing_id, vehicleListing.id);
});

test('buildRepositoryDataset derives records from listings', () => {
  const dataset = buildRepositoryDataset([vehicleListing, housingListing], {
    includeDuplicateDetection: false
  });
  assert.equal(dataset.length, 2);
  assert.equal(dataset[0].brand, 'BMW');
});

test('buildAdminRepositorySnapshot aligns cachedListings and repositoryDataset lengths', () => {
  const snapshot = buildAdminRepositorySnapshot([vehicleListing, housingListing]);
  assert.equal(snapshot.rawListings.length, 2);
  assert.equal(snapshot.cachedListings.length, 2);
  assert.equal(snapshot.repositoryDataset.length, 2);
  assert.equal(snapshot.rawAnalyses.length, 2);
});

test('repository dashboard ignores legacy top-bar search when aiSearch empty', () => {
  const listings = [vehicleListing, housingListing];
  const { query } = buildRepositoryDashboardHtml(listings, {
    aiSearch: '',
    search: 'nomatch-query'
  });
  assert.equal(query.filtered.length, 2);
});

test('repository dashboard returns full dataset when aiSearch and filters empty', () => {
  const listings = [vehicleListing, housingListing];
  const { query } = buildRepositoryDashboardHtml(listings, {
    aiSearch: '',
    filters: []
  });
  assert.equal(query.filtered.length, 2);
});

test('normalizeRepository batch-normalizes listings', () => {
  const normalized = normalizeRepository([vehicleListing, housingListing]);
  assert.equal(normalized.length, 2);
});

test('runRepositoryQuery accepts prebuilt records dataset', () => {
  const dataset = buildRepositoryDataset([vehicleListing, housingListing], {
    includeDuplicateDetection: false
  });
  const result = runRepositoryQuery([], { records: dataset, categoryTab: 'all' });
  assert.equal(result.records.length, 2);
  assert.equal(result.filtered.length, 2);
});

test('traceRepositoryFilterPipeline applies category and chip filters', () => {
  const dataset = buildRepositoryDataset([vehicleListing, housingListing], {
    includeDuplicateDetection: false
  });
  const traced = traceRepositoryFilterPipeline(dataset, {
    categoryTab: 'vehicle',
    filters: [],
    search: ''
  });
  assert.equal(traced.stages.before, 2);
  assert.equal(traced.stages.afterCategory, 1);
  assert.equal(traced.filtered.length, 1);
});
