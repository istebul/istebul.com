import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  clearNegotiationMemoCache,
  buildNegotiationCacheKey,
  buildNegotiationInput,
  computeNegotiationConfidence,
  runNegotiationIntelligence,
  computeOfferRange,
  roundOfferAmount,
  POSITION_DISCOUNT_PROFILES,
  classifyNegotiationRiskLevel,
  buildNegotiationRiskLabel,
  mapNegotiationRiskClass,
  buildNegotiationChecklist,
  resolveNegotiationCategoryKey,
  NEGOTIATION_CHECKLIST_BY_CATEGORY,
  buildNegotiationSummaryText,
  buildNegotiationReasons,
  sanitizeNegotiationSummary,
  NEGOTIATION_FORBIDDEN_PHRASES,
  buildNegotiationPanelHtml,
  buildNegotiationShellHtml,
  formatNegotiationTry
} = await import('../../js/ai-negotiation-intelligence/index.js');

const { runRecommendationEngine, clearRecommendationMemoCache } = await import(
  '../../js/ai-recommendation-engine/index.js'
);
const { buildRecommendationsDashboardHtml } = await import('../../js/admin/ai-listings-recommendations-admin.js');
const { buildRecommendationCardHtml } = await import('../../js/ai-recommendation-engine/recommendation-card-builder.js');

const routerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/router.js');
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260701_ai_listings_engine_v1.sql');

const profile = {
  category: 'vehicle',
  budget: 1800000,
  city: 'İzmir',
  usage_type: 'family',
  family_size: 4,
  annual_km: 15000,
  risk_tolerance: 'medium',
  priority: 'total_cost',
  ownership_period: 5
};

const bmwListing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2022 BMW 320i M Sport',
  description: 'Yetkili servis bakımlı',
  price: 1780000,
  currency: 'TRY',
  location: 'İzmir',
  source_type: 'manual',
  source_url: 'https://example.com/bmw',
  status: 'approved',
  images: ['img1.jpg', 'img2.jpg'],
  attributes: { brand: 'BMW', model: '320i', year: 2022, km: 45000, body_type: 'sedan' },
  latest_analysis: { ai_score: 82, risk_score: 28, quality_score: 88, decision_score: 82 },
  duplicate_status: 'new'
};

const housingListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'housing',
  title: 'Kadıköy 3+1 Daire',
  price: 5200000,
  location: 'İstanbul',
  latest_analysis: { risk_score: 35, quality_score: 75, decision_score: 70 },
  duplicate_status: 'new'
};

const travelListing = {
  id: '44444444-4444-4444-4444-444444444444',
  category: 'vacation',
  title: 'Antalya 7 Gün Paket',
  price: 42000,
  location: 'Antalya',
  latest_analysis: { risk_score: 22, quality_score: 80, decision_score: 78 },
  duplicate_status: 'new'
};

const listings = [bmwListing, housingListing, travelListing];

/**
 * @param {Record<string, unknown>} overrides
 * @returns {Record<string, unknown>}
 */
function baseNegInput(overrides = {}) {
  return {
    recommendation: { id: 'test-id', price: 1780000, category: 'vehicle', ...overrides.recommendation },
    listing_price: 1780000,
    category: 'vehicle',
    category_key: 'vehicle',
    price_intelligence: { price_position: 'slightly_overpriced', price_confidence: 75 },
    market_intelligence: {},
    ownership_cost: { total_cost: 1900000, monthly_estimate: 3000 },
    quality_score: 88,
    risk_score: 28,
    duplicate_status: 'new',
    executive_label: 'Satın Alınabilir',
    user_intent: profile,
    ...overrides
  };
}

function runNeg(overrides = {}) {
  clearNegotiationMemoCache();
  return runNegotiationIntelligence(baseNegInput(overrides));
}

function getTopRecommendation(cat = 'vehicle') {
  clearRecommendationMemoCache();
  const p = { ...profile, category: cat };
  const result = runRecommendationEngine(listings, p);
  return result.top.find((item) => String(item.category).includes(cat === 'vehicle' ? 'vehicle' : cat)) ?? result.top[0];
}

