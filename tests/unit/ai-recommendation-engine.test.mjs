import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  FIT_WEIGHTS,
  clampFitScore,
  applyProfileFallbacks,
  computeBudgetFit,
  computeRiskFit,
  computeQualityFit,
  computeExecutiveFit,
  computePriceFit,
  computeMarketFit,
  computeUsageFit,
  computeFamilyFit,
  computeAnnualKmFit,
  computePriorityFit,
  getRecommendationLabel,
  computeFitScore,
  rankTopRecommendations,
  assignAlternativeTags,
  resolveItemAlternativeTags,
  ALTERNATIVE_TAG_LABELS_TR,
  buildRecommendationExplanation,
  FORBIDDEN_PHRASES,
  sanitizeSummaryText,
  buildRecommendationSummary,
  runRecommendationEngine,
  clearRecommendationMemoCache,
  parseUserIntent,
  listMissingProfileFields,
  buildRecommendationCardHtml,
  buildRecommendationCardsGridHtml
} = await import('../../js/ai-recommendation-engine/index.js');

const {
  buildRecommendationsDashboardHtml,
  buildRecommendationProfileFormHtml,
  buildRecommendationSummaryHtml
} = await import('../../js/admin/ai-listings-recommendations-admin.js');

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
  priority: 'total_cost'
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
  status: 'approved',
  created_at: '2026-06-07T10:00:00.000Z',
  updated_at: '2026-06-07T11:00:00.000Z',
  images: ['img1.jpg'],
  attributes: {
    brand: 'BMW',
    model: '320i',
    year: 2022,
    km: 45000,
    fuel_type: 'benzin',
    transmission: 'otomatik',
    body_type: 'sedan'
  },
  latest_analysis: {
    ai_score: 82,
    risk_score: 28,
    quality_score: 88,
    decision_score: 82,
    tags: ['executive_label:Satın Alınabilir']
  }
};

const riskyListing = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'vehicle',
  title: '2010 BMW 520i',
  price: 950000,
  currency: 'TRY',
  location: 'Ankara',
  source_type: 'csv',
  status: 'approved',
  created_at: '2026-06-06T08:00:00.000Z',
  updated_at: '2026-06-06T09:00:00.000Z',
  images: [],
  attributes: { brand: 'BMW', model: '520i', year: 2010, km: 220000, body_type: 'sedan' },
  latest_analysis: {
    ai_score: 45,
    risk_score: 72,
    quality_score: 40,
    decision_score: 45
  }
};

const suvListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'vehicle',
  title: 'Volkswagen Tiguan SUV',
  price: 1200000,
  currency: 'TRY',
  location: 'İzmir',
  source_type: 'ai_builder',
  status: 'approved',
  created_at: '2026-06-05T12:00:00.000Z',
  updated_at: '2026-06-05T13:00:00.000Z',
  images: ['a.jpg'],
  attributes: { brand: 'Volkswagen', model: 'Tiguan', year: 2020, km: 60000, body_type: 'SUV' },
  latest_analysis: {
    ai_score: 75,
    risk_score: 35,
    quality_score: 78,
    decision_score: 75
  }
};

const listings = [bmwListing, riskyListing, suvListing];

// --- INTENT PARSER ---

test('parseUserIntent parses full profile', () => {
  const parsed = parseUserIntent(profile);
  assert.equal(parsed.category, 'vehicle');
  assert.equal(parsed.budget, 1800000);
  assert.equal(parsed.city, 'İzmir');
  assert.equal(parsed.family_size, 4);
  assert.equal(parsed.annual_km, 15000);
  assert.equal(parsed.priority, 'total_cost');
});

test('applyProfileFallbacks uses safe defaults for missing fields', () => {
  const resolved = applyProfileFallbacks({});
  assert.equal(resolved.category, 'vehicle');
  assert.equal(resolved.risk_tolerance, 'medium');
  assert.equal(resolved.priority, 'total_cost');
  assert.equal(resolved.budget, null);
});

test('listMissingProfileFields reports optional gaps', () => {
  const missing = listMissingProfileFields(applyProfileFallbacks({}));
  assert.ok(missing.includes('budget'));
  assert.ok(missing.includes('city'));
});

// --- FIT WEIGHTS ---

test('FIT_WEIGHTS base sum is 100 excluding penalty', () => {
  const total = Object.entries(FIT_WEIGHTS)
    .filter(([key]) => key !== 'duplicate_penalty')
    .reduce((sum, [, value]) => sum + value, 0);
  assert.equal(total, 100);
});

test('clampFitScore limits 0-100', () => {
  assert.equal(clampFitScore(150), 100);
  assert.equal(clampFitScore(-5), 0);
});

// --- INDIVIDUAL FITS ---

test('computeBudgetFit high when price under budget', () => {
  const record = { price: 1700000 };
  assert.ok(computeBudgetFit(record, bmwListing, 1800000) >= 75);
});

test('computeBudgetFit low when price far over budget', () => {
  const record = { price: 3000000 };
  assert.ok(computeBudgetFit(record, bmwListing, 1800000) <= 25);
});

