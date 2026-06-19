import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildListingRecommendationRecord,
  resolveRecommendationForListing,
  ensureRecommendationCache,
  findCachedRecommendation
} = await import('../../js/admin/ai-listings-recommendation-resolver.js');

const profile = {
  category: 'vehicle',
  budget: 1800000,
  city: 'İzmir',
  usage_type: 'family',
  family_size: 4,
  annual_km: 15000,
  risk_tolerance: 'medium',
  priority: 'total_cost'
};

const listing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2022 BMW 320i M Sport',
  price: 1780000,
  location: 'İzmir',
  status: 'draft',
  latest_analysis: { quality_score: 47, risk_score: 55, decision_score: 37 }
};

test('buildListingRecommendationRecord returns id and fit_score for listing', () => {
  const rec = buildListingRecommendationRecord(listing, profile, [listing]);
  assert.ok(rec?.id);
  assert.ok(Number(rec.fit_score) > 0);
  assert.equal(rec.quality_score, 47);
});

test('resolveRecommendationForListing uses cache when available', () => {
  const cached = { top: [{ id: listing.id, fit_score: 99, title: 'Cached' }] };
  const rec = resolveRecommendationForListing(listing, { cachedResult: cached, profile });
  assert.equal(rec.fit_score, 99);
});

test('resolveRecommendationForListing falls back without cache', () => {
  const rec = resolveRecommendationForListing(listing, { profile, allListings: [listing] });
  assert.equal(String(rec.id), listing.id);
  assert.ok(Number(rec.fit_score) > 0);
});

test('ensureRecommendationCache builds top recommendations from listings', () => {
  const result = ensureRecommendationCache([listing], profile);
  assert.ok(result?.top?.length >= 1);
  assert.equal(String(result.top[0].id), listing.id);
});

test('findCachedRecommendation returns null without cache', () => {
  assert.equal(findCachedRecommendation(listing.id, null), null);
});