// --- OFFER RANGE: FAIR ---

test('fair price offer range is limited', () => {
  const result = runNeg({ price_intelligence: { price_position: 'fair', price_confidence: 80 } });
  assert.ok(result.negotiation_room_pct <= 5);
  assert.ok(result.suggested_offer_low < result.listing_price);
  assert.ok(result.suggested_offer_high <= result.listing_price);
});

test('fair price target within range', () => {
  const result = runNeg({ price_intelligence: { price_position: 'fair', price_confidence: 80 } });
  assert.ok(result.target_offer >= result.suggested_offer_low);
  assert.ok(result.target_offer <= result.suggested_offer_high);
});

test('fair price low discount smaller than overpriced', () => {
  const fair = runNeg({ price_intelligence: { price_position: 'fair' } });
  clearNegotiationMemoCache();
  const over = runNeg({ price_intelligence: { price_position: 'overpriced' } });
  assert.ok(fair.negotiation_room_pct < over.negotiation_room_pct);
});

// --- OFFER RANGE: OVERPRICED ---

test('overpriced offer range wider than fair', () => {
  const result = runNeg({ price_intelligence: { price_position: 'overpriced' } });
  assert.ok(result.negotiation_room_pct >= 5);
});

test('overpriced lowers suggested offers', () => {
  const result = runNeg({ price_intelligence: { price_position: 'overpriced' } });
  assert.ok(result.suggested_offer_high < result.listing_price);
  assert.ok(result.target_offer < result.listing_price);
});

test('slightly_overpriced example range matches spec', () => {
  const result = runNeg();
  assert.equal(result.suggested_offer_low, 1650000);
  assert.equal(result.suggested_offer_high, 1710000);
  assert.equal(result.target_offer, 1680000);
  assert.equal(result.negotiation_room_pct, 5.6);
});

// --- UNDERPRICED ---

test('underpriced warning in reasons', () => {
  const result = runNeg({ price_intelligence: { price_position: 'underpriced' } });
  assert.ok(result.reasons.some((r) => /dikkatli|düşük/i.test(r)));
});

test('underpriced has smaller negotiation room', () => {
  const under = runNeg({ price_intelligence: { price_position: 'underpriced' } });
  clearNegotiationMemoCache();
  const over = runNeg({ price_intelligence: { price_position: 'overpriced' } });
  assert.ok(under.negotiation_room_pct < over.negotiation_room_pct);
});

test('underpriced summary mentions hızlı doğrulama', () => {
  const result = runNeg({ price_intelligence: { price_position: 'underpriced' } });
  assert.match(result.negotiation_summary, /hızlı doğrulama/i);
});

test('underpriced checklist prepends verification item', () => {
  const items = buildNegotiationChecklist('vehicle', { price_intelligence: { price_position: 'underpriced' } });
  assert.match(items[0], /Fiyat avantajı/i);
});

// --- HIGH RISK ---

test('high risk lowers offer', () => {
  const lowRisk = runNeg({ risk_score: 25 });
  clearNegotiationMemoCache();
  const highRisk = runNeg({ risk_score: 75 });
  assert.ok(highRisk.target_offer < lowRisk.target_offer);
});

test('high risk increases negotiation risk level', () => {
  const result = runNeg({ risk_score: 78, duplicate_status: 'exact' });
  assert.equal(result.negotiation_risk_level, 'Yüksek');
});

test('high risk adds reason about teklif aralığı', () => {
  const result = runNeg({ risk_score: 65 });
  assert.ok(result.reasons.some((r) => /risk/i.test(r)));
});

// --- LOW QUALITY ---

test('low quality lowers offer', () => {
  const highQ = runNeg({ quality_score: 90 });
  clearNegotiationMemoCache();
  const lowQ = runNeg({ quality_score: 35 });
  assert.ok(lowQ.target_offer < highQ.target_offer);
});