test('computeRiskFit prefers low risk for low tolerance', () => {
  assert.ok(computeRiskFit({ risk_score: 20 }, 'low') > computeRiskFit({ risk_score: 70 }, 'low'));
});

test('computeQualityFit maps quality score', () => {
  assert.equal(computeQualityFit({ quality_score: 88 }), 88);
});

test('computeExecutiveFit maps decision score', () => {
  assert.equal(computeExecutiveFit({ decision_score: 82 }), 82);
});

test('computePriceFit returns value for listing', () => {
  const fit = computePriceFit(bmwListing);
  assert.ok(fit >= 0 && fit <= 100);
});

test('computeMarketFit returns value for listing', () => {
  const fit = computeMarketFit(bmwListing);
  assert.ok(fit >= 0 && fit <= 100);
});

test('computeUsageFit prefers SUV for family usage', () => {
  const suv = computeUsageFit({ title: 'Tiguan SUV' }, suvListing, { usage_type: 'family' });
  const sedan = computeUsageFit({ title: 'BMW 320i' }, bmwListing, { usage_type: 'family' });
  assert.ok(suv >= sedan);
});

test('computeFamilyFit prefers SUV for large family', () => {
  const suv = computeFamilyFit({ title: 'Tiguan' }, suvListing, { family_size: 5 });
  assert.ok(suv >= 80);
});

test('computeAnnualKmFit prefers lower km for moderate annual usage', () => {
  const low = computeAnnualKmFit({ km: 40000 }, bmwListing, { annual_km: 12000 });
  const high = computeAnnualKmFit({ km: 200000 }, riskyListing, { annual_km: 30000 });
  assert.ok(low > high);
});

test('computePriorityFit low_risk uses risk fit', () => {
  const fits = { budget_fit: 50, risk_fit: 90, quality_fit: 50, executive_fit: 50, price_fit: 50, market_fit: 50, usage_fit: 50 };
  assert.equal(computePriorityFit({}, bmwListing, { priority: 'low_risk' }, fits), 90);
});

// --- LABELS ---

test('getRecommendationLabel Çok uygun for 90+', () => assert.equal(getRecommendationLabel(92), 'Çok uygun'));
test('getRecommendationLabel Uygun for 75-89', () => assert.equal(getRecommendationLabel(80), 'Uygun'));
test('getRecommendationLabel İncelenebilir for 60-74', () => assert.equal(getRecommendationLabel(65), 'İncelenebilir'));
test('getRecommendationLabel Dikkatli incelenmeli for 40-59', () => assert.equal(getRecommendationLabel(50), 'Dikkatli incelenmeli'));
test('getRecommendationLabel Önerilmez for below 40', () => assert.equal(getRecommendationLabel(20), 'Önerilmez'));

// --- COMPUTE FIT SCORE ---

test('computeFitScore returns clamped score and breakdown', () => {
  const record = {
    id: bmwListing.id,
    title: bmwListing.title,
    brand: 'BMW',
    model: '320i',
    price: 1780000,
    quality_score: 88,
    risk_score: 28,
    decision_score: 82,
    duplicate_status: 'new'
  };
  const result = computeFitScore(record, bmwListing, profile);
  assert.ok(result.fit_score >= 0 && result.fit_score <= 100);
  assert.ok(result.breakdown.budget_fit > 0);
  assert.ok(result.recommendation_label);
});

test('computeFitScore applies duplicate penalty', () => {
  const record = {
    price: 1780000,
    quality_score: 88,
    risk_score: 28,
    decision_score: 82,
    duplicate_status: 'exact'
  };
  const result = computeFitScore(record, bmwListing, profile);
  assert.equal(result.breakdown.duplicate_penalty, FIT_WEIGHTS.duplicate_penalty);
});

// --- ALTERNATIVE RANKER ---

test('rankTopRecommendations returns top 5', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, profile);
  assert.ok(result.top.length <= 5);
  assert.ok(result.top.length > 0);
});

test('assignAlternativeTags sets best_match', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, profile);
  assert.ok(result.alternative_tags.best_match);
});

test('assignAlternativeTags sets lowest_risk', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, profile);
  assert.ok(result.alternative_tags.lowest_risk);
});

test('assignAlternativeTags sets best_value', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, profile);
  assert.ok(result.alternative_tags.best_value);
});

test('assignAlternativeTags sets budget_friendly', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, profile);
  assert.ok(result.alternative_tags.budget_friendly);
});

test('assignAlternativeTags sets premium_choice', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, profile);
  assert.ok(result.alternative_tags.premium_choice);
});

test('resolveItemAlternativeTags maps labels', () => {
  const tags = assignAlternativeTags([{ id: '1', fit_score: 90, risk_score: 20, price: 100, quality_score: 95 }]);
  const alt = resolveItemAlternativeTags({ id: '1' }, tags);
  assert.ok(alt.includes('best_match'));
  assert.ok(ALTERNATIVE_TAG_LABELS_TR.best_match);
});

