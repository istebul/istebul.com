import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  clearOwnershipCostMemoCache,
  buildOwnershipCostCacheKey,
  buildOwnershipCostInput,
  computeOwnershipCostConfidence,
  runOwnershipCostSimulator,
  computeVehicleOwnershipCosts,
  computeHousingOwnershipCosts,
  computeTravelOwnershipCosts,
  buildCostBreakdown,
  formatCostTry,
  COST_FORBIDDEN_PHRASES,
  sanitizeCostSummary,
  buildCostRiskLabel,
  classifyCostRiskLevel,
  buildCostAssumptions,
  buildCostWarnings,
  buildCostSummaryText,
  buildOwnershipCostPanelHtml,
  buildOwnershipCostShellHtml
} = await import('../../js/ai-ownership-cost/index.js');

const { runRecommendationEngine, clearRecommendationMemoCache } = await import(
  '../../js/ai-recommendation-engine/index.js'
);
const { buildRecommendationsDashboardHtml } = await import('../../js/admin/ai-listings-recommendations-admin.js');
const { buildRecommendationCardHtml } = await import('../../js/ai-recommendation-engine/recommendation-card-builder.js');
const { buildRepositoryDashboardHtml } = await import('../../js/admin/ai-listings-repository-admin.js');
const { buildAnalyticsDashboardHtml } = await import('../../js/admin/ai-listings-analytics-admin.js');
const { buildCollectorDashboardHtml } = await import('../../js/admin/ai-listings-collector-admin.js');
const { buildExecutiveDashboardHtml } = await import('../../js/admin/ai-listings-admin-core.js');

const routerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/router.js');
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260701_ai_listings_engine_v1.sql');
const adminHtmlPath = path.join(process.cwd(), 'admin/ai-listings.html');

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
  latest_analysis: { ai_score: 82, risk_score: 28, quality_score: 88, decision_score: 82 }
};

const housingListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'housing',
  title: 'Kadıköy 3+1 Daire',
  price: 5200000,
  location: 'İstanbul',
  latest_analysis: { risk_score: 35, quality_score: 75, decision_score: 70 }
};

const travelListing = {
  id: '44444444-4444-4444-4444-444444444444',
  category: 'vacation',
  title: 'Antalya 7 Gün Paket',
  price: 42000,
  location: 'Antalya',
  latest_analysis: { risk_score: 22, quality_score: 80, decision_score: 78 },
  market_intelligence: { season_factor: 1.15 }
};

const listings = [bmwListing, housingListing, travelListing];

function getTopRecommendation(cat = 'vehicle') {
  clearRecommendationMemoCache();
  const p = { ...profile, category: cat };
  const result = runRecommendationEngine(listings, p);
  return result.top.find((item) => String(item.category).includes(cat === 'vehicle' ? 'vehicle' : cat)) ?? result.top[0];
}

function runCost(rec = null, intent = profile) {
  clearOwnershipCostMemoCache();
  const recommendation = rec ?? getTopRecommendation();
  const input = buildOwnershipCostInput(recommendation, intent);
  return runOwnershipCostSimulator(input);
}

function runCostForListing(listing, intent = {}) {
  clearOwnershipCostMemoCache();
  const recommendation = {
    ...listing,
    risk_score: listing.latest_analysis?.risk_score,
    quality_score: listing.latest_analysis?.quality_score,
    decision_score: listing.latest_analysis?.decision_score
  };
  const input = buildOwnershipCostInput(recommendation, {
    ...profile,
    category: listing.category,
    ...intent
  });
  return runOwnershipCostSimulator(input);
}

// --- VEHICLE COST ---

test('computeVehicleOwnershipCosts returns fuel estimate', () => {
  const model = computeVehicleOwnershipCosts({ listing_price: 1780000, annual_km: 15000, usage_type: 'family' });
  assert.ok(model.fuel_annual > 0);
});

test('computeVehicleOwnershipCosts includes maintenance', () => {
  const model = computeVehicleOwnershipCosts({ listing_price: 1780000, quality_score: 40 });
  const highQ = computeVehicleOwnershipCosts({ listing_price: 1780000, quality_score: 90 });
  assert.ok(model.maintenance_annual >= highQ.maintenance_annual);
});

