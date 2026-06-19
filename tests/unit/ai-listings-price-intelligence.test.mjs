import test from 'node:test';
import assert from 'node:assert/strict';

const { estimateBaselineValue } = await import(
  '../../supabase/functions/_shared/ai-listings/price/price-model.js'
);
const { computePriceConfidence, hasSufficientPriceData } = await import(
  '../../supabase/functions/_shared/ai-listings/price/price-confidence.js'
);
const { buildPriceSummary, getPricePositionLabelTr, PRICE_POSITION_LABELS_TR } = await import(
  '../../supabase/functions/_shared/ai-listings/price/price-summary.js'
);
const {
  runPriceIntelligence,
  mapPricePosition,
  buildPriceIntelligenceTags,
  parsePriceIntelligenceFromTags,
  PRICE_POSITION_THRESHOLDS
} = await import('../../supabase/functions/_shared/ai-listings/price/price-intelligence.js');
const {
  runCanonicalEngine,
  buildAnalysisRecord,
  parseTagNumber
} = await import('../../supabase/functions/_shared/ai-listings/engine/canonical-engine.js');
const { runQualityEngine } = await import('../../supabase/functions/_shared/ai-listings/engine/quality-engine.js');
const { runMarketEngine } = await import('../../supabase/functions/_shared/ai-listings/engine/market-engine.js');
const { runRiskEngine } = await import('../../supabase/functions/_shared/ai-listings/engine/risk-engine.js');
const { runDecisionEngine } = await import('../../supabase/functions/_shared/ai-listings/engine/decision-engine.js');
const {
  buildPriceIntelligenceCardHtml,
  resolvePriceIntelligenceForDisplay,
  buildPremiumDashboardHtml
} = await import('../../js/admin/ai-listings-admin-core.js');
const { buildPricePreviewBlockHtml } = await import('../../js/ai-listings-engine/price/price-summary.js');
const { buildPreviewHtml } = await import('../../js/ai-listings-builder/preview-builder.js');

const vehicleListing = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  category: 'vehicle',
  title: '2022 BMW 320i M Sport',
  description: 'Bakımlı, servis kayıtlı, premium paket.',
  price: 1780000,
  currency: 'TRY',
  location: 'İstanbul',
  brand: 'BMW',
  model: '320i',
  year: 2022,
  km: 58000,
  fuel: 'Benzin',
  transmission: 'Otomatik',
  attributes: { year: 2022, km: 58000, brand: 'BMW', model: '320i', fuel_type: 'benzin' },
  tags: ['premium']
};

const sparseListing = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  category: 'vehicle',
  title: 'Araç',
  price: 0,
  attributes: {}
};

test('estimateBaselineValue returns positive vehicle estimate', () => {
  const result = estimateBaselineValue(vehicleListing);
  assert.ok(result.estimated > 0);
  assert.ok(Array.isArray(result.reasons));
  assert.ok(result.reasons.length > 0);
});

test('newer year increases estimated value vs older year', () => {
  const newer = estimateBaselineValue({ ...vehicleListing, year: 2024, attributes: { year: 2024 } });
  const older = estimateBaselineValue({ ...vehicleListing, year: 2012, attributes: { year: 2012 } });
  assert.ok(newer.estimated > older.estimated);
});

test('high km decreases estimated value vs low km', () => {
  const lowKm = estimateBaselineValue({ ...vehicleListing, km: 25000, attributes: { year: 2022, km: 25000 } });
  const highKm = estimateBaselineValue({ ...vehicleListing, km: 180000, attributes: { year: 2022, km: 180000 } });
  assert.ok(lowKm.estimated > highKm.estimated);
});

test('automatic transmission adds small premium in reasons', () => {
  const auto = estimateBaselineValue({ ...vehicleListing, transmission: 'Otomatik' });
  assert.ok(auto.reasons.some((r) => /otomatik/i.test(r)));
});

test('computePriceConfidence increases with more vehicle fields', () => {
  const sparse = computePriceConfidence({ category: 'vehicle', price: 1000000 }, 900000);
  const rich = computePriceConfidence(vehicleListing, 1500000);
  assert.ok(rich > sparse);
});

test('hasSufficientPriceData returns false for low confidence', () => {
  assert.equal(hasSufficientPriceData(0.2), false);
  assert.equal(hasSufficientPriceData(0.5), true);
});