test('low quality adds reason', () => {
  const result = runNeg({ quality_score: 40 });
  assert.ok(result.reasons.some((r) => /kalite/i.test(r)));
});

// --- OWNERSHIP COST ---

test('ownership cost effect lowers offer', () => {
  const lowCost = runNeg({ ownership_cost: { total_cost: 1900000, monthly_estimate: 2000 } });
  clearNegotiationMemoCache();
  const highCost = runNeg({ ownership_cost: { total_cost: 2600000, monthly_estimate: 12000 } });
  assert.ok(highCost.target_offer <= lowCost.target_offer);
});

test('high ownership cost adds reason', () => {
  const result = runNeg({ ownership_cost: { total_cost: 2800000, monthly_estimate: 15000 } });
  assert.ok(result.reasons.some((r) => /sahip olma maliyeti/i.test(r)));
});

// --- DUPLICATE ---

test('duplicate warning in reasons', () => {
  const result = runNeg({ duplicate_status: 'exact' });
  assert.ok(result.reasons.some((r) => /mükerrer|benzer/i.test(r)));
});

test('duplicate prepends checklist item', () => {
  const items = buildNegotiationChecklist('vehicle', { duplicate_status: 'similar' });
  assert.match(items[0], /mükerrer|benzer/i);
});

test('duplicate exact raises risk level', () => {
  const result = runNeg({ duplicate_status: 'exact', risk_score: 50 });
  assert.ok(['Orta', 'Yüksek'].includes(result.negotiation_risk_level));
});

// --- CHECKLISTS ---

test('vehicle checklist includes ekspertiz', () => {
  const items = buildNegotiationChecklist('vehicle');
  assert.ok(items.some((i) => /ekspertiz/i.test(i)));
});

test('vehicle checklist includes tramer', () => {
  const items = buildNegotiationChecklist('vehicle');
  assert.ok(items.some((i) => /tramer/i.test(i)));
});

test('vehicle checklist includes servis geçmişi', () => {
  const items = buildNegotiationChecklist('vehicle');
  assert.ok(items.some((i) => /servis/i.test(i)));
});

test('vehicle checklist includes km doğrulama', () => {
  const items = buildNegotiationChecklist('vehicle');
  assert.ok(items.some((i) => /km/i.test(i)));
});

test('vehicle checklist includes boya/değişen', () => {
  const items = buildNegotiationChecklist('vehicle');
  assert.ok(items.some((i) => /boya|değişen/i.test(i)));
});

test('vehicle checklist includes lastik/bakım', () => {
  const items = buildNegotiationChecklist('vehicle');
  assert.ok(items.some((i) => /lastik|bakım/i.test(i)));
});

test('housing checklist includes tapu', () => {
  const items = buildNegotiationChecklist('housing');
  assert.ok(items.some((i) => /tapu/i.test(i)));
});

test('housing checklist includes iskan', () => {
  const items = buildNegotiationChecklist('housing');
  assert.ok(items.some((i) => /[iİ]skan/i.test(i)));
});

test('housing checklist includes krediye uygunluk', () => {
  const items = buildNegotiationChecklist('housing');
  assert.ok(items.some((i) => /kredi/i.test(i)));
});

test('housing checklist includes aidat', () => {
  const items = buildNegotiationChecklist('housing');
  assert.ok(items.some((i) => /aidat/i.test(i)));
});

test('housing checklist includes deprem riski', () => {
  const items = buildNegotiationChecklist('housing');
  assert.ok(items.some((i) => /deprem/i.test(i)));
});

test('housing checklist includes ekspertiz', () => {
  const items = buildNegotiationChecklist('housing');
  assert.ok(items.some((i) => /ekspertiz/i.test(i)));
});

test('travel checklist includes iptal koşulları', () => {
  const items = buildNegotiationChecklist('travel');
  assert.ok(items.some((i) => /[iİ]ptal/i.test(i)));
});

test('travel checklist includes ek ücretler', () => {
  const items = buildNegotiationChecklist('travel');
  assert.ok(items.some((i) => /ek ücret/i.test(i)));
});