test('computeVehicleOwnershipCosts includes insurance', () => {
  const low = computeVehicleOwnershipCosts({ listing_price: 1000000, risk_score: 20 });
  const high = computeVehicleOwnershipCosts({ listing_price: 1000000, risk_score: 80 });
  assert.ok(high.insurance_annual > low.insurance_annual);
});

test('computeVehicleOwnershipCosts includes MTV', () => {
  const model = computeVehicleOwnershipCosts({ listing_price: 2500000 });
  assert.ok(model.mtv_annual >= 13500);
});

test('computeVehicleOwnershipCosts includes ekspertiz', () => {
  const model = computeVehicleOwnershipCosts({ listing_price: 900000, risk_score: 60 });
  assert.ok(model.ekspertiz >= 5000);
});

test('computeVehicleOwnershipCosts includes depreciation', () => {
  const model = computeVehicleOwnershipCosts({ listing_price: 1500000, ownership_period: 5, risk_score: 50 });
  assert.ok(model.depreciation_total > 0);
  assert.ok(model.depreciation_total < model.purchase_price);
});

test('computeVehicleOwnershipCosts city usage increases fuel', () => {
  const city = computeVehicleOwnershipCosts({ listing_price: 1200000, annual_km: 12000, usage_type: 'city' });
  const highway = computeVehicleOwnershipCosts({ listing_price: 1200000, annual_km: 12000, usage_type: 'highway' });
  assert.ok(city.fuel_annual > highway.fuel_annual);
});

test('computeVehicleOwnershipCosts total exceeds purchase', () => {
  const model = computeVehicleOwnershipCosts({ listing_price: 1000000, ownership_period: 5 });
  assert.ok(model.total_ownership > model.purchase_price);
});

test('runOwnershipCostSimulator vehicle category', () => {
  const result = runCost(getTopRecommendation('vehicle'));
  assert.equal(result.category, 'vehicle');
  assert.ok(result.total_cost > 0);
});

test('vehicle breakdown includes yakıt label', () => {
  const result = runCost(getTopRecommendation('vehicle'));
  const fuel = result.cost_breakdown.find((item) => item.key === 'fuel_annual');
  assert.ok(fuel);
  assert.match(fuel.label, /Yakıt/);
});

// --- HOUSING COST ---

test('computeHousingOwnershipCosts returns aidat', () => {
  const model = computeHousingOwnershipCosts({ listing_price: 5000000, city: 'İstanbul' });
  assert.ok(model.aidat_annual > 0);
});

test('computeHousingOwnershipCosts metro city higher aidat', () => {
  const metro = computeHousingOwnershipCosts({ listing_price: 3000000, city: 'İstanbul' });
  const other = computeHousingOwnershipCosts({ listing_price: 3000000, city: 'Sivas' });
  assert.ok(metro.aidat_annual > other.aidat_annual);
});

test('computeHousingOwnershipCosts includes tax and insurance', () => {
  const model = computeHousingOwnershipCosts({ listing_price: 4000000 });
  assert.ok(model.tax_annual > 0);
  assert.ok(model.insurance_annual > 0);
});

test('computeHousingOwnershipCosts includes credit placeholder', () => {
  const model = computeHousingOwnershipCosts({ listing_price: 6000000, ownership_period: 10 });
  assert.ok(model.credit_placeholder > 0);
});

test('computeHousingOwnershipCosts includes moving cost', () => {
  const model = computeHousingOwnershipCosts({ listing_price: 2500000, city: 'Ankara' });
  assert.ok(model.moving_cost > 0);
});

test('runOwnershipCostSimulator housing category', () => {
  const result = runCostForListing(housingListing, { ownership_period: 10, city: 'İstanbul' });
  assert.ok(result.total_cost > housingListing.price);
});

test('housing breakdown includes aidat label', () => {
  const result = runCostForListing(housingListing, { city: 'İstanbul' });
  const aidat = result.cost_breakdown.find((item) => item.key === 'aidat_annual');
  assert.ok(aidat);
  assert.match(aidat.label, /Aidat/);
});

test('housing breakdown includes kredi placeholder', () => {
  const result = runCostForListing(housingListing, { city: 'İstanbul' });
  const credit = result.cost_breakdown.find((item) => item.key === 'credit_placeholder');
  assert.ok(credit);
  assert.match(credit.label, /Kredi/);
});

// --- TRAVEL COST ---

test('computeTravelOwnershipCosts returns accommodation', () => {
  const model = computeTravelOwnershipCosts({ listing_price: 50000, family_size: 4, ownership_period: 7 });
  assert.ok(model.accommodation > 0);
});