test('mapPricePosition maps deviation thresholds', () => {
  assert.equal(mapPricePosition(-10, true), 'underpriced');
  assert.equal(mapPricePosition(0, true), 'fair');
  assert.equal(mapPricePosition(10, true), 'slightly_overpriced');
  assert.equal(mapPricePosition(25, true), 'overpriced');
  assert.equal(mapPricePosition(5, false), 'unknown');
});

test('PRICE_POSITION_THRESHOLDS define expected bands', () => {
  assert.equal(PRICE_POSITION_THRESHOLDS.underpriced.max, -8);
  assert.equal(PRICE_POSITION_THRESHOLDS.fair.max, 8);
  assert.equal(PRICE_POSITION_THRESHOLDS.slightly_overpriced.max, 18);
  assert.equal(PRICE_POSITION_THRESHOLDS.overpriced.min, 18);
});

test('runPriceIntelligence computes deviation amount and pct', () => {
  const pi = runPriceIntelligence(vehicleListing);
  assert.ok(pi.estimated_market_value > 0);
  assert.equal(pi.listing_price, 1780000);
  assert.ok(Number.isFinite(pi.deviation_amount));
  assert.ok(Number.isFinite(pi.deviation_pct));
  assert.ok(pi.price_confidence > 0);
});

test('runPriceIntelligence returns unknown position for sparse listing', () => {
  const pi = runPriceIntelligence(sparseListing);
  assert.equal(pi.price_position, 'unknown');
  assert.equal(pi.deviation_pct, 0);
});

test('buildPriceSummary uses deterministic wording in Turkish', () => {
  const pi = runPriceIntelligence(vehicleListing);
  assert.match(pi.price_summary, /Mevcut girilen alanlara göre tahmini değer/i);
  assert.match(pi.price_summary, /deterministik ön değerlendirmedir/i);
  assert.doesNotMatch(pi.price_summary, /Gerçek piyasa değeri/i);
});

test('buildPriceSummary handles unknown position fallback', () => {
  const summary = buildPriceSummary({
    estimated_market_value: 0,
    listing_price: 0,
    deviation_pct: 0,
    price_position: 'unknown',
    price_confidence: 0.2
  });
  assert.match(summary, /hesaplanamadı/i);
  assert.match(summary, /deterministik ön değerlendirmedir/i);
});

test('getPricePositionLabelTr maps Turkish labels', () => {
  assert.equal(getPricePositionLabelTr('underpriced'), PRICE_POSITION_LABELS_TR.underpriced);
  assert.equal(getPricePositionLabelTr('fair'), 'Makul aralık');
  assert.equal(getPricePositionLabelTr('unknown'), 'Yetersiz veri');
});

test('buildPriceIntelligenceTags encodes analysis tags', () => {
  const pi = runPriceIntelligence(vehicleListing);
  const tags = buildPriceIntelligenceTags(pi);
  assert.ok(tags.some((t) => t.startsWith('price_position:')));
  assert.ok(tags.some((t) => t.startsWith('estimated_market_value:')));
  assert.ok(tags.some((t) => t.startsWith('deviation_pct:')));
  assert.ok(tags.some((t) => t.startsWith('price_confidence:')));
});

test('parsePriceIntelligenceFromTags decodes stored tags', () => {
  const parsed = parsePriceIntelligenceFromTags([
    'price_position:fair',
    'estimated_market_value:1720000',
    'deviation_pct:3.5',
    'price_confidence:0.72'
  ]);
  assert.equal(parsed?.price_position, 'fair');
  assert.equal(parsed?.estimated_market_value, 1720000);
  assert.equal(parsed?.deviation_pct, 3.5);
  assert.equal(parsed?.price_confidence, 0.72);
});

test('runCanonicalEngine includes price_intelligence in context', () => {
  const result = runCanonicalEngine({ listing: vehicleListing });
  assert.equal(result.ok, true);
  assert.ok(result.context.price_intelligence);
  assert.ok(result.context.price_intelligence.estimated_market_value > 0);
  assert.match(result.context.price_intelligence.price_summary, /deterministik/i);
});

test('buildAnalysisRecord adds price intelligence tags', () => {
  const quality = runQualityEngine(vehicleListing);
  const market = runMarketEngine(vehicleListing);
  const risk = runRiskEngine(vehicleListing, quality);
  const decision = runDecisionEngine(vehicleListing, quality, market, risk);
  const price_intelligence = runPriceIntelligence(vehicleListing);
  const record = buildAnalysisRecord(vehicleListing, { quality, market, risk, decision, price_intelligence });
  assert.ok(record.tags.some((t) => t.startsWith('price_position:')));
  assert.ok(record.tags.some((t) => t.startsWith('estimated_market_value:')));
  assert.equal(parseTagNumber(record.tags, 'price_confidence'), price_intelligence.price_confidence);
});

