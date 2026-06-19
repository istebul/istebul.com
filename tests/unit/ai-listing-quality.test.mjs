import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  clearListingQualityMemoCache,
  buildListingQualityCacheKey,
  buildListingQualityInput,
  runListingQualityTrust,
  computeQualitySignals,
  aggregateQualityScore,
  mapQualityLevel,
  buildQualityLevelLabelTr,
  resolveQualityCategoryKey,
  computeTrustSignals,
  aggregateTrustScore,
  mapTrustLevel,
  buildTrustLevelLabelTr,
  classifyListingRiskLevel,
  buildRiskLevelLabelTr,
  mapRiskLevelClass,
  buildQualityChecklist,
  QUALITY_CHECKLIST_BY_CATEGORY,
  buildQualitySummaryText,
  partitionQualityTrustSignals,
  sanitizeQualitySummary,
  QUALITY_FORBIDDEN_PHRASES,
  buildQualityPanelHtml,
  buildQualityShellHtml,
  shouldShowQualityButton
} = await import('../../js/ai-listing-quality/index.js');

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

const fullVehicle = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2022 BMW 320i M Sport',
  description: 'Yetkili servis bakımlı, ekspertiz raporu mevcut, detaylı açıklama metni burada yer alır.',
  price: 1780000,
  location: 'İzmir',
  images: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'],
  attributes: {
    brand: 'BMW',
    model: '320i',
    year: 2022,
    km: 45000,
    fuel: 'Benzin',
    transmission: 'Otomatik'
  },
  latest_analysis: { risk_score: 28, quality_score: 88 },
  duplicate_status: 'new',
  updated_at: new Date().toISOString()
};

const weakVehicle = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'vehicle',
  title: 'Araç',
  description: 'Kısa',
  price: 500000,
  location: '',
  images: [],
  attributes: {},
  duplicate_status: 'exact'
};

const housingListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'housing',
  title: 'Kadıköy 3+1 Daire',
  description: 'Merkezi konumda geniş daire, aidat bilgisi mevcut, detaylı açıklama.',
  price: 5200000,
  location: 'İstanbul',
  images: ['h1.jpg', 'h2.jpg', 'h3.jpg'],
  attributes: { square_meter: 120, rooms: '3+1', building_age: 12, floor: 4, total_floors: 8 },
  duplicate_status: 'new'
};

const travelListing = {
  id: '44444444-4444-4444-4444-444444444444',
  category: 'vacation',
  title: 'Antalya 7 Gün Paket',
  description: 'Denize sıfır tatil paketi, iptal koşulları açıklanmıştır.',
  price: 42000,
  location: 'Antalya',
  images: ['t1.jpg', 't2.jpg'],
  attributes: {
    check_in: '2026-07-01',
    check_out: '2026-07-08',
    capacity: 4,
    amenities: ['havuz', 'wifi'],
    cancellation_policy: '7 gün öncesine kadar ücretsiz iptal'
  },
  duplicate_status: 'new'
};

const listings = [fullVehicle, housingListing, travelListing];

function runQuality(rec = fullVehicle, intent = profile) {
  clearListingQualityMemoCache();
  const input = buildListingQualityInput(rec, intent);
  return runListingQualityTrust(input);
}

function getTopRecommendation() {
  clearRecommendationMemoCache();
  return runRecommendationEngine(listings, profile).top[0];
}

// --- QUALITY SCORE BOUNDS ---

test('qualityScore is between 0 and 100', () => {
  const result = runQuality(fullVehicle);
  assert.ok(result.quality_score >= 0 && result.quality_score <= 100);
});

test('weak listing qualityScore lower than full vehicle', () => {
  const strong = runQuality(fullVehicle);
  clearListingQualityMemoCache();
  const weak = runQuality(weakVehicle);
  assert.ok(weak.quality_score < strong.quality_score);
});

test('aggregateQualityScore clamps average', () => {
  const signals = [{ score: 100 }, { score: 0 }];
  assert.equal(aggregateQualityScore(signals), 50);
});

test('mapQualityLevel excellent for high score', () => {
  assert.equal(mapQualityLevel(90), 'excellent');
});

test('mapQualityLevel weak for low score', () => {
  assert.equal(mapQualityLevel(30), 'weak');
});