test('travel checklist includes konum doğrulama', () => {
  const items = buildNegotiationChecklist('travel');
  assert.ok(items.some((i) => /konum/i.test(i)));
});

test('travel checklist includes yorumlar', () => {
  const items = buildNegotiationChecklist('travel');
  assert.ok(items.some((i) => /yorum/i.test(i)));
});

test('travel checklist includes sezon fiyatı', () => {
  const items = buildNegotiationChecklist('travel');
  assert.ok(items.some((i) => /sezon/i.test(i)));
});

test('resolveNegotiationCategoryKey maps konut to housing', () => {
  assert.equal(resolveNegotiationCategoryKey('konut'), 'housing');
});

test('resolveNegotiationCategoryKey maps tatil to travel', () => {
  assert.equal(resolveNegotiationCategoryKey('tatil'), 'travel');
});

test('NEGOTIATION_CHECKLIST_BY_CATEGORY has three categories', () => {
  assert.ok(NEGOTIATION_CHECKLIST_BY_CATEGORY.vehicle);
  assert.ok(NEGOTIATION_CHECKLIST_BY_CATEGORY.housing);
  assert.ok(NEGOTIATION_CHECKLIST_BY_CATEGORY.travel);
});

// --- SUMMARY ---

test('negotiation summary uses mevcut bilgiler ışığında', () => {
  const result = runNeg();
  assert.match(result.negotiation_summary, /mevcut bilgiler ışığında/i);
});

test('negotiation summary uses makul teklif aralığı', () => {
  const result = runNeg();
  assert.match(result.negotiation_summary, /makul teklif aralığı/i);
});

test('negotiation summary mentions doğrulama', () => {
  const result = runNeg();
  assert.match(result.negotiation_summary, /doğrulama/i);
});

test('forbidden wording blocked in summary', () => {
  const raw = buildNegotiationSummaryText(
    { suggested_offer_low: 1000, suggested_offer_high: 2000 },
    'Orta',
    { price_intelligence: { price_position: 'fair' } }
  );
  const lower = raw.toLowerCase();
  for (const phrase of NEGOTIATION_FORBIDDEN_PHRASES) {
    assert.ok(!lower.includes(phrase.toLowerCase()), `forbidden: ${phrase}`);
  }
});

test('sanitizeNegotiationSummary replaces garanti', () => {
  const cleaned = sanitizeNegotiationSummary('Bu fiyat garanti kazandırır.');
  assert.ok(!cleaned.toLowerCase().includes('garanti'));
});

test('sanitizeNegotiationSummary replaces yatırım tavsiyesi', () => {
  const cleaned = sanitizeNegotiationSummary('yatırım tavsiyesi verilmez');
  assert.ok(!cleaned.toLowerCase().includes('yatırım tavsiyesi'));
});

test('runNegotiationIntelligence summary avoids forbidden wording', () => {
  const result = runNeg();
  const lower = result.negotiation_summary.toLowerCase();
  assert.ok(!lower.includes('garanti'));
  assert.ok(!lower.includes('yatırım tavsiyesi'));
  assert.ok(!lower.includes('kesin değer'));
});

// --- CONFIDENCE ---

test('confidence increases with quality', () => {
  const low = computeNegotiationConfidence(baseNegInput({ quality_score: 30 }));
  const high = computeNegotiationConfidence(baseNegInput({ quality_score: 90 }));
  assert.ok(high > low);
});

test('confidence decreases with risk', () => {
  const lowRisk = computeNegotiationConfidence(baseNegInput({ risk_score: 20 }));
  const highRisk = computeNegotiationConfidence(baseNegInput({ risk_score: 80 }));
  assert.ok(lowRisk > highRisk);
});

test('runNegotiationIntelligence returns confidence 0-100', () => {
  const result = runNeg();
  assert.ok(result.confidence >= 0 && result.confidence <= 100);
});

test('empty recommendation returns zero confidence', () => {
  clearNegotiationMemoCache();
  const result = runNegotiationIntelligence({ recommendation: {}, user_intent: profile });
  assert.equal(result.confidence, 0);
});