test('price intelligence summary never claims real market data', () => {
  const pi = runPriceIntelligence(vehicleListing);
  const forbidden = ['Gerçek piyasa değeri', 'canlı piyasa verisi kullanıldı'];
  for (const phrase of forbidden) {
    assert.ok(!pi.price_summary.includes(phrase));
  }
  assert.match(pi.price_summary, /canlı piyasa verisi değil/i);
});

test('buildPriceIntelligenceCardHtml renders admin card fields', () => {
  const html = buildPriceIntelligenceCardHtml(vehicleListing, null);
  assert.match(html, /Fiyat Zekâsı/);
  assert.match(html, /Tahmini değer/);
  assert.match(html, /İlan fiyatı/);
  assert.match(html, /Sapma TL/);
  assert.match(html, /Sapma %/);
  assert.match(html, /Pozisyon/);
  assert.match(html, /Güven/);
  assert.match(html, /deterministik/i);
});

test('buildPriceIntelligenceCardHtml shows Turkish position label', () => {
  const pi = runPriceIntelligence(vehicleListing);
  const html = buildPriceIntelligenceCardHtml(vehicleListing, null, pi);
  const label = getPricePositionLabelTr(pi.price_position);
  assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('resolvePriceIntelligenceForDisplay prefers persisted tags', () => {
  const resolved = resolvePriceIntelligenceForDisplay(vehicleListing, {
    tags: ['price_position:fair', 'estimated_market_value:1720000', 'deviation_pct:3.5', 'price_confidence:0.72']
  });
  assert.equal(resolved.price_position, 'fair');
  assert.equal(resolved.estimated_market_value, 1720000);
});

test('buildPremiumDashboardHtml includes price intelligence card', () => {
  const html = buildPremiumDashboardHtml(vehicleListing, { price_score: 75, ai_score: 80 }, [], 'draft');
  assert.match(html, /Fiyat Zekâsı/);
  assert.match(html, /ai-listings-admin__price-intelligence-card/);
});

test('buildPricePreviewBlockHtml renders builder preview block', () => {
  const pi = runPriceIntelligence(vehicleListing);
  const html = buildPricePreviewBlockHtml(pi);
  assert.match(html, /Fiyat Zekâsı/);
  assert.match(html, /Tahmini değer/);
  assert.match(html, /Sapma/);
  assert.match(html, /Güven/);
  assert.match(html, /deterministik ön tahmindir/i);
});

test('buildPreviewHtml includes price intelligence section', () => {
  const html = buildPreviewHtml({
    input_type: 'text',
    category: 'vehicle',
    title: vehicleListing.title,
    price: vehicleListing.price,
    currency: 'TRY',
    attributes: vehicleListing.attributes,
    confidence: 85
  });
  assert.match(html, /data-price-intelligence/);
  assert.match(html, /deterministik ön tahmindir/i);
});

test('missing brand model year lowers confidence vs complete listing', () => {
  const missing = runPriceIntelligence({
    category: 'vehicle',
    price: 900000,
    attributes: {}
  });
  const complete = runPriceIntelligence(vehicleListing);
  assert.ok(complete.price_confidence > missing.price_confidence);
});

test('premium tags increase estimate via attributes or title', () => {
  const base = estimateBaselineValue({
    category: 'vehicle',
    year: 2020,
    km: 60000,
    attributes: { year: 2020, km: 60000 }
  });
  const premium = estimateBaselineValue({
    category: 'vehicle',
    year: 2020,
    km: 60000,
    title: 'Premium paket M Sport',
    attributes: { year: 2020, km: 60000 }
  });
  assert.ok(premium.estimated >= base.estimated);
});

test('deviation_pct positive when listing price above estimate', () => {
  const overpriced = runPriceIntelligence({ ...vehicleListing, price: 2500000 });
  assert.ok(overpriced.deviation_pct > 0);
  assert.ok(['slightly_overpriced', 'overpriced', 'fair'].includes(overpriced.price_position));
});

test('deviation_pct negative when listing price below estimate', () => {
  const under = runPriceIntelligence({ ...vehicleListing, price: 900000 });
  assert.ok(under.deviation_pct < 0);
});