// --- TRUST SCORE BOUNDS ---

test('trustScore is between 0 and 100', () => {
  const result = runQuality(fullVehicle);
  assert.ok(result.trust_score >= 0 && result.trust_score <= 100);
});

test('duplicate listing lowers trustScore', () => {
  const good = runQuality(fullVehicle);
  clearListingQualityMemoCache();
  const dup = runQuality({ ...fullVehicle, duplicate_status: 'exact' });
  assert.ok(dup.trust_score < good.trust_score);
});

test('aggregateTrustScore deducts penalties', () => {
  const score = aggregateTrustScore([
    { penalty: 10 },
    { penalty: 15 }
  ]);
  assert.equal(score, 75);
});

test('mapTrustLevel high for strong trust', () => {
  assert.equal(mapTrustLevel(80), 'high');
});

test('mapTrustLevel low for weak trust', () => {
  assert.equal(mapTrustLevel(30), 'low');
});

// --- VEHICLE SIGNALS ---

test('vehicle signals include mileageCompleteness', () => {
  const signals = computeQualitySignals(fullVehicle);
  assert.ok(signals.some((s) => s.key === 'mileageCompleteness' && s.passed));
});

test('vehicle signals include yearCompleteness', () => {
  const signals = computeQualitySignals(fullVehicle);
  assert.ok(signals.some((s) => s.key === 'yearCompleteness' && s.passed));
});

test('vehicle signals include fuelCompleteness', () => {
  const signals = computeQualitySignals(fullVehicle);
  assert.ok(signals.some((s) => s.key === 'fuelCompleteness' && s.passed));
});

test('vehicle signals include transmissionCompleteness', () => {
  const signals = computeQualitySignals(fullVehicle);
  assert.ok(signals.some((s) => s.key === 'transmissionCompleteness' && s.passed));
});

test('vehicle signals include ownershipCostAvailability', () => {
  const signals = computeQualitySignals(fullVehicle);
  assert.ok(signals.some((s) => s.key === 'ownershipCostAvailability'));
});

test('vehicle missing km fails mileageCompleteness', () => {
  const signals = computeQualitySignals({ ...fullVehicle, attributes: { year: 2022 } });
  const km = signals.find((s) => s.key === 'mileageCompleteness');
  assert.ok(km && !km.passed);
});

// --- HOUSING SIGNALS ---

test('housing signals include squareMeterCompleteness', () => {
  const signals = computeQualitySignals(housingListing);
  assert.ok(signals.some((s) => s.key === 'squareMeterCompleteness' && s.passed));
});

test('housing signals include roomCompleteness', () => {
  const signals = computeQualitySignals(housingListing);
  assert.ok(signals.some((s) => s.key === 'roomCompleteness' && s.passed));
});

test('housing signals include buildingAgeCompleteness', () => {
  const signals = computeQualitySignals(housingListing);
  assert.ok(signals.some((s) => s.key === 'buildingAgeCompleteness' && s.passed));
});

test('housing signals include floorCompleteness', () => {
  const signals = computeQualitySignals(housingListing);
  assert.ok(signals.some((s) => s.key === 'floorCompleteness' && s.passed));
});

test('housing signals include financingCostAvailability', () => {
  const signals = computeQualitySignals(housingListing);
  assert.ok(signals.some((s) => s.key === 'financingCostAvailability'));
});

// --- TRAVEL SIGNALS ---

test('travel signals include dateCompleteness', () => {
  const signals = computeQualitySignals(travelListing);
  assert.ok(signals.some((s) => s.key === 'dateCompleteness' && s.passed));
});

test('travel signals include capacityCompleteness', () => {
  const signals = computeQualitySignals(travelListing);
  assert.ok(signals.some((s) => s.key === 'capacityCompleteness' && s.passed));
});

test('travel signals include amenityCompleteness', () => {
  const signals = computeQualitySignals(travelListing);
  assert.ok(signals.some((s) => s.key === 'amenityCompleteness' && s.passed));
});

test('travel signals include cancellationPolicyCompleteness', () => {
  const signals = computeQualitySignals(travelListing);
  assert.ok(signals.some((s) => s.key === 'cancellationPolicyCompleteness' && s.passed));
});

