import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const { detectVehicleSegment } = await import(
  '../../supabase/functions/_shared/ai-listings/market-intelligence/segment-model.js'
);
const { computeDemandScore } = await import(
  '../../supabase/functions/_shared/ai-listings/market-intelligence/demand-model.js'
);
const { computeLiquidityScore } = await import(
  '../../supabase/functions/_shared/ai-listings/market-intelligence/liquidity-model.js'
);
const {
  getDemandLabel,
  getLiquidityLabel,
  getMarketTrend,
  getSegmentLabel,
  FORBIDDEN_MARKET_PHRASES
} = await import('../../supabase/functions/_shared/ai-listings/market-intelligence/market-model.js');
const {
  buildMarketSummary,
  buildMarketReasons,
  containsForbiddenMarketPhrase,
  findForbiddenMarketPhrases
} = await import('../../supabase/functions/_shared/ai-listings/market-intelligence/market-summary.js');
const {
  runMarketIntelligence,
  computeMarketContextScore,
  buildMarketIntelligenceTags,
  parseMarketIntelligenceFromTags
} = await import(
  '../../supabase/functions/_shared/ai-listings/market-intelligence/market-intelligence.js'
);
const {
  runCanonicalEngine,
  normalizeCanonicalListing,
  buildAnalysisRecord
} = await import('../../supabase/functions/_shared/ai-listings/engine/canonical-engine.js');
const { runQualityEngine } = await import(
  '../../supabase/functions/_shared/ai-listings/engine/quality-engine.js'
);
const { runMarketEngine } = await import(
  '../../supabase/functions/_shared/ai-listings/engine/market-engine.js'
);
const { runRiskEngine } = await import(
  '../../supabase/functions/_shared/ai-listings/engine/risk-engine.js'
);
const { runDecisionEngine } = await import(
  '../../supabase/functions/_shared/ai-listings/engine/decision-engine.js'
);
const { buildMarketIntelligencePreviewHtml } = await import(
  '../../js/ai-listings-engine/market-intelligence/market-summary.js'
);
const {
  buildMarketIntelligenceCardHtml,
  resolveMarketIntelligenceForListing
} = await import('../../js/admin/ai-listings-admin-core.js');
const { buildPreviewHtml } = await import('../../js/ai-listings-builder/preview-builder.js');

const sampleBmw = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  category: 'vehicle',
  title: 'BMW 320i M Sport Düşük KM',
  description: 'Bakımlı servis kayıtlı tek elden.',
  price: 900000,
  currency: 'TRY',
  location: 'İstanbul',
  images: ['https://example.com/1.jpg'],
  brand: 'BMW',
  model: '320i',
  year: 2024,
  km: 45000,
  transmission: 'Otomatik',
  attributes: { year: 2024, km: 45000, brand: 'BMW', model: '320i', transmission: 'Otomatik' }
};

const sampleCorolla = {
  ...sampleBmw,
  id: '660e8400-e29b-41d4-a716-446655440001',
  title: 'Toyota Corolla 1.6',
  brand: 'Toyota',
  model: 'Corolla',
  attributes: { year: 2022, km: 52000, brand: 'Toyota', model: 'Corolla', transmission: 'Otomatik' }
};

const sampleClio = {
  ...sampleBmw,
  id: '770e8400-e29b-41d4-a716-446655440002',
  title: 'Renault Clio 1.0',
  brand: 'Renault',
  model: 'Clio',
  attributes: { year: 2021, km: 70000, brand: 'Renault', model: 'Clio' }
};

const sampleTransporter = {
  ...sampleBmw,
  id: '880e8400-e29b-41d4-a716-446655440003',
  title: 'Volkswagen Transporter Panelvan',
  brand: 'Volkswagen',
  model: 'Transporter',
  attributes: { year: 2018, km: 120000, brand: 'Volkswagen', model: 'Transporter' }
};

test('detectVehicleSegment maps BMW 320i to premium_sedan', () => {
  assert.equal(detectVehicleSegment(sampleBmw), 'premium_sedan');
});