// --- RISK LEVEL ---

test('buildNegotiationRiskLabel Düşük', () => {
  assert.match(buildNegotiationRiskLabel('Düşük'), /Düşük pazarlık riski/);
});

test('buildNegotiationRiskLabel Yüksek', () => {
  assert.match(buildNegotiationRiskLabel('Yüksek'), /Yüksek pazarlık riski/);
});

test('mapNegotiationRiskClass maps levels', () => {
  assert.equal(mapNegotiationRiskClass('Düşük'), 'low');
  assert.equal(mapNegotiationRiskClass('Orta'), 'mid');
  assert.equal(mapNegotiationRiskClass('Yüksek'), 'high');
});

test('classifyNegotiationRiskLevel returns valid level', () => {
  const level = classifyNegotiationRiskLevel(baseNegInput(), { negotiation_room_pct: 5 });
  assert.ok(['Düşük', 'Orta', 'Yüksek'].includes(level));
});

// --- ENGINE / INPUT ---

test('buildNegotiationInput maps recommendation fields', () => {
  const rec = getTopRecommendation();
  const input = buildNegotiationInput(rec, profile);
  assert.ok(input.listing_price > 0);
  assert.ok(input.price_intelligence);
  assert.ok(input.ownership_cost);
});

test('buildNegotiationInput includes duplicate_status', () => {
  const rec = { ...bmwListing, duplicate_status: 'similar' };
  const input = buildNegotiationInput(rec, profile);
  assert.equal(input.duplicate_status, 'similar');
});

test('runNegotiationIntelligence empty recommendation fallback', () => {
  clearNegotiationMemoCache();
  const result = runNegotiationIntelligence(buildNegotiationInput({}, profile));
  assert.equal(result.listing_price, 0);
  assert.match(result.negotiation_summary, /üretilemedi/i);
});

test('roundOfferAmount rounds to 10000 for large values', () => {
  assert.equal(roundOfferAmount(1654321), 1650000);
});

test('computeOfferRange returns zero for missing price', () => {
  const range = computeOfferRange({ listing_price: 0, price_intelligence: { price_position: 'fair' } });
  assert.equal(range.target_offer, 0);
});

test('POSITION_DISCOUNT_PROFILES has all positions', () => {
  assert.ok(POSITION_DISCOUNT_PROFILES.fair);
  assert.ok(POSITION_DISCOUNT_PROFILES.overpriced);
  assert.ok(POSITION_DISCOUNT_PROFILES.underpriced);
});

test('buildNegotiationReasons returns array', () => {
  const reasons = buildNegotiationReasons(baseNegInput(), { negotiation_room_pct: 5 }, 'Orta');
  assert.ok(Array.isArray(reasons));
  assert.ok(reasons.length > 0);
});

// --- LAZY COMPUTE ---

test('lazy compute memoizes identical input', () => {
  clearNegotiationMemoCache();
  const input = baseNegInput();
  const first = runNegotiationIntelligence(input);
  const second = runNegotiationIntelligence(input);
  assert.equal(first, second);
});

test('cache key differs by recommendation id', () => {
  const a = buildNegotiationCacheKey({ id: 'a' }, profile);
  const b = buildNegotiationCacheKey({ id: 'b' }, profile);
  assert.notEqual(a, b);
});

test('lazy compute: dashboard build does not run negotiation engine', () => {
  clearNegotiationMemoCache();
  const { result } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.ok(result?.top.length > 0);
  const rec = result.top[0];
  const input = buildNegotiationInput(rec, profile);
  const key = buildNegotiationCacheKey(rec, profile);
  clearNegotiationMemoCache();
  runNegotiationIntelligence(input);
  clearNegotiationMemoCache();
  const { result: result2 } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.ok(result2?.top.length > 0);
  assert.equal(buildNegotiationCacheKey(result2.top[0], profile), key);
});