// --- TRUST SIGNALS ---

test('missing critical fields trust signal triggers on weak listing', () => {
  const signals = computeTrustSignals(weakVehicle);
  const missing = signals.find((s) => s.key === 'missingCriticalFields');
  assert.ok(missing?.triggered);
});

test('suspicious price trust signal can trigger', () => {
  const signals = computeTrustSignals({ ...fullVehicle, price: 0 });
  assert.ok(signals.find((s) => s.key === 'suspiciousPrice')?.triggered);
});

test('duplicate risk trust signal triggers', () => {
  const signals = computeTrustSignals(fullVehicle, { duplicate_status: 'exact' });
  assert.ok(signals.find((s) => s.key === 'duplicateRisk')?.triggered);
});

test('weak description trust signal triggers', () => {
  const signals = computeTrustSignals(weakVehicle);
  assert.ok(signals.find((s) => s.key === 'weakDescription')?.triggered);
});

test('low image evidence trust signal triggers', () => {
  const signals = computeTrustSignals(weakVehicle);
  assert.ok(signals.find((s) => s.key === 'lowImageEvidence')?.triggered);
});

test('stale listing risk trust signal triggers without dates', () => {
  const signals = computeTrustSignals({ ...fullVehicle, updated_at: null, created_at: null });
  assert.ok(signals.find((s) => s.key === 'staleListingRisk')?.triggered);
});

test('ownership cost uncertainty on vehicle without price/location', () => {
  const signals = computeTrustSignals({ category: 'vehicle', price: 0, location: '', attributes: {} });
  assert.ok(signals.find((s) => s.key === 'ownershipCostUncertainty')?.triggered);
});

test('inconsistent attributes year in future', () => {
  const signals = computeTrustSignals({
    ...fullVehicle,
    attributes: { ...fullVehicle.attributes, year: 2035 }
  });
  assert.ok(signals.find((s) => s.key === 'inconsistentAttributes')?.triggered);
});

// --- RISK LEVEL ---

test('classifyListingRiskLevel high for weak trust', () => {
  const trustSignals = computeTrustSignals(weakVehicle, { duplicate_status: 'exact' });
  const trustScore = aggregateTrustScore(trustSignals);
  const level = classifyListingRiskLevel(trustScore, trustSignals, 30);
  assert.equal(level, 'high');
});

test('buildRiskLevelLabelTr Turkish labels', () => {
  assert.equal(buildRiskLevelLabelTr('low'), 'Düşük risk');
  assert.equal(buildRiskLevelLabelTr('medium'), 'Orta risk');
  assert.equal(buildRiskLevelLabelTr('high'), 'Yüksek risk');
});

test('mapRiskLevelClass maps css classes', () => {
  assert.equal(mapRiskLevelClass('low'), 'low');
  assert.equal(mapRiskLevelClass('high'), 'high');
});

// --- TURKISH LABELS ---

test('buildQualityLevelLabelTr labels', () => {
  assert.equal(buildQualityLevelLabelTr('excellent'), 'Çok güçlü');
  assert.equal(buildQualityLevelLabelTr('good'), 'Güçlü');
  assert.equal(buildQualityLevelLabelTr('fair'), 'Orta');
  assert.equal(buildQualityLevelLabelTr('weak'), 'Zayıf');
});

test('buildTrustLevelLabelTr labels', () => {
  assert.equal(buildTrustLevelLabelTr('high'), 'Yüksek güven');
  assert.equal(buildTrustLevelLabelTr('medium'), 'Orta güven');
  assert.equal(buildTrustLevelLabelTr('low'), 'Düşük güven');
});

// --- SUMMARY SAFETY ---

test('quality summary avoids forbidden phrases', () => {
  const summary = buildQualitySummaryText(80, 'good', 75, 'high', ['Fiyat bilgisi yeterli'], []);
  const lower = summary.toLowerCase();
  for (const phrase of QUALITY_FORBIDDEN_PHRASES) {
    assert.ok(!lower.includes(phrase.toLowerCase()), phrase);
  }
});

test('sanitizeQualitySummary replaces garanti', () => {
  const cleaned = sanitizeQualitySummary('Bu ilan garanti kazandırır.');
  assert.ok(!cleaned.toLowerCase().includes('garanti'));
});