test('computeTravelOwnershipCosts includes transport and food', () => {
  const model = computeTravelOwnershipCosts({ listing_price: 40000, family_size: 3, ownership_period: 5 });
  assert.ok(model.transport > 0);
  assert.ok(model.food > 0);
});

test('computeTravelOwnershipCosts includes cancel risk buffer', () => {
  const low = computeTravelOwnershipCosts({ listing_price: 30000, risk_score: 20 });
  const high = computeTravelOwnershipCosts({ listing_price: 30000, risk_score: 80 });
  assert.ok(high.cancel_risk_buffer > low.cancel_risk_buffer);
});

test('computeTravelOwnershipCosts season adjustment when factor high', () => {
  const model = computeTravelOwnershipCosts({
    listing_price: 45000,
    market_intelligence: { season_factor: 1.2 }
  });
  assert.ok(model.season_adjustment >= 0);
});

test('runOwnershipCostSimulator travel category', () => {
  const result = runCostForListing(travelListing, { ownership_period: 7 });
  assert.ok(result.total_cost > 0);
});

test('travel breakdown includes konaklama label', () => {
  const result = runCostForListing(travelListing);
  const stay = result.cost_breakdown.find((item) => item.key === 'accommodation');
  assert.ok(stay);
  assert.match(stay.label, /Konaklama/);
});

// --- MONTHLY / ANNUAL ---

test('monthly_estimate is derived from total', () => {
  const result = runCost();
  assert.ok(result.monthly_estimate > 0);
  assert.ok(result.monthly_estimate < result.total_cost);
});

test('annual_estimate positive for vehicle', () => {
  const result = runCost();
  assert.ok(result.annual_estimate > 0);
});

test('monthly estimate for travel uses days', () => {
  const result = runCostForListing(travelListing, { ownership_period: 7 });
  assert.ok(result.monthly_estimate > 0);
});

test('annual estimate equals total for single trip', () => {
  const result = runCostForListing(travelListing);
  assert.equal(result.annual_estimate, result.total_cost);
});

// --- BREAKDOWN ---

test('buildCostBreakdown vehicle has total line', () => {
  const model = computeVehicleOwnershipCosts({ listing_price: 900000 });
  const breakdown = buildCostBreakdown('vehicle', model);
  assert.ok(breakdown.some((item) => item.key === 'total_ownership'));
});

test('buildCostBreakdown housing has total line', () => {
  const model = computeHousingOwnershipCosts({ listing_price: 3000000 });
  const breakdown = buildCostBreakdown('housing', model);
  assert.ok(breakdown.some((item) => item.key === 'total_ownership'));
});

test('buildCostBreakdown travel has total trip line', () => {
  const model = computeTravelOwnershipCosts({ listing_price: 35000 });
  const breakdown = buildCostBreakdown('vacation', model);
  assert.ok(breakdown.some((item) => item.key === 'total_trip'));
});

test('formatCostTry uses TRY suffix', () => {
  assert.match(formatCostTry(1250000), /TRY/);
  assert.match(formatCostTry(1250000), /1\.250\.000/);
});

// --- WARNINGS / ASSUMPTIONS ---

test('buildCostWarnings always includes disclaimer', () => {
  const warnings = buildCostWarnings({ risk_score: 30 }, 'low');
  assert.ok(warnings.some((w) => w.includes('doğrulama')));
});

test('buildCostWarnings high risk adds warning', () => {
  const warnings = buildCostWarnings({ risk_score: 75 }, 'high');
  assert.ok(warnings.length >= 2);
});

test('buildCostWarnings price intelligence overpriced', () => {
  const warnings = buildCostWarnings({ price_intelligence: { overpriced: true } }, 'medium');
  assert.ok(warnings.some((w) => w.includes('piyasa')));
});

test('buildCostAssumptions vehicle includes km', () => {
  const assumptions = buildCostAssumptions('vehicle', { annual_km: 20000, city: 'İzmir' });
  assert.ok(assumptions.some((a) => a.includes('20.000')));
});

test('buildCostAssumptions housing includes credit note', () => {
  const assumptions = buildCostAssumptions('housing', { ownership_period: 10 });
  assert.ok(assumptions.some((a) => a.includes('Kredi')));
});