test('rankTopRecommendations sorts by fit_score desc', () => {
  const rows = [{ id: '1', fit_score: 60 }, { id: '2', fit_score: 90 }];
  const sorted = rankTopRecommendations(rows, 2);
  assert.equal(sorted[0].id, '2');
});

// --- EXPLAINABILITY ---

test('buildRecommendationExplanation returns reasons and risks', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, profile);
  const item = result.top[0];
  const explanation = buildRecommendationExplanation(item);
  assert.ok(Array.isArray(explanation.reasons));
  assert.ok(explanation.reasons_text.includes('✓'));
});

test('risky listing may include photo warning', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine([riskyListing], { ...profile, city: 'Ankara' });
  const item = result.top[0];
  assert.ok(item);
  assert.ok(item.risks?.some((r) => r.includes('Fotoğraf') || r.includes('Risk')));
});

// --- SUMMARY ---

test('buildRecommendationSummary uses safe Turkish phrasing', () => {
  const summary = buildRecommendationSummary({ title: 'BMW 320i', recommendation_label: 'Uygun', risk_score: 30, quality_score: 80, price: 1780000 }, profile);
  assert.match(summary, /mevcut bilgiler ışığında/i);
  assert.match(summary, /doğrulama.*önerilir/i);
});

test('sanitizeSummaryText blocks forbidden wording', () => {
  const sanitized = sanitizeSummaryText('Bu araç kesinlikle alın ve garanti kazandırır.');
  assert.ok(!sanitized.toLowerCase().includes('kesinlikle alın'));
  assert.ok(!sanitized.toLowerCase().includes('garanti'));
});

test('FORBIDDEN_PHRASES includes required banned terms', () => {
  for (const phrase of ['garanti', 'yatırım tavsiyesi', 'kazandırır']) {
    assert.ok(FORBIDDEN_PHRASES.some((p) => p.includes(phrase)));
  }
});

// --- ENGINE ---

test('runRecommendationEngine returns top recommendations for profile', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, profile);
  assert.ok(result.top.length > 0);
  assert.ok(result.summary);
  assert.equal(result.profile.category, 'vehicle');
});

test('runRecommendationEngine empty repository behavior', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine([], profile);
  assert.equal(result.top.length, 0);
  assert.match(result.summary, /yeterli kayıt/i);
});

test('runRecommendationEngine missing fields uses fallback', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, { category: 'vehicle' });
  assert.ok(result.top.length > 0);
});

test('runRecommendationEngine 10k performance guard', () => {
  clearRecommendationMemoCache();
  const large = Array.from({ length: 10000 }, (_, index) => ({
    ...bmwListing,
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    price: 1500000 + index * 1000
  }));
  const started = Date.now();
  const result = runRecommendationEngine(large, profile);
  const elapsed = Date.now() - started;
  assert.ok(result.top.length > 0);
  assert.ok(elapsed < 20000, `too slow: ${elapsed}ms`);
});

// --- ADMIN UI ---

test('buildRecommendationProfileFormHtml renders all fields', () => {
  const html = buildRecommendationProfileFormHtml(profile);
  assert.match(html, /Bütçe/);
  assert.match(html, /Öncelik/);
  assert.match(html, /Öneri üret/);
});

test('buildRecommendationsDashboardHtml renders before generate', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: false });
  assert.match(html, /Öneriler/);
  assert.match(html, /Profil bilgilerini doldurup/);
});

test('buildRecommendationsDashboardHtml renders results after generate', () => {
  const { html, result } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.ok(result?.top.length > 0);
  assert.match(html, /AI Öneri Özeti/);
  assert.match(html, /Neden önerildi/);
});

test('buildRecommendationCardHtml renders fit score and label', () => {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, profile);
  const html = buildRecommendationCardHtml(result.top[0]);
  assert.match(html, /Uyum Skoru/);
  assert.match(html, /Neden önerildi/);
});

test('buildRecommendationCardsGridHtml empty state', () => {
  const html = buildRecommendationCardsGridHtml([]);
  assert.match(html, /öneri bulunamadı/i);
});

test('buildRecommendationSummaryHtml escapes output', () => {
  const html = buildRecommendationSummaryHtml('<script>x</script>');
  assert.ok(!html.includes('<script>'));
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /resource: 'listings'/);
  assert.doesNotMatch(router, /recommendation/i);
});

test('guard: no schema change for recommendation tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /ai_listing_recommendation/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_listings/i);
});

test('guard: admin html has recommendations view tab', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /data-admin-view="recommendations"/);
  assert.match(html, /Öneriler/);
});

test('guard: shared recommendation module exists', () => {
  const enginePath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/recommendation/recommendation-engine.js');
  assert.ok(fs.existsSync(enginePath));
});

test('guard: client recommendation module exists', () => {
  const clientPath = path.join(process.cwd(), 'js/ai-recommendation-engine/index.js');
  assert.ok(fs.existsSync(clientPath));
});