test('detectVehicleSegment maps Mercedes C Serisi to premium_sedan', () => {
  assert.equal(
    detectVehicleSegment({
      category: 'vehicle',
      brand: 'Mercedes',
      model: 'C Serisi',
      title: 'Mercedes C200'
    }),
    'premium_sedan'
  );
});

test('detectVehicleSegment maps Toyota Corolla to compact_sedan', () => {
  assert.equal(detectVehicleSegment(sampleCorolla), 'compact_sedan');
});

test('detectVehicleSegment maps Renault Clio to hatchback', () => {
  assert.equal(detectVehicleSegment(sampleClio), 'hatchback');
});

test('detectVehicleSegment maps Volkswagen Transporter to commercial', () => {
  assert.equal(detectVehicleSegment(sampleTransporter), 'commercial');
});

test('detectVehicleSegment returns unknown for non-vehicle category', () => {
  assert.equal(
    detectVehicleSegment({ category: 'housing', title: 'Daire', brand: '', model: '' }),
    'unknown'
  );
});

test('getSegmentLabel returns Turkish labels', () => {
  assert.equal(getSegmentLabel('premium_sedan'), 'Premium Sedan');
  assert.equal(getSegmentLabel('compact_sedan'), 'Kompakt Sedan');
  assert.equal(getSegmentLabel('unknown'), 'Belirlenemedi');
});

test('computeDemandScore applies segment base and recent-year bonus', () => {
  const demand = computeDemandScore(sampleBmw, { segment: 'premium_sedan' });
  assert.ok(demand.demand_score >= 75);
  assert.equal(demand.demand_label, getDemandLabel(demand.demand_score));
});

test('computeDemandScore reduces score for high risk', () => {
  const baseline = computeDemandScore(sampleCorolla, { segment: 'compact_sedan' }).demand_score;
  const risky = computeDemandScore(sampleCorolla, {
    segment: 'compact_sedan',
    risk: { risk_score: 75, risk_label: 'Yüksek' }
  }).demand_score;
  assert.ok(risky < baseline);
});

test('computeDemandScore reduces score for low quality', () => {
  const baseline = computeDemandScore(sampleCorolla, { segment: 'compact_sedan' }).demand_score;
  const lowQuality = computeDemandScore(sampleCorolla, {
    segment: 'compact_sedan',
    quality: { quality_score: 25 }
  }).demand_score;
  assert.ok(lowQuality < baseline);
});

test('getDemandLabel maps score bands', () => {
  assert.equal(getDemandLabel(30), 'Düşük');
  assert.equal(getDemandLabel(50), 'Orta');
  assert.equal(getDemandLabel(70), 'Orta-Yüksek');
  assert.equal(getDemandLabel(90), 'Yüksek');
});

test('computeLiquidityScore rewards mainstream brands', () => {
  const toyota = computeLiquidityScore(normalizeCanonicalListing(sampleCorolla));
  const generic = computeLiquidityScore(
    normalizeCanonicalListing({
      ...sampleCorolla,
      attributes: { year: 2022, km: 52000, brand: 'UnknownBrand', model: 'X', transmission: 'Otomatik' }
    })
  );
  assert.ok(toyota.liquidity_score > generic.liquidity_score);
});

test('computeLiquidityScore penalizes high km and old year', () => {
  const fresh = computeLiquidityScore(normalizeCanonicalListing(sampleBmw));
  const aged = computeLiquidityScore(
    normalizeCanonicalListing({
      ...sampleBmw,
      year: 2010,
      km: 220000,
      images: [],
      location: ''
    })
  );
  assert.ok(aged.liquidity_score < fresh.liquidity_score);
});

test('getLiquidityLabel maps score bands', () => {
  assert.equal(getLiquidityLabel(30), 'Düşük');
  assert.equal(getLiquidityLabel(50), 'Orta');
  assert.equal(getLiquidityLabel(70), 'İyi');
  assert.equal(getLiquidityLabel(90), 'Çok iyi');
});

test('computeMarketContextScore uses weighted formula with price_score', () => {
  const score = computeMarketContextScore(80, 70, 60);
  assert.equal(score, Math.round(80 * 0.45 + 70 * 0.45 + 60 * 0.1));
});

