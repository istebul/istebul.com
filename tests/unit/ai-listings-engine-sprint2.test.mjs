import test from 'node:test';
import assert from 'node:assert/strict';

const {
  runCanonicalEngine,
  normalizeCanonicalListing,
  buildAnalysisRecord,
  parsePersistedAnalysisFields,
  parseTagNumber,
  ANALYSIS_ENGINE_VERSION
} = await import('../../supabase/functions/_shared/ai-listings/engine/canonical-engine.js');

const { runQualityEngine } = await import('../../supabase/functions/_shared/ai-listings/engine/quality-engine.js');
const { runMarketEngine } = await import('../../supabase/functions/_shared/ai-listings/engine/market-engine.js');
const { runRiskEngine, getRiskLevel } = await import('../../supabase/functions/_shared/ai-listings/engine/risk-engine.js');
const {
  runDecisionEngine,
  getRecommendationFromScore
} = await import('../../supabase/functions/_shared/ai-listings/engine/decision-engine.js');

const { runListingAnalysisPipeline } = await import('../../supabase/functions/_shared/ai-listings/analysis-pipeline.js');
const { getListingEngineMetrics } = await import('../../js/ai-listings-engine/index.js');
const { buildListingCardHtml } = await import('../../js/admin/ai-listings-admin-core.js');

const sampleListing = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  category: 'vehicle',
  title: 'BMW 320i M Sport Düşük KM',
  description: 'Bakımlı, servis kayıtlı, tek elden kullanılmış araç ilanı detaylı açıklama.',
  price: 900000,
  currency: 'TRY',
  location: 'İstanbul',
  images: ['https://example.com/1.jpg'],
  source_url: 'https://example.com/listing/1',
  attributes: { year: 2019, km: 45000, fuel_type: 'benzin', brand: 'BMW', model: '320i' },
  source_type: 'manual',
  created_at: '2026-06-07T08:00:00.000Z',
  updated_at: '2026-06-07T08:00:00.000Z'
};

test('ANALYSIS_ENGINE_VERSION is engine-v1', () => {
  assert.equal(ANALYSIS_ENGINE_VERSION, 'engine-v1');
});

test('normalizeCanonicalListing extracts vehicle attributes', () => {
  const canonical = normalizeCanonicalListing(sampleListing);
  assert.equal(canonical.brand, 'BMW');
  assert.equal(canonical.model, '320i');
  assert.equal(canonical.year, 2019);
  assert.equal(canonical.km, 45000);
});

test('runQualityEngine returns quality_score and Turkish summary', () => {
  const quality = runQualityEngine(sampleListing);
  assert.ok(quality.quality_score >= 0 && quality.quality_score <= 100);
  assert.match(quality.quality_summary, /yeterli|eksik/i);
});

test('runMarketEngine returns deviation market summary', () => {
  const market = runMarketEngine(sampleListing);
  assert.ok(market.market_score >= 0 && market.market_score <= 100);
  assert.match(market.market_summary, /Piyasa ortalamasının yaklaşık %|uyumlu/i);
});

test('getRiskLevel maps 0-30 Düşük, 31-60 Orta, 61-100 Yüksek', () => {
  assert.equal(getRiskLevel(20).label, 'Düşük');
  assert.equal(getRiskLevel(45).label, 'Orta');
  assert.equal(getRiskLevel(75).label, 'Yüksek');
});

test('runRiskEngine flags missing photos for sparse listing', () => {
  const risk = runRiskEngine({ title: 'X', price: 100, description: '', images: [] });
  assert.ok(risk.risk_score > 0);
  assert.ok(risk.risk_factors.includes('Eksik fotoğraf'));
});

test('getRecommendationFromScore uses Sprint-2 bands', () => {
  assert.equal(getRecommendationFromScore(92).label, 'Satın Alınabilir');
  assert.equal(getRecommendationFromScore(75).label, 'İncelenebilir');
  assert.equal(getRecommendationFromScore(55).label, 'Dikkatli İncelenmeli');
  assert.equal(getRecommendationFromScore(35).label, 'Riskli');
  assert.equal(getRecommendationFromScore(20).label, 'Önerilmez');
});

test('runDecisionEngine produces multi-sentence decision_summary', () => {
  const canonical = normalizeCanonicalListing(sampleListing);
  const quality = runQualityEngine(canonical);
  const market = runMarketEngine(canonical);
  const risk = runRiskEngine(canonical, quality);
  const decision = runDecisionEngine(canonical, quality, market, risk);
  assert.ok(decision.decision_score >= 0 && decision.decision_score <= 100);
  assert.ok(decision.decision_summary.split('.').length >= 2);
  assert.ok(decision.strengths.length >= 0);
  assert.ok(decision.recommendation_label.length > 0);
});

