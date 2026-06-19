import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  SUPPORTED_LISTING_CATEGORIES,
  clearListingNormalizationMemoCache,
  normalizeListingRecord,
  runListingNormalizationEngine,
  clearDuplicateClusterMemoCache,
  runDuplicateClusterEngine,
  clearListingQualityEnrichmentMemoCache,
  runListingQualityEnrichment,
  clearEntityResolutionMemoCache,
  runEntityResolutionEngine,
  runListingDataPoolEngine,
  buildDataPoolPanelHtml
} = await import('../../js/ai-listing-data-pool/index.js');

const vehicleListing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2022 BMW 320i',
  description: 'Yetkili servis bakımlı',
  price: 1780000,
  location: 'İzmir',
  images: ['a.jpg', 'b.jpg'],
  attributes: { brand: 'BMW', model: '320i', year: 2022, km: 45000 }
};

const housingListing = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'housing',
  title: 'Kadıköy 3+1',
  description: 'Tapu kat mülkiyeti',
  price: 5200000,
  location: 'İstanbul',
  images: ['h.jpg'],
  attributes: { room_count: 3, sqm: 120, floor: 4, building_age: 10 }
};

const vacationListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'vacation',
  title: 'Antalya Paket',
  description: 'Esnek iptal',
  price: 42000,
  location: 'Antalya',
  images: ['t.jpg'],
  attributes: { date: '2026-07-01', capacity: 4, cancellation_policy: 'flexible' }
};

const listings = [vehicleListing, housingListing, vacationListing];

test('SUPPORTED_LISTING_CATEGORIES includes vehicle, housing, vacation', () => {
  assert.deepEqual(SUPPORTED_LISTING_CATEGORIES, ['vehicle', 'housing', 'vacation']);
});

test('normalizeListingRecord produces normalizedListing with dataCompleteness', () => {
  const normalized = normalizeListingRecord(vehicleListing);
  assert.equal(normalized.normalized, true);
  assert.ok(normalized.dataCompleteness >= 0);
});

test('runListingNormalizationEngine is deterministic with memo cache', () => {
  clearListingNormalizationMemoCache();
  const first = runListingNormalizationEngine(listings);
  const second = runListingNormalizationEngine(listings);
  assert.deepEqual(first, second);
  assert.equal(first.count, 3);
});

test('runDuplicateClusterEngine produces duplicateCluster output', () => {
  clearDuplicateClusterMemoCache();
  const result = runDuplicateClusterEngine(listings);
  assert.ok(Array.isArray(result.clusters));
  assert.equal(result.clusters.length, 3);
  assert.ok(result.clusters[0].duplicateCluster);
});

test('runListingQualityEnrichment computes dataCompleteness', () => {
  clearListingQualityEnrichmentMemoCache();
  const result = runListingQualityEnrichment(listings);
  assert.equal(result.enrichments.length, 3);
  assert.ok(result.avgDataCompleteness > 0);
});

test('runEntityResolutionEngine computes entityConfidence without sensitive inference', () => {
  clearEntityResolutionMemoCache();
  const result = runEntityResolutionEngine(listings);
  assert.equal(result.entities.length, 3);
  assert.ok(result.avgEntityConfidence > 0);
  assert.ok(result.entities[0].note.includes('hassas kişisel'));
});

test('runListingDataPoolEngine orchestrates all data pool engines', () => {
  clearListingNormalizationMemoCache();
  clearDuplicateClusterMemoCache();
  clearListingQualityEnrichmentMemoCache();
  clearEntityResolutionMemoCache();
  const pool = runListingDataPoolEngine(listings);
  assert.ok(pool.normalization);
  assert.ok(pool.duplicateClusters);
  assert.ok(pool.qualityEnrichment);
  assert.ok(pool.entityResolution);
});

test('buildDataPoolPanelHtml escapes user content', () => {
  const pool = runListingDataPoolEngine(listings);
  pool.avgDataCompleteness = '<img onerror=alert(1)>';
  const html = buildDataPoolPanelHtml(pool);
  assert.ok(!html.includes('<img onerror'));
});

test('listing data pool module files exist', () => {
  const files = [
    'listing-normalization-engine.js',
    'duplicate-cluster-engine.js',
    'listing-quality-enrichment.js',
    'entity-resolution-engine.js'
  ];
  for (const file of files) {
    const rel = `supabase/functions/_shared/ai-listings/listing-data-pool/${file}`;
    assert.ok(fs.existsSync(path.join(process.cwd(), rel)), rel);
  }
});