test('computeMarketContextScore normalizes when price_score missing', () => {
  const score = computeMarketContextScore(80, 60, null);
  assert.equal(score, Math.round(80 * 0.5 + 60 * 0.5));
});

test('getMarketTrend maps context score bands', () => {
  assert.equal(getMarketTrend(85), 'güçlü');
  assert.equal(getMarketTrend(70), 'dengeli');
  assert.equal(getMarketTrend(50), 'zayıf');
  assert.equal(getMarketTrend(30), 'riskli');
});

test('buildMarketSummary uses deterministic disclaimer without forbidden phrases', () => {
  const summary = buildMarketSummary({
    segment: 'premium_sedan',
    demand_label: 'Orta-Yüksek',
    liquidity_label: 'İyi'
  });
  assert.match(summary, /Premium Sedan segmentinde değerlendirildi/i);
  assert.match(summary, /deterministik piyasa bağlamıdır/i);
  assert.equal(containsForbiddenMarketPhrase(summary), false);
});

test('forbidden real-market claims are detected', () => {
  for (const phrase of FORBIDDEN_MARKET_PHRASES) {
    assert.equal(containsForbiddenMarketPhrase(`Analiz ${phrase} ile yapıldı.`), true);
  }
  assert.deepEqual(findForbiddenMarketPhrases('gerçek piyasa ve satış garantisi'), [
    'gerçek piyasa',
    'satış garantisi'
  ]);
});

test('runMarketIntelligence returns full output shape', () => {
  const canonical = normalizeCanonicalListing(sampleBmw);
  const quality = runQualityEngine(canonical);
  const market = runMarketEngine(canonical);
  const risk = runRiskEngine(canonical, quality);
  const result = runMarketIntelligence(canonical, { quality, market, risk });

  assert.equal(result.segment, 'premium_sedan');
  assert.ok(result.demand_score >= 0 && result.demand_score <= 100);
  assert.ok(result.liquidity_score >= 0 && result.liquidity_score <= 100);
  assert.ok(result.market_context_score >= 0 && result.market_context_score <= 100);
  assert.ok(['güçlü', 'dengeli', 'zayıf', 'riskli'].includes(result.market_trend));
  assert.ok(Array.isArray(result.market_reasons) && result.market_reasons.length > 0);
  assert.equal(containsForbiddenMarketPhrase(result.market_summary), false);
});

test('runCanonicalEngine includes context.market_intelligence', () => {
  const result = runCanonicalEngine({ listing: sampleBmw });
  assert.equal(result.ok, true);
  assert.ok(result.context.market_intelligence);
  assert.equal(result.context.market_intelligence.segment, 'premium_sedan');
});

test('buildAnalysisRecord encodes market intelligence tags', () => {
  const canonical = normalizeCanonicalListing(sampleBmw);
  const quality = runQualityEngine(canonical);
  const market = runMarketEngine(canonical);
  const risk = runRiskEngine(canonical, quality);
  const market_intelligence = runMarketIntelligence(canonical, { quality, market, risk });
  const decision = runDecisionEngine(canonical, quality, market, risk);
  const record = buildAnalysisRecord(canonical, {
    quality,
    market,
    risk,
    decision,
    market_intelligence
  });

  assert.ok(record.tags.some((tag) => tag.startsWith('market_segment:')));
  assert.ok(record.tags.some((tag) => tag.startsWith('demand_score:')));
  assert.ok(record.tags.some((tag) => tag.startsWith('liquidity_score:')));
  assert.ok(record.tags.some((tag) => tag.startsWith('market_context_score:')));
  assert.ok(record.tags.some((tag) => tag.startsWith('market_trend:')));
  assert.deepEqual(buildMarketIntelligenceTags(market_intelligence), [
    `market_segment:${market_intelligence.segment}`,
    `demand_score:${market_intelligence.demand_score}`,
    `liquidity_score:${market_intelligence.liquidity_score}`,
    `market_context_score:${market_intelligence.market_context_score}`,
    `market_trend:${market_intelligence.market_trend}`
  ]);
});