test('runCanonicalEngine returns ok analysis with required persisted fields', () => {
  const result = runCanonicalEngine({ listing: sampleListing });
  assert.equal(result.ok, true);
  const analysis = result.analysis;
  assert.ok(Number.isFinite(analysis.quality_score));
  assert.ok(Number.isFinite(analysis.market_score));
  assert.ok(Number.isFinite(analysis.price_score));
  assert.ok(Number.isFinite(analysis.risk_score));
  assert.ok(Number.isFinite(analysis.confidence));
  assert.ok(Number.isFinite(analysis.decision_score));
  assert.ok(analysis.summary.length > 0);
  assert.ok(Array.isArray(analysis.pros));
  assert.ok(Array.isArray(analysis.cons));
  assert.ok(analysis.tags.includes('engine-v1'));
  assert.ok(analysis.tags.some((tag) => tag.startsWith('quality_score:')));
});

test('buildAnalysisRecord encodes quality and decision in tags', () => {
  const canonical = normalizeCanonicalListing(sampleListing);
  const engines = {
    quality: runQualityEngine(canonical),
    market: runMarketEngine(canonical),
    risk: runRiskEngine(canonical, runQualityEngine(canonical)),
    decision: runDecisionEngine(
      canonical,
      runQualityEngine(canonical),
      runMarketEngine(canonical),
      runRiskEngine(canonical, runQualityEngine(canonical))
    )
  };
  const record = buildAnalysisRecord(canonical, engines);
  assert.equal(parseTagNumber(record.tags, 'quality_score'), engines.quality.quality_score);
  assert.equal(parseTagNumber(record.tags, 'decision_score'), engines.decision.decision_score);
});

test('parsePersistedAnalysisFields reads engine-v1 tags from analysis', () => {
  const parsed = parsePersistedAnalysisFields({
    ai_score: 78,
    risk_score: 32,
    market_score: 70,
    tags: ['engine-v1', 'quality_score:85', 'decision_score:78', 'recommendation:İncelenebilir'],
    analysis_version: 'engine-v1'
  });
  assert.equal(parsed.quality_score, 85);
  assert.equal(parsed.decision_score, 78);
  assert.equal(parsed.recommendation_label, 'İncelenebilir');
  assert.equal(parsed.isEngineV1, true);
});

test('parsePersistedAnalysisFields falls back to ai_score for legacy records', () => {
  const parsed = parsePersistedAnalysisFields({
    ai_score: 80,
    risk_score: 20,
    tags: ['rules-engine'],
    analysis_version: 'v1-edge'
  });
  assert.equal(parsed.decision_score, 80);
  assert.equal(parsed.quality_score, null);
  assert.equal(parsed.isEngineV1, false);
});

test('runListingAnalysisPipeline delegates to canonical engine', async () => {
  const result = await runListingAnalysisPipeline({ listing: sampleListing });
  assert.equal(result.ok, true);
  assert.equal(result.context.engine_version, 'engine-v1');
});

test('getListingEngineMetrics prefers DB analysis over client engine', () => {
  const metrics = getListingEngineMetrics(sampleListing, {
    existingAnalysis: {
      ai_score: 82,
      risk_score: 28,
      market_score: 74,
      tags: ['engine-v1', 'quality_score:91', 'decision_score:82', 'recommendation:İncelenebilir'],
      analysis_version: 'engine-v1'
    }
  });
  assert.equal(metrics.from_db, true);
  assert.equal(metrics.ai, 82);
  assert.equal(metrics.risk, 28);
  assert.equal(metrics.market, 74);
  assert.equal(metrics.quality, 91);
  assert.equal(metrics.decision, 'İncelenebilir');
});

test('getListingEngineMetrics uses client engine when no DB analysis', () => {
  const metrics = getListingEngineMetrics(sampleListing, { existingAnalysis: null });
  assert.equal(metrics.from_db, false);
  assert.ok(metrics.quality >= 0);
  assert.ok(metrics.decision.length > 0);
});

test('getListingEngineMetrics uses client fallback for legacy DB missing quality', () => {
  const metrics = getListingEngineMetrics(sampleListing, {
    existingAnalysis: {
      ai_score: 70,
      risk_score: 40,
      market_score: 60,
      tags: [],
      analysis_version: 'v1-edge'
    }
  });
  assert.equal(metrics.from_db, true);
  assert.equal(metrics.ai, 70);
  assert.ok(metrics.quality >= 0);
});

test('buildListingCardHtml prefers DB metrics including Kalite and Karar', () => {
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
    latest_analysis: {
      ai_score: 82,
      risk_score: 28,
      market_score: 74,
      tags: ['engine-v1', 'quality_score:88', 'decision_score:82', 'recommendation:İncelenebilir'],
      analysis_version: 'engine-v1'
    }
  });
  assert.match(html, /AI 82/);
  assert.match(html, /Kalite 88/);
  assert.match(html, /İncelenebilir/);
});