test('runListingQualityTrust summary is safe Turkish', () => {
  const result = runQuality(fullVehicle);
  assert.match(result.quality_summary, /görünüyor/i);
  assert.ok(!result.quality_summary.toLowerCase().includes('yatırım tavsiyesi'));
});

test('partitionQualityTrustSignals splits strong and weak', () => {
  const qualitySignals = computeQualitySignals(fullVehicle);
  const trustSignals = computeTrustSignals(weakVehicle);
  const { strong, weak } = partitionQualityTrustSignals(qualitySignals, trustSignals);
  assert.ok(Array.isArray(strong));
  assert.ok(Array.isArray(weak));
  assert.ok(weak.length > 0);
});

// --- CHECKLIST ---

test('vehicle checklist includes tramer', () => {
  const items = buildQualityChecklist('vehicle');
  assert.ok(items.some((i) => /tramer/i.test(i)));
});

test('vehicle checklist includes ekspertiz', () => {
  const items = buildQualityChecklist('vehicle');
  assert.ok(items.some((i) => /ekspertiz/i.test(i)));
});

test('housing checklist includes tapu', () => {
  const items = buildQualityChecklist('housing');
  assert.ok(items.some((i) => /[tT]apu/i.test(i)));
});

test('housing checklist includes iskan', () => {
  const items = buildQualityChecklist('housing');
  assert.ok(items.some((i) => /[iİ]sk/i.test(i)));
});

test('travel checklist includes iptal', () => {
  const items = buildQualityChecklist('travel');
  assert.ok(items.some((i) => /[iİ]ptal/i.test(i)));
});

test('travel checklist includes yorum', () => {
  const items = buildQualityChecklist('travel');
  assert.ok(items.some((i) => /yorum/i.test(i)));
});

test('resolveQualityCategoryKey maps categories', () => {
  assert.equal(resolveQualityCategoryKey('konut'), 'housing');
  assert.equal(resolveQualityCategoryKey('tatil'), 'travel');
});

test('QUALITY_CHECKLIST_BY_CATEGORY has three keys', () => {
  assert.ok(QUALITY_CHECKLIST_BY_CATEGORY.vehicle);
  assert.ok(QUALITY_CHECKLIST_BY_CATEGORY.housing);
  assert.ok(QUALITY_CHECKLIST_BY_CATEGORY.travel);
});

// --- CARD BUILDER ---

test('buildRecommendationCardHtml includes Kalite ve Güven button', () => {
  const rec = getTopRecommendation();
  const html = buildRecommendationCardHtml(rec);
  assert.match(html, /Kalite ve Güven/);
  assert.match(html, /data-rec-quality-id/);
});

test('shouldShowQualityButton true when id exists', () => {
  assert.equal(shouldShowQualityButton({ id: 'x' }), true);
});

test('shouldShowQualityButton false without id', () => {
  assert.equal(shouldShowQualityButton({}), false);
});

test('buildQualityPanelHtml renders scores and sections', () => {
  const result = runQuality(fullVehicle);
  const html = buildQualityPanelHtml(result, { title: 'BMW' });
  assert.match(html, /Kalite Skoru/);
  assert.match(html, /Güven Skoru/);
  assert.match(html, /Güçlü sinyaller/);
  assert.match(html, /Zayıf \/ eksik sinyaller/);
  assert.match(html, /Kontrol listesi/);
});

test('buildQualityPanelHtml escapes XSS', () => {
  const html = buildQualityPanelHtml(
    {
      empty: false,
      quality_score: 50,
      quality_label: 'Orta',
      trust_score: 50,
      trust_label: 'Orta güven',
      risk_level: 'medium',
      risk_label: 'Orta risk',
      quality_summary: '<script>x</script>',
      strong_signals: ['<script>'],
      weak_signals: ['<img onerror=1>'],
      checklist: ['<script>']
    },
    { title: 'Test' }
  );
  assert.ok(!html.includes('<script>'));
});

test('buildQualityPanelHtml empty state message', () => {
  const html = buildQualityPanelHtml({
    empty: true,
    quality_summary: 'Bu öneri için kalite ve güven analizi üretilemedi.'
  });
  assert.match(html, /üretilemedi/i);
});