test('parseMarketIntelligenceFromTags reads encoded tags', () => {
  const tags = buildMarketIntelligenceTags({
    segment: 'suv',
    demand_score: 83,
    liquidity_score: 78,
    market_context_score: 80,
    market_trend: 'dengeli'
  });
  const parsed = parseMarketIntelligenceFromTags(tags);
  assert.equal(parsed.segment, 'suv');
  assert.equal(parsed.demand_score, 83);
  assert.equal(parsed.liquidity_score, 78);
  assert.equal(parsed.market_context_score, 80);
  assert.equal(parsed.market_trend, 'dengeli');
});

test('buildMarketIntelligenceCardHtml renders admin card fields', () => {
  const html = buildMarketIntelligenceCardHtml(sampleBmw, {
    tags: [
      'market_segment:premium_sedan',
      'demand_score:83',
      'liquidity_score:78',
      'market_context_score:80',
      'market_trend:dengeli'
    ]
  });
  assert.match(html, /Piyasa Zekâsı/);
  assert.match(html, /Premium Sedan/);
  assert.match(html, /Talep/);
  assert.match(html, /Likidite/);
  assert.match(html, /Eğilim/);
  assert.doesNotMatch(html, /Piyasa Bağlam Skoru/);
});

test('resolveMarketIntelligenceForListing falls back when tags missing', () => {
  const resolved = resolveMarketIntelligenceForListing(sampleCorolla, null);
  assert.equal(resolved.segment, 'compact_sedan');
  assert.ok(resolved.demand_score >= 0);
});

test('buildMarketIntelligencePreviewHtml renders builder block with disclaimer', () => {
  const html = buildMarketIntelligencePreviewHtml(
    runMarketIntelligence(normalizeCanonicalListing(sampleBmw))
  );
  assert.match(html, /Piyasa Zekâsı/);
  assert.match(html, /Segment/);
  assert.match(html, /deterministik piyasa bağlamıdır/i);
});

test('buildPreviewHtml includes market intelligence preview block', () => {
  const html = buildPreviewHtml({
    input_type: 'text',
    confidence: 88,
    category: 'vehicle',
    title: 'BMW 320i',
    description: 'Temiz araç',
    price: 900000,
    currency: 'TRY',
    location: 'İstanbul',
    attributes: { brand: 'BMW', model: '320i', year: 2024, km: 40000, transmission: 'Otomatik' },
    missing_fields: [],
    extraction_warnings: []
  });
  assert.match(html, /data-market-intelligence-preview/);
  assert.match(html, /Premium Sedan|Belirlenemedi/);
});

test('missing fields fallback keeps scores within bounds', () => {
  const sparse = runMarketIntelligence(
    normalizeCanonicalListing({
      id: 'sparse',
      category: 'vehicle',
      title: '',
      brand: '',
      model: '',
      images: [],
      location: ''
    })
  );
  assert.equal(sparse.segment, 'unknown');
  assert.ok(sparse.demand_score >= 0 && sparse.demand_score <= 100);
  assert.ok(sparse.liquidity_score >= 0 && sparse.liquidity_score <= 100);
});

test('no database schema files changed for market intelligence', () => {
  const schemaPath = path.join(process.cwd(), 'docs/ai-listings/DATABASE_SCHEMA.md');
  const sqlPaths = [
    path.join(process.cwd(), 'supabase/migrations'),
    path.join(process.cwd(), 'supabase/schema.sql')
  ];
  assert.ok(fs.existsSync(schemaPath));
  const schema = fs.readFileSync(schemaPath, 'utf8');
  assert.doesNotMatch(schema, /market_intelligence/i);
  for (const candidate of sqlPaths) {
    if (!fs.existsSync(candidate)) continue;
    const stat = fs.statSync(candidate);
    if (stat.isFile()) {
      assert.doesNotMatch(fs.readFileSync(candidate, 'utf8'), /market_intelligence/i);
    }
  }
});

test('buildMarketReasons includes segment and trend context', () => {
  const reasons = buildMarketReasons({
    segment: 'hatchback',
    demand_score: 78,
    liquidity_score: 65,
    market_context_score: 72,
    market_trend: 'dengeli'
  });
  assert.ok(reasons.some((reason) => reason.includes('Hatchback')));
  assert.ok(reasons.some((reason) => reason.includes('dengeli')));
});
