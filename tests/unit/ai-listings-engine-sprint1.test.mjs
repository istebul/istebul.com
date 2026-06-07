import test from 'node:test';
import assert from 'node:assert/strict';

const {
  ENGINE_VERSION,
  runAiListingsEngine,
  processListing,
  getListingEngineMetrics,
  parseListingInput,
  runQualityEngine,
  runMarketEngine,
  runRiskEngine,
  runDecisionEngine,
  getRiskLevel,
  getRecommendationLabel,
  createCanonicalListing
} = await import('../../js/ai-listings-engine/index.js');

const { buildListingCardHtml } = await import('../../js/admin/ai-listings-admin-core.js');

const sampleVehicle = {
  id: 'veh-1',
  category: 'vehicle',
  title: 'BMW 320i M Sport Düşük KM',
  description: 'Bakımlı, servis kayıtlı, tek elden kullanılmış araç ilanı.',
  price: 900000,
  currency: 'TRY',
  location: 'İstanbul',
  images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
  source_url: 'https://example.com/listing/1',
  attributes: {
    year: 2019,
    km: 45000,
    fuel_type: 'benzin',
    transmission: 'otomatik',
    brand: 'BMW',
    model: '320i'
  },
  created_at: '2026-06-07T08:00:00.000Z',
  updated_at: '2026-06-07T08:00:00.000Z'
};

test('ENGINE_VERSION is sprint-1', () => {
  assert.equal(ENGINE_VERSION, 'sprint-1-enterprise');
});

test('parseListingInput builds canonical listing with vehicle attributes', () => {
  const listing = parseListingInput(sampleVehicle, 'manual');
  assert.equal(listing.brand, 'BMW');
  assert.equal(listing.model, '320i');
  assert.equal(listing.year, 2019);
  assert.equal(listing.km, 45000);
  assert.equal(listing.fuel, 'benzin');
});

test('runQualityEngine scores fields and reports missing', () => {
  const listing = createCanonicalListing({ title: 'X', price: 0, images: [] });
  const quality = runQualityEngine(listing);
  assert.ok(quality.quality_score >= 0 && quality.quality_score <= 100);
  assert.ok(quality.missing_fields.includes('Fiyat'));
  assert.ok(quality.missing_fields.includes('Fotoğraf'));
  assert.match(quality.quality_summary, /kalite/i);
});

test('runMarketEngine produces deviation summary text', () => {
  const listing = parseListingInput(sampleVehicle);
  const market = runMarketEngine(listing);
  assert.ok(market.market_score >= 0 && market.market_score <= 100);
  assert.ok(market.market_average > 0);
  assert.match(market.market_summary, /Piyasa ortalamasının yaklaşık %/);
});

test('getRiskLevel maps score bands', () => {
  assert.equal(getRiskLevel(20).label, 'Düşük');
  assert.equal(getRiskLevel(45).label, 'Orta');
  assert.equal(getRiskLevel(75).label, 'Yüksek');
});

test('runRiskEngine flags missing media and description', () => {
  const listing = createCanonicalListing({ title: 'Test', price: 100, description: '' });
  const risk = runRiskEngine(listing);
  assert.ok(risk.risk_score > 0);
  assert.ok(risk.risk_factors.includes('Eksik fotoğraf'));
  assert.ok(risk.risk_factors.includes('Eksik açıklama'));
});

test('runDecisionEngine returns recommendation and summary', () => {
  const listing = parseListingInput(sampleVehicle);
  const quality = runQualityEngine(listing);
  const market = runMarketEngine(listing);
  const risk = runRiskEngine(listing, quality);
  const decision = runDecisionEngine(listing, quality, market, risk);
  assert.ok(decision.decision_score >= 0 && decision.decision_score <= 100);
  assert.ok(decision.strengths.length >= 0);
  assert.ok(decision.recommendation_label.length > 0);
  assert.equal(getRecommendationLabel('review'), 'İncelenebilir');
});

test('runAiListingsEngine runs full pipeline and enriches listing', () => {
  const result = runAiListingsEngine(sampleVehicle, { sourceType: 'manual' });
  assert.equal(result.engine_version, ENGINE_VERSION);
  assert.ok(result.listing.quality_score !== null);
  assert.ok(result.listing.market_score !== null);
  assert.ok(result.listing.risk_score !== null);
  assert.ok(result.listing.decision_score !== null);
  assert.ok(result.listing.decision_summary.length > 0);
});

test('processListing returns enriched canonical listing', () => {
  const listing = processListing(sampleVehicle);
  assert.equal(listing.title, sampleVehicle.title);
  assert.ok(Number.isFinite(listing.quality_score));
});

test('getListingEngineMetrics exposes card metrics', () => {
  const metrics = getListingEngineMetrics(sampleVehicle, {
    existingAnalysis: { ai_score: 78, risk_score: 32, market_score: 70 }
  });
  assert.equal(metrics.ai, 78);
  assert.equal(metrics.risk, 32);
  assert.equal(metrics.market, 70);
  assert.ok(metrics.quality >= 0);
  assert.ok(metrics.decision.length > 0);
});

test('partner parser scaffold accepts sahibinden source', () => {
  const listing = parseListingInput(
    { title: 'Partner ilan', price: 100000, external: { category: 'vehicle' } },
    'sahibinden'
  );
  assert.equal(listing.source_type, 'sahibinden');
});

test('buildListingCardHtml shows Kalite and Karar metrics from engine', () => {
  const html = buildListingCardHtml({
    id: 'abc',
    title: 'BMW 320i',
    category: 'vehicle',
    status: 'pending_review',
    price: 900000,
    description: 'Detaylı açıklama ile bakımlı araç.',
    location: 'İstanbul',
    images: ['a.jpg'],
    updated_at: '2026-06-06T12:00:00.000Z',
    latest_analysis: { ai_score: 91, risk_score: 18, market_score: 82 }
  });
  assert.match(html, /AI 91/);
  assert.match(html, /Risk 18/);
  assert.match(html, /Piyasa/);
  assert.match(html, /Kalite/);
  assert.match(html, /İncelenebilir|Satın Alınabilir|Riskli|Önerilmez/);
});