test('buildCostAssumptions travel includes days', () => {
  const assumptions = buildCostAssumptions('vacation', { ownership_period: 9 });
  assert.ok(assumptions.some((a) => a.includes('9 gün')));
});

test('runOwnershipCostSimulator returns assumptions array', () => {
  const result = runCost();
  assert.ok(Array.isArray(result.assumptions));
  assert.ok(result.assumptions.length >= 3);
});

test('runOwnershipCostSimulator returns warnings array', () => {
  const result = runCost();
  assert.ok(Array.isArray(result.warnings));
  assert.ok(result.warnings.length >= 1);
});

// --- CONFIDENCE ---

test('computeOwnershipCostConfidence increases with quality', () => {
  const low = computeOwnershipCostConfidence({ quality_score: 30, risk_score: 50, listing_price: 1000000 });
  const high = computeOwnershipCostConfidence({ quality_score: 90, risk_score: 50, listing_price: 1000000 });
  assert.ok(high > low);
});

test('computeOwnershipCostConfidence increases with price present', () => {
  const noPrice = computeOwnershipCostConfidence({ quality_score: 70, risk_score: 40, listing_price: 0 });
  const withPrice = computeOwnershipCostConfidence({ quality_score: 70, risk_score: 40, listing_price: 900000 });
  assert.ok(withPrice > noPrice);
});

test('runOwnershipCostSimulator confidence bounded 0-100', () => {
  const result = runCost();
  assert.ok(result.confidence >= 0 && result.confidence <= 100);
});

test('classifyCostRiskLevel returns low medium high', () => {
  assert.equal(classifyCostRiskLevel(20, 85, 75), 'low');
  assert.equal(classifyCostRiskLevel(70, 40, 35), 'high');
  assert.equal(classifyCostRiskLevel(45, 60, 55), 'medium');
});

test('buildCostRiskLabel maps levels', () => {
  assert.match(buildCostRiskLabel('low'), /Düşük/);
  assert.match(buildCostRiskLabel('high'), /Yüksek/);
  assert.match(buildCostRiskLabel('medium'), /Orta/);
});

// --- SAFE WORDING ---

test('sanitizeCostSummary removes forbidden phrases', () => {
  for (const phrase of COST_FORBIDDEN_PHRASES) {
    const sanitized = sanitizeCostSummary(`Bu ${phrase} ifadesi yasak.`);
    assert.ok(!sanitized.toLowerCase().includes(phrase.toLowerCase()));
  }
});

test('buildCostSummaryText uses tahmini language', () => {
  const summary = buildCostSummaryText('vehicle', 2500000, 'medium');
  assert.match(summary, /tahmin|ön değerlendirme|mevcut bilgiler/i);
  assert.match(summary, /doğrulama önerilir/i);
});

test('runOwnershipCostSimulator summary avoids forbidden wording', () => {
  const result = runCost();
  const lower = result.cost_summary.toLowerCase();
  assert.ok(!lower.includes('garanti'));
  assert.ok(!lower.includes('yatırım tavsiyesi'));
  assert.ok(!lower.includes('kesin maliyet'));
});

test('buildOwnershipCostPanelHtml summary section present', () => {
  const result = runCost();
  const html = buildOwnershipCostPanelHtml(result);
  assert.match(html, /Özet/);
  assert.match(html, /tahmin/i);
});

// --- INPUT / ENGINE ---

test('buildOwnershipCostInput maps recommendation fields', () => {
  const rec = getTopRecommendation();
  const input = buildOwnershipCostInput(rec, profile);
  assert.ok(input.listing_price > 0);
  assert.equal(input.category, 'vehicle');
  assert.equal(input.city, 'İzmir');
});

test('buildOwnershipCostInput defaults annual_km', () => {
  const rec = getTopRecommendation();
  const input = buildOwnershipCostInput(rec, {});
  assert.equal(input.annual_km, 15000);
});

test('runOwnershipCostSimulator empty recommendation fallback', () => {
  const result = runOwnershipCostSimulator(buildOwnershipCostInput({}, profile));
  assert.equal(result.total_cost, 0);
  assert.match(result.cost_summary, /üretilemedi/i);
});

test('lazy compute memoizes identical input', () => {
  clearOwnershipCostMemoCache();
  const rec = getTopRecommendation();
  const input = buildOwnershipCostInput(rec, profile);
  const first = runOwnershipCostSimulator(input);
  const second = runOwnershipCostSimulator(input);
  assert.equal(first, second);
});