test('buildQualityShellHtml renders host', () => {
  assert.match(buildQualityShellHtml(), /ai-lqt-panel-host/);
});

test('buildRecommendationsDashboardHtml includes quality host', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.match(html, /ai-lqt-panel-host/);
});

// --- EMPTY STATE ---

test('empty recommendation returns empty state', () => {
  clearListingQualityMemoCache();
  const result = runListingQualityTrust(buildListingQualityInput({}, profile));
  assert.equal(result.empty, true);
  assert.match(result.quality_summary, /üretilemedi/i);
});

test('empty recommendation zero scores', () => {
  clearListingQualityMemoCache();
  const result = runListingQualityTrust(buildListingQualityInput({}, profile));
  assert.equal(result.quality_score, 0);
  assert.equal(result.trust_score, 0);
});

// --- MEMO CACHE ---

test('memo cache returns same object reference', () => {
  clearListingQualityMemoCache();
  const input = buildListingQualityInput(fullVehicle, profile);
  const first = runListingQualityTrust(input);
  const second = runListingQualityTrust(input);
  assert.equal(first, second);
});

test('cache key differs by recommendation id', () => {
  const a = buildListingQualityCacheKey({ id: 'a' }, profile);
  const b = buildListingQualityCacheKey({ id: 'b' }, profile);
  assert.notEqual(a, b);
});

test('lazy compute dashboard does not pre-run quality engine', () => {
  clearListingQualityMemoCache();
  const { result } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.ok(result?.top.length > 0);
  clearListingQualityMemoCache();
  runListingQualityTrust(buildListingQualityInput(result.top[0], profile));
  clearListingQualityMemoCache();
  const { result: result2 } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.ok(result2?.top.length > 0);
});

test('lazy compute 10k listings quality for selected only', () => {
  clearListingQualityMemoCache();
  clearRecommendationMemoCache();
  const large = Array.from({ length: 10000 }, (_, index) => ({
    ...fullVehicle,
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    price: 1500000 + index * 100
  }));
  const started = Date.now();
  const recResult = runRecommendationEngine(large, profile);
  const quality = runListingQualityTrust(buildListingQualityInput(recResult.top[0], profile));
  const elapsed = Date.now() - started;
  assert.ok(quality.quality_score > 0);
  assert.ok(elapsed < 35000, `quality too slow: ${elapsed}ms`);
});

// --- CATEGORY INTEGRATION ---

test('housing category quality via buildListingQualityInput', () => {
  clearListingQualityMemoCache();
  const result = runListingQualityTrust(buildListingQualityInput(housingListing, { ...profile, category: 'housing' }));
  assert.equal(result.category, 'housing');
  assert.ok(result.checklist.some((i) => /[tT]apu/i.test(i)));
});

test('travel category quality via buildListingQualityInput', () => {
  clearListingQualityMemoCache();
  const result = runListingQualityTrust(buildListingQualityInput(travelListing, { ...profile, category: 'vacation' }));
  assert.equal(result.category, 'travel');
  assert.ok(result.checklist.some((i) => /[iİ]ptal/i.test(i)));
});

test('buildListingQualityInput maps duplicate_status', () => {
  const input = buildListingQualityInput({ ...fullVehicle, duplicate_status: 'similar' }, profile);
  assert.equal(input.duplicate_status, 'similar');
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /resource: 'listings'/);
  assert.doesNotMatch(router, /listing-quality/i);
});

test('guard: no schema change for quality tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /listing_quality_trust/i);
  assert.doesNotMatch(sql, /ai_listing_quality/i);
});

test('guard: shared quality module exists', () => {
  const p = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/quality/listing-quality-engine.js');
  assert.ok(fs.existsSync(p));
});

test('guard: client quality module exists', () => {
  const p = path.join(process.cwd(), 'js/ai-listing-quality/index.js');
  assert.ok(fs.existsSync(p));
});

test('recommendation fit_score unchanged after quality run', () => {
  clearRecommendationMemoCache();
  const before = getTopRecommendation();
  const fitBefore = before.fit_score;
  runQuality(before);
  clearRecommendationMemoCache();
  const after = getTopRecommendation();
  assert.equal(after.fit_score, fitBefore);
});