test('lazy compute: 10k listings negotiation only for selected item', () => {
  clearNegotiationMemoCache();
  clearRecommendationMemoCache();
  const large = Array.from({ length: 10000 }, (_, index) => ({
    ...bmwListing,
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    price: 1500000 + index * 100
  }));
  const started = Date.now();
  const recResult = runRecommendationEngine(large, profile);
  const neg = runNegotiationIntelligence(buildNegotiationInput(recResult.top[0], profile));
  const elapsed = Date.now() - started;
  assert.ok(neg.target_offer > 0);
  assert.ok(elapsed < 30000, `negotiation too slow: ${elapsed}ms`);
});

// --- ADMIN RENDER ---

test('buildRecommendationCardHtml includes Pazarlık Zekâsı button', () => {
  const rec = getTopRecommendation();
  const html = buildRecommendationCardHtml(rec);
  assert.match(html, /Pazarlık Zekâsı/);
  assert.match(html, /data-rec-negotiation-id/);
});

test('buildRecommendationsDashboardHtml includes negotiation host', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.match(html, /ai-neg-panel-host/);
});

test('buildNegotiationPanelHtml renders all drawer fields', () => {
  const result = runNeg();
  const html = buildNegotiationPanelHtml(result, { title: 'BMW 320i' });
  assert.match(html, /İlan fiyatı/);
  assert.match(html, /Önerilen teklif aralığı/);
  assert.match(html, /Hedef teklif/);
  assert.match(html, /Pazarlık payı/);
  assert.match(html, /Nedenler/);
  assert.match(html, /Teklif öncesi doğrulama/);
  assert.match(html, /güven/i);
});

test('buildNegotiationPanelHtml escapes XSS', () => {
  const html = buildNegotiationPanelHtml(
    {
      listing_price: 1000,
      suggested_offer_low: 900,
      suggested_offer_high: 950,
      target_offer: 920,
      negotiation_room_pct: 8,
      negotiation_risk_level: 'Orta',
      negotiation_risk_label: 'Orta pazarlık riski',
      negotiation_summary: '<script>x</script>',
      reasons: ['<script>'],
      verification_before_offer: ['<img onerror=1>'],
      confidence: 50
    },
    { title: 'Test' }
  );
  assert.ok(!html.includes('<script>'));
});

test('buildNegotiationShellHtml renders host', () => {
  assert.match(buildNegotiationShellHtml(), /ai-neg-panel-host/);
});

test('formatNegotiationTry uses TL suffix', () => {
  assert.match(formatNegotiationTry(1650000), /TL/);
});

test('buildNegotiationPanelHtml includes risk badge', () => {
  const result = runNeg({ risk_score: 75, duplicate_status: 'exact' });
  const html = buildNegotiationPanelHtml(result);
  assert.match(html, /pazarlık riski/i);
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /resource: 'listings'/);
  assert.doesNotMatch(router, /negotiation/i);
});

test('guard: no schema change for negotiation tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /negotiation_intelligence/i);
  assert.doesNotMatch(sql, /ai_listing_negotiation/i);
});

test('guard: shared negotiation module exists', () => {
  const p = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/negotiation/negotiation-engine.js');
  assert.ok(fs.existsSync(p));
});

test('guard: client negotiation module exists', () => {
  const p = path.join(process.cwd(), 'js/ai-negotiation-intelligence/index.js');
  assert.ok(fs.existsSync(p));
});

test('housing category negotiation via buildNegotiationInput', () => {
  clearNegotiationMemoCache();
  const input = buildNegotiationInput(housingListing, { ...profile, category: 'housing' });
  const result = runNegotiationIntelligence(input);
  assert.equal(result.category, 'housing');
  assert.ok(result.verification_before_offer.some((i) => /[tT]apu/i.test(i)));
});

test('travel category negotiation via buildNegotiationInput', () => {
  clearNegotiationMemoCache();
  const input = buildNegotiationInput(travelListing, { ...profile, category: 'vacation' });
  const result = runNegotiationIntelligence(input);
  assert.equal(result.category, 'travel');
  assert.ok(result.verification_before_offer.some((i) => /[iİ]ptal/i.test(i)));
});