test('cache key differs by recommendation id', () => {
  const a = buildOwnershipCostCacheKey({ id: 'a' }, profile);
  const b = buildOwnershipCostCacheKey({ id: 'b' }, profile);
  assert.notEqual(a, b);
});

// --- ADMIN RENDER ---

test('buildRecommendationCardHtml includes Sahip Olma Maliyeti button', () => {
  const rec = getTopRecommendation();
  const html = buildRecommendationCardHtml(rec);
  assert.match(html, /Sahip Olma Maliyeti/);
  assert.match(html, /data-rec-cost-id/);
});

test('buildRecommendationsDashboardHtml includes cost host', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.match(html, /ai-cost-panel-host/);
});

test('buildOwnershipCostPanelHtml renders totals and breakdown', () => {
  const result = runCost();
  const html = buildOwnershipCostPanelHtml(result, { title: 'BMW 320i' });
  assert.match(html, /Toplam tahmini maliyet/);
  assert.match(html, /Aylık tahmin/);
  assert.match(html, /Yıllık tahmin/);
  assert.match(html, /Maliyet kırılımı/);
  assert.match(html, /Varsayımlar/);
  assert.match(html, /Uyarılar/);
});

test('buildOwnershipCostPanelHtml escapes XSS', () => {
  const html = buildOwnershipCostPanelHtml(
    {
      total_cost: 1000,
      monthly_estimate: 100,
      annual_estimate: 1200,
      cost_breakdown: [{ label: '<script>x</script>', amount: 100 }],
      cost_risk_level: 'medium',
      cost_summary: '<img onerror=1>',
      assumptions: ['<script>'],
      warnings: ['<script>'],
      confidence: 50
    },
    { title: 'Test' }
  );
  assert.ok(!html.includes('<script>'));
});

test('buildOwnershipCostShellHtml renders host', () => {
  assert.match(buildOwnershipCostShellHtml(), /ai-cost-panel-host/);
});

// --- TURKISH COPY ---

test('admin html uses Karar Merkezi title', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /Karar Merkezi/);
  assert.doesNotMatch(html, /AI Decision Center/);
});

test('admin html tabs are Turkish', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /Veri Havuzu/);
  assert.match(html, /Analitik/);
  assert.match(html, /Veri Toplayıcı/);
  assert.match(html, /Öneriler/);
});

test('recommendations dashboard heading Turkish', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: false });
  assert.match(html, /Öneriler/);
  assert.doesNotMatch(html, />Recommendations</);
});

test('recommendation card buttons Turkish', () => {
  const rec = getTopRecommendation();
  const html = buildRecommendationCardHtml(rec);
  assert.match(html, /Karar Koçu/);
  assert.match(html, /Karar Simülatörü/);
  assert.match(html, /AI Karar Raporu/);
  assert.match(html, /Uyum Skoru/);
});

test('repository dashboard heading Turkish', () => {
  const { html } = buildRepositoryDashboardHtml(listings);
  assert.match(html, /Veri Havuzu/);
  assert.match(html, /AI Arama/);
});

test('analytics dashboard heading Turkish', () => {
  const { html } = buildAnalyticsDashboardHtml(listings);
  assert.match(html, /Analitik/);
  assert.match(html, /Yönetici Özeti/);
});

test('collector dashboard heading Turkish', () => {
  const html = buildCollectorDashboardHtml();
  assert.match(html, /Veri Toplayıcı Önizleme/);
});

test('executive dashboard eyebrow Turkish', () => {
  const html = buildExecutiveDashboardHtml(listings);
  assert.match(html, /Yönetici Özeti/);
  assert.doesNotMatch(html, /Executive Overview/);
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /resource: 'listings'/);
  assert.doesNotMatch(router, /ownership-cost/i);
  assert.doesNotMatch(router, /ownership_cost/i);
});

test('guard: no schema change for ownership cost tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /ownership_cost/i);
  assert.doesNotMatch(sql, /ai_listing_cost/i);
});

test('guard: shared ownership cost module exists', () => {
  const p = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/ownership-cost/ownership-cost-engine.js');
  assert.ok(fs.existsSync(p));
});

test('guard: client ownership cost module exists', () => {
  const p = path.join(process.cwd(), 'js/ai-ownership-cost/index.js');
  assert.ok(fs.existsSync(p));
});
