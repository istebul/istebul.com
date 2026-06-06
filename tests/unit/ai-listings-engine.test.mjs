import test from 'node:test';
import assert from 'node:assert/strict';

const {
  isAiListingsEnabled,
  setAiListingsLocalOverride,
  clearAiListingsLocalOverride,
  createAiListingsContainer,
  createEmptyListing,
  validateListing,
  createEmptyAIAnalysis,
  validateAIAnalysis,
  normalizeAIAnalysis,
  runAnalysisPipeline,
  computeScores,
  processListing,
  AI_LISTINGS_MODULE_VERSION
} = await import('../../src/ai-listings/index.js');

test('module is inactive by default', () => {
  clearAiListingsLocalOverride();
  assert.equal(isAiListingsEnabled(), false);
});

test('feature flag can be enabled for tests', () => {
  setAiListingsLocalOverride(true);
  assert.equal(isAiListingsEnabled(), true);
  clearAiListingsLocalOverride();
  assert.equal(isAiListingsEnabled(), false);
});

test('Listing interface validation', () => {
  const listing = createEmptyListing({ id: 'l-1', category: 'vehicle', title: 'Test', price: 100 });
  const result = validateListing(listing);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('Listing validation rejects invalid category', () => {
  const listing = createEmptyListing({ id: 'l-2', category: 'invalid' });
  const result = validateListing(listing);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('category')));
});

test('AIAnalysis interface validation and normalization', () => {
  const analysis = createEmptyAIAnalysis({
    ai_score: 150,
    risk_score: -10,
    confidence: 2
  });
  const normalized = normalizeAIAnalysis(analysis);
  assert.equal(normalized.ai_score, 100);
  assert.equal(normalized.risk_score, 0);
  assert.equal(normalized.confidence, 1);

  const validation = validateAIAnalysis(normalized);
  assert.equal(validation.valid, true);
});

test('computeScores produces bounded values', () => {
  const listing = createEmptyListing({
    id: 'l-3',
    title: 'Car',
    description: 'A well maintained vehicle with full service history.',
    price: 500000,
    location: 'Ankara'
  });
  const scores = computeScores({ listing, market_score: 60, price_score: 70 });
  assert.ok(scores.ai_score >= 0 && scores.ai_score <= 100);
  assert.ok(scores.risk_score >= 0 && scores.risk_score <= 100);
  assert.ok(scores.confidence >= 0 && scores.confidence <= 1);
});

test('runAnalysisPipeline returns analysis for valid listing', async () => {
  const listing = createEmptyListing({
    id: 'l-4',
    category: 'housing',
    title: '3+1 Daire',
    description: 'Merkezi konumda satılık daire.',
    price: 3200000,
    location: 'İzmir'
  });
  const result = await runAnalysisPipeline({ listing });
  assert.equal(result.ok, true);
  assert.ok(result.analysis);
  assert.ok(result.analysis.summary.length > 0);
  assert.ok(Array.isArray(result.analysis.pros));
});

test('services return empty when engine is inactive', async () => {
  clearAiListingsLocalOverride();
  const container = createAiListingsContainer();
  const listing = createEmptyListing({ id: 'l-5', title: 'Inactive test' });

  const list = await container.services.listingService.list();
  assert.deepEqual(list, []);

  const analyzed = await container.services.aiAnalysisService.analyze(listing);
  assert.equal(analyzed.ok, false);

  const processed = await processListing(listing);
  assert.equal(processed.enabled, false);
});

test('services operate when engine is enabled', async () => {
  setAiListingsLocalOverride(true);
  const container = createAiListingsContainer();
  const listing = createEmptyListing({
    id: 'l-6',
    category: 'vehicle',
    title: 'Enabled test',
    description: 'Test listing for enabled engine.',
    price: 100000,
    location: 'Bursa'
  });

  const upsert = await container.services.listingService.upsert(listing);
  assert.equal(upsert.ok, true);

  const analyzed = await container.services.aiAnalysisService.analyze(upsert.listing);
  assert.equal(analyzed.ok, true);
  assert.ok(analyzed.analysis);

  const recommendations = await container.services.recommendationService.recommend({ limit: 5 });
  assert.ok(Array.isArray(recommendations));

  clearAiListingsLocalOverride();
});

test('module version is exported', () => {
  assert.equal(typeof AI_LISTINGS_MODULE_VERSION, 'string');
  assert.ok(AI_LISTINGS_MODULE_VERSION.includes('sprint6'));
});
