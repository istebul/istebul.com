import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  clearPurchaseDecisionMemoCache,
  buildPurchaseDecisionCacheKey,
  buildPurchaseDecisionInput,
  runPurchaseDecisionEngine,
  DECISION_WEIGHTS,
  extractPurchaseSignals,
  detectMissingCriticalFields,
  detectStaleListingRisk,
  computeDecisionScore,
  computeConfidenceScore,
  buildDecisionStrength,
  buildConfidenceMeta,
  buildPositiveFactors,
  buildRiskFactors,
  buildMissingInfoImpact,
  computePotentialDecisionLift,
  resolveImpactLevel,
  NEGOTIATION_DISCOUNT_RATES,
  computeAdjustedPrice,
  estimateDecisionScoreAfterDiscount,
  buildNegotiationScenarios,
  buildWaitScenario,
  PURCHASE_DECISION_FORBIDDEN_PHRASES,
  DECISION_LEVEL_LABELS,
  CONFIDENCE_LEVEL_LABELS,
  RISK_LEVEL_LABELS,
  PRIMARY_ACTION_LABELS,
  resolveDecisionLevel,
  resolveConfidenceLevel,
  resolveRiskLevel,
  resolvePrimaryAction,
  sanitizePurchaseDecisionText,
  containsForbiddenPurchasePhrase,
  buildPurchaseDecisionSummary,
  buildCategoryNextSteps,
  buildExecutiveDecisionPanelHtml,
  buildExecutiveDecisionShellHtml
} = await import('../../js/ai-purchase-decision/index.js');

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
  description: 'Yetkili servis bakımlı, tramer kaydı temiz, ekspertiz yapıldı',
  price: 1780000,
  currency: 'TRY',
  location: 'İzmir',
  source_type: 'manual',
  source_url: 'https://example.com/bmw',
  status: 'approved',
  images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
  attributes: { brand: 'BMW', model: '320i', year: 2022, km: 45000, body_type: 'sedan' },
  latest_analysis: { ai_score: 82, risk_score: 28, quality_score: 88, decision_score: 82 },
  updated_at: new Date().toISOString()
};

const housingListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'housing',
  title: 'Kadıköy 3+1 Daire',
  description: 'Tapu kat mülkiyeti, iskan mevcut, aidat 2500 TL, deprem dayanımı yüksek',
  price: 5200000,
  location: 'İstanbul',
  images: ['h1.jpg', 'h2.jpg'],
  latest_analysis: { risk_score: 35, quality_score: 75, decision_score: 70 },
  updated_at: new Date().toISOString()
};

const travelListing = {
  id: '44444444-4444-4444-4444-444444444444',
  category: 'vacation',
  title: 'Antalya 7 Gün Paket',
  description: 'İptal koşulları esnek, iade mümkün',
  price: 42000,
  location: 'Antalya',
  images: ['t1.jpg'],
  attributes: { date: '2026-07-01', capacity: 4 },
  latest_analysis: { risk_score: 22, quality_score: 80, decision_score: 78 },
  updated_at: new Date().toISOString()
};

const sparseListing = {
  id: '55555555-5555-5555-5555-555555555555',
  category: 'vehicle',
  title: 'Eksik',
  price: 500000,
  updated_at: '2024-01-01T00:00:00.000Z'
};

const listings = [bmwListing, housingListing, travelListing, sparseListing];

function getTopRecommendation(cat = 'vehicle') {
  clearRecommendationMemoCache();
  const p = { ...profile, category: cat };
  const result = runRecommendationEngine(listings, p);
  return result.top.find((item) => String(item.category).includes(cat === 'vehicle' ? 'vehicle' : cat)) ?? result.top[0];
}

function runPd(rec = null, intent = profile) {
  clearPurchaseDecisionMemoCache();
  const recommendation = rec ?? getTopRecommendation();
  const input = buildPurchaseDecisionInput(recommendation, intent);
  return runPurchaseDecisionEngine(input);
}

// --- DECISION SCORE BOUNDS ---

test('decisionScore is between 0 and 100', () => {
  const pd = runPd();
  assert.ok(pd.decisionScore >= 0 && pd.decisionScore <= 100);
});

test('decisionScore clamps negative input', () => {
  const signals = { recommendationScore: -10, qualityScore: -5, trustScore: 0, negotiationSignal: 0, ownershipCostSignal: 0, missingInfoPenalty: 100, riskPenalty: 100 };
  assert.equal(computeDecisionScore(signals), 0);
});

test('decisionScore clamps above 100', () => {
  const signals = { recommendationScore: 100, qualityScore: 100, trustScore: 100, negotiationSignal: 100, ownershipCostSignal: 100, missingInfoPenalty: 0, riskPenalty: 0 };
  assert.equal(computeDecisionScore(signals), 100);
});

test('decisionScore uses weighted formula', () => {
  const signals = { recommendationScore: 80, qualityScore: 70, trustScore: 60, negotiationSignal: 50, ownershipCostSignal: 40, missingInfoPenalty: 20, riskPenalty: 10 };
  const expected = Math.round(
    80 * DECISION_WEIGHTS.recommendation +
    70 * DECISION_WEIGHTS.quality +
    60 * DECISION_WEIGHTS.trust +
    50 * DECISION_WEIGHTS.negotiation +
    40 * DECISION_WEIGHTS.ownershipCost +
    80 * DECISION_WEIGHTS.missingInfo +
    90 * DECISION_WEIGHTS.riskPenalty
  );
  assert.equal(computeDecisionScore(signals), expected);
});

// --- DECISION LEVEL THRESHOLDS ---

test('resolveDecisionLevel strong_buy_candidate at 85', () => {
  assert.equal(resolveDecisionLevel(85), 'strong_buy_candidate');
  assert.equal(resolveDecisionLevel(100), 'strong_buy_candidate');
});

test('resolveDecisionLevel buy_candidate at 72-84', () => {
  assert.equal(resolveDecisionLevel(72), 'buy_candidate');
  assert.equal(resolveDecisionLevel(84), 'buy_candidate');
});

test('resolveDecisionLevel negotiate_first at 58-71', () => {
  assert.equal(resolveDecisionLevel(58), 'negotiate_first');
  assert.equal(resolveDecisionLevel(71), 'negotiate_first');
});

test('resolveDecisionLevel wait at 42-57', () => {
  assert.equal(resolveDecisionLevel(42), 'wait');
  assert.equal(resolveDecisionLevel(57), 'wait');
});

test('resolveDecisionLevel avoid below 42', () => {
  assert.equal(resolveDecisionLevel(41), 'avoid');
  assert.equal(resolveDecisionLevel(0), 'avoid');
});

test('purchaseDecision decisionLevel matches score thresholds', () => {
  const strength = buildDecisionStrength(86, 30);
  assert.equal(strength.decisionLevel, 'strong_buy_candidate');
  assert.equal(strength.decisionLabel, 'Güçlü al adayı');
});

// --- CONFIDENCE SCORE ---

test('confidenceScore is between 0 and 100', () => {
  const pd = runPd();
  assert.ok(pd.confidenceScore >= 0 && pd.confidenceScore <= 100);
});

test('computeConfidenceScore rewards complete data', () => {
  const full = computeConfidenceScore({
    qualityCompleteness: 90,
    trustScore: 85,
    hasPriceEvidence: true,
    hasImageEvidence: true,
    hasOwnershipCostData: true,
    hasNegotiationData: true,
    missingCritical: []
  });
  const sparse = computeConfidenceScore({
    qualityCompleteness: 30,
    trustScore: 40,
    hasPriceEvidence: false,
    hasImageEvidence: false,
    hasOwnershipCostData: false,
    hasNegotiationData: false,
    missingCritical: ['Kilometre', 'Tramer']
  });
  assert.ok(full > sparse);
});

test('missing data produces lower confidence', () => {
  const pd = runPd(sparseListing);
  const good = runPd(bmwListing);
  assert.ok(pd.confidenceScore < good.confidenceScore);
});

// --- CONFIDENCE LEVEL THRESHOLDS ---

test('resolveConfidenceLevel high at 80+', () => {
  assert.equal(resolveConfidenceLevel(80), 'high');
  assert.equal(resolveConfidenceLevel(100), 'high');
});

test('resolveConfidenceLevel medium at 55-79', () => {
  assert.equal(resolveConfidenceLevel(55), 'medium');
  assert.equal(resolveConfidenceLevel(79), 'medium');
});

test('resolveConfidenceLevel low below 55', () => {
  assert.equal(resolveConfidenceLevel(54), 'low');
  assert.equal(resolveConfidenceLevel(0), 'low');
});

test('confidenceLabel is Turkish', () => {
  const meta = buildConfidenceMeta(85);
  assert.equal(meta.confidenceLabel, CONFIDENCE_LEVEL_LABELS.high);
  assert.match(meta.confidenceLabel, /veri güveni/);
});

// --- PRIMARY ACTION MAPPING ---

test('resolvePrimaryAction buy for strong_buy_candidate', () => {
  assert.equal(resolvePrimaryAction('strong_buy_candidate'), 'buy');
});

test('resolvePrimaryAction buy for buy_candidate', () => {
  assert.equal(resolvePrimaryAction('buy_candidate'), 'buy');
});

test('resolvePrimaryAction negotiate for negotiate_first', () => {
  assert.equal(resolvePrimaryAction('negotiate_first'), 'negotiate');
});

test('resolvePrimaryAction wait for wait', () => {
  assert.equal(resolvePrimaryAction('wait'), 'wait');
});

test('resolvePrimaryAction avoid for avoid', () => {
  assert.equal(resolvePrimaryAction('avoid'), 'avoid');
});

test('primaryActionLabel is Turkish', () => {
  const pd = runPd();
  assert.ok(Object.values(PRIMARY_ACTION_LABELS).includes(pd.primaryActionLabel));
});

// --- FALLBACKS ---

test('missing quality fallback uses quality engine', () => {
  const input = buildPurchaseDecisionInput({ ...sparseListing, quality_score: null }, profile);
  const signals = extractPurchaseSignals(input);
  assert.ok(signals.qualityScore >= 0);
});

test('missing trust fallback derives from quality and risk', () => {
  const input = buildPurchaseDecisionInput({ ...bmwListing, trust_score: null }, profile);
  const signals = extractPurchaseSignals(input);
  assert.ok(signals.trustScore >= 0 && signals.trustScore <= 100);
});

test('missing negotiation fallback uses price intelligence', () => {
  const input = buildPurchaseDecisionInput(
    { ...bmwListing, negotiation_intelligence: null, price_intelligence: { deviation_pct: -12 } },
    profile
  );
  const signals = extractPurchaseSignals(input);
  assert.ok(signals.negotiationSignal > 0);
});

test('missing ownership cost fallback defaults to 50', () => {
  const input = buildPurchaseDecisionInput({ ...bmwListing, ownership_cost: null }, profile);
  const signals = extractPurchaseSignals(input);
  assert.equal(signals.ownershipCostSignal, 50);
});

test('ownership cost signal uses cost_risk_level when available', () => {
  const input = buildPurchaseDecisionInput(
    { ...bmwListing, ownership_cost: { cost_risk_level: 'low' } },
    profile
  );
  const signals = extractPurchaseSignals(input);
  assert.equal(signals.ownershipCostSignal, 78);
});

test('listing_quality trustScore used when available', () => {
  const input = buildPurchaseDecisionInput(
    { ...bmwListing, listing_quality: { qualityScore: 90, trustScore: 92 } },
    profile
  );
  const signals = extractPurchaseSignals(input);
  assert.equal(signals.qualityScore, 90);
  assert.equal(signals.trustScore, 92);
});

test('negotiation_intelligence used when available', () => {
  const input = buildPurchaseDecisionInput(
    { ...bmwListing, negotiation_intelligence: { negotiation_risk: 20, offer_range_advantage: 75 } },
    profile
  );
  const signals = extractPurchaseSignals(input);
  assert.ok(signals.negotiationSignal >= 60);
});

// --- PENALTIES ---

test('suspicious price penalty increases riskPenalty', () => {
  const input = buildPurchaseDecisionInput({ ...bmwListing, price: 5000000 }, profile);
  const signals = extractPurchaseSignals(input);
  assert.ok(signals.suspiciousPrice > 0 || signals.riskPenalty > 0);
});

test('duplicate risk penalty applied', () => {
  const input = buildPurchaseDecisionInput({ ...bmwListing, duplicate_risk: 80 }, profile);
  const signals = extractPurchaseSignals(input);
  assert.ok(signals.duplicateRisk >= 80);
});

test('stale listing risk penalty applied', () => {
  const stale = detectStaleListingRisk({ updated_at: '2023-01-01T00:00:00.000Z' });
  assert.ok(stale >= 45);
});

test('missing critical field penalty applied', () => {
  const missing = detectMissingCriticalFields(sparseListing, 'vehicle');
  assert.ok(missing.length > 0);
  const input = buildPurchaseDecisionInput(sparseListing, profile);
  const signals = extractPurchaseSignals(input);
  assert.ok(signals.missingInfoPenalty > 0);
});

// --- POSITIVE / RISK FACTORS ---

test('positiveFactors max 5 items', () => {
  const pd = runPd();
  assert.ok(pd.positiveFactors.length <= 5);
  assert.ok(pd.positiveFactors.length > 0);
});

test('riskFactors max 5 items', () => {
  const pd = runPd(sparseListing);
  assert.ok(pd.riskFactors.length <= 5);
});

test('sparse listing produces risk factors', () => {
  const pd = runPd(sparseListing);
  assert.ok(pd.riskFactors.some((f) => /eksik|görsel|doğrula|belirsiz/i.test(f)));
});

test('good listing produces positive factors', () => {
  const pd = runPd(bmwListing);
  assert.ok(pd.positiveFactors.length >= 2);
});

// --- NEGOTIATION SCENARIOS ---

test('negotiation scenario includes 3/5/10 percent', () => {
  const pd = runPd();
  const rates = pd.negotiationScenario.map((s) => s.discountPct);
  assert.deepEqual(rates, NEGOTIATION_DISCOUNT_RATES);
});

test('negotiation scenario adjustedPrice computed', () => {
  assert.equal(computeAdjustedPrice(1000000, 5), 950000);
  assert.equal(computeAdjustedPrice(1000000, 10), 900000);
  assert.equal(computeAdjustedPrice(1000000, 3), 970000);
});

test('negotiation scenario score improvement with discount', () => {
  const signals = extractPurchaseSignals(buildPurchaseDecisionInput(bmwListing, profile));
  const base = computeDecisionScore(signals);
  const after5 = estimateDecisionScoreAfterDiscount(signals, 5);
  const after10 = estimateDecisionScoreAfterDiscount(signals, 10);
  assert.ok(after5 >= base);
  assert.ok(after10 >= after5);
});

test('negotiation scenario has Turkish explanation', () => {
  const pd = runPd();
  for (const scenario of pd.negotiationScenario) {
    assert.match(scenario.explanation, /indirim/i);
    assert.match(scenario.explanation, /karar seviyesi/i);
  }
});

test('buildNegotiationScenarios returns 3 scenarios', () => {
  const signals = extractPurchaseSignals(buildPurchaseDecisionInput(bmwListing, profile));
  const scenarios = buildNegotiationScenarios(signals, 65, 1780000);
  assert.equal(scenarios.length, 3);
});

// --- WAIT SCENARIO ---

test('wait scenario has safe language', () => {
  const pd = runPd();
  const text = pd.waitScenario.explanation;
  assert.doesNotMatch(text, /kesin|garanti|kaçırılmaz/i);
  assert.match(text, /beklemek|doğrulama|güvenli|bilgiler/i);
});

test('wait scenario has benefit and risk levels', () => {
  const pd = runPd();
  assert.ok(['low', 'medium', 'high'].includes(pd.waitScenario.waitBenefitLevel));
  assert.ok(['low', 'medium', 'high'].includes(pd.waitScenario.waitRiskLevel));
});

test('wait scenario whenToWait and whenNotToWait arrays', () => {
  const pd = runPd();
  assert.ok(Array.isArray(pd.waitScenario.whenToWait));
  assert.ok(Array.isArray(pd.waitScenario.whenNotToWait));
  assert.ok(pd.waitScenario.whenToWait.length > 0);
});

// --- MISSING INFO IMPACT ---

test('missingInfoImpact potentialDecisionLift 0-20', () => {
  const pd = runPd(sparseListing);
  assert.ok(pd.missingInfoImpact.potentialDecisionLift >= 0);
  assert.ok(pd.missingInfoImpact.potentialDecisionLift <= 20);
});

test('computePotentialDecisionLift scales with missing count', () => {
  assert.equal(computePotentialDecisionLift([]), 0);
  assert.equal(computePotentialDecisionLift(['a']), 5);
  assert.equal(computePotentialDecisionLift(['a', 'b']), 10);
  assert.equal(computePotentialDecisionLift(['a', 'b', 'c']), 15);
  assert.equal(computePotentialDecisionLift(['a', 'b', 'c', 'd']), 20);
});

test('resolveImpactLevel thresholds', () => {
  assert.equal(resolveImpactLevel([]), 'low');
  assert.equal(resolveImpactLevel(['a']), 'medium');
  assert.equal(resolveImpactLevel(['a', 'b', 'c']), 'high');
});

test('missingInfoImpact has Turkish explanation', () => {
  const impact = buildMissingInfoImpact(['Kilometre', 'Tramer']);
  assert.match(impact.explanation, /karar güveni/i);
});

// --- TURKISH LABELS ---

test('DECISION_LEVEL_LABELS all Turkish', () => {
  assert.equal(DECISION_LEVEL_LABELS.strong_buy_candidate, 'Güçlü al adayı');
  assert.equal(DECISION_LEVEL_LABELS.buy_candidate, 'Al adayı');
  assert.equal(DECISION_LEVEL_LABELS.negotiate_first, 'Önce pazarlık yap');
  assert.equal(DECISION_LEVEL_LABELS.wait, 'Bekle');
  assert.equal(DECISION_LEVEL_LABELS.avoid, 'Vazgeç');
});

test('RISK_LEVEL_LABELS all Turkish', () => {
  assert.equal(RISK_LEVEL_LABELS.low, 'Düşük risk');
  assert.equal(RISK_LEVEL_LABELS.medium, 'Orta risk');
  assert.equal(RISK_LEVEL_LABELS.high, 'Yüksek risk');
});

test('purchaseDecision decisionLabel is Turkish', () => {
  const pd = runPd();
  assert.ok(Object.values(DECISION_LEVEL_LABELS).includes(pd.decisionLabel));
});

// --- SUMMARY SAFETY ---

test('summary does not contain banned words', () => {
  const pd = runPd();
  for (const phrase of PURCHASE_DECISION_FORBIDDEN_PHRASES) {
    assert.ok(!pd.summary.toLowerCase().includes(phrase.toLowerCase()), `Found banned: ${phrase}`);
  }
});

test('sanitizePurchaseDecisionText removes banned phrases', () => {
  const raw = 'Bu kesin alınır ve kaçırılmaz fırsat garanti kazanç sunar';
  const safe = sanitizePurchaseDecisionText(raw);
  assert.ok(!containsForbiddenPurchasePhrase(safe));
});

test('buildPurchaseDecisionSummary uses safe language', () => {
  const summary = buildPurchaseDecisionSummary({
    decisionLabel: 'Al adayı',
    confidenceLabel: 'Yüksek veri güveni',
    riskLabel: 'Düşük risk',
    primaryActionLabel: 'Alımı değerlendir'
  });
  assert.match(summary, /karar destek|değerlendir|ön değerlendirme/i);
  assert.ok(!containsForbiddenPurchasePhrase(summary));
});

// --- CATEGORY NEXT STEPS ---

test('category next steps vehicle', () => {
  const steps = buildCategoryNextSteps('vehicle', 'negotiate');
  assert.ok(steps.some((s) => /fiyat|tramer|ekspertiz|bakım|pazarlık|maliyet/i.test(s)));
  assert.ok(steps.length >= 4 && steps.length <= 6);
});

test('category next steps konut', () => {
  const steps = buildCategoryNextSteps('konut', 'buy');
  assert.ok(steps.some((s) => /tapu|iskan|aidat|deprem|emsal|finansman/i.test(s)));
});

test('category next steps tatil', () => {
  const steps = buildCategoryNextSteps('tatil', 'wait');
  assert.ok(steps.some((s) => /iptal|konum|ücret|tarih|alternatif/i.test(s)));
});

test('purchaseDecision nextSteps for housing category', () => {
  clearPurchaseDecisionMemoCache();
  const input = buildPurchaseDecisionInput(housingListing, { ...profile, category: 'housing' });
  const pd = runPurchaseDecisionEngine(input);
  assert.ok(pd.nextSteps.some((s) => /tapu|aidat|emsal/i.test(s)));
});

// --- CARD BUILDER ---

test('buildExecutiveDecisionPanelHtml escapes XSS', () => {
  const html = buildExecutiveDecisionPanelHtml(
    {
      decisionScore: 75,
      decisionLevel: 'buy_candidate',
      decisionLabel: '<script>x</script>',
      confidenceScore: 60,
      confidenceLevel: 'medium',
      confidenceLabel: 'Orta',
      riskLevel: 'medium',
      riskLabel: 'Orta risk',
      primaryAction: 'buy',
      primaryActionLabel: '<img onerror=1>',
      positiveFactors: ['<script>'],
      riskFactors: ['<script>'],
      missingInfoImpact: { missingCriticalFields: ['<x>'], impactLevel: 'low', potentialDecisionLift: 5, explanation: '<script>' },
      negotiationScenario: [{ discountPct: 5, adjustedPrice: 100, estimatedDecisionScore: 80, decisionChange: 'x', explanation: '<script>' }],
      waitScenario: { waitBenefitLevel: 'low', waitRiskLevel: 'low', explanation: '<script>', whenToWait: ['<a>'], whenNotToWait: ['<b>'] },
      summary: '<script>alert(1)</script>',
      nextSteps: ['<script>']
    },
    { title: 'Test' }
  );
  assert.ok(!html.includes('<script>'));
});

test('buildExecutiveDecisionPanelHtml renders all sections', () => {
  const pd = runPd();
  const html = buildExecutiveDecisionPanelHtml(pd, { title: 'BMW 320i' });
  assert.match(html, /Karar skoru/);
  assert.match(html, /Veri güveni/);
  assert.match(html, /Olumlu faktörler/);
  assert.match(html, /Risk faktörleri/);
  assert.match(html, /Pazarlık senaryoları/);
  assert.match(html, /Bekleme senaryosu/);
  assert.match(html, /Eksik bilgi etkisi/);
  assert.match(html, /Sonraki adımlar/);
  assert.match(html, /Özet/);
  assert.match(html, /Al Kararı Analizi/);
});

test('buildExecutiveDecisionPanelHtml empty state', () => {
  const html = buildExecutiveDecisionPanelHtml(null, { title: 'Test' });
  assert.match(html, /Bu öneri için al kararı analizi üretilemedi/);
});

test('buildExecutiveDecisionShellHtml renders host', () => {
  assert.match(buildExecutiveDecisionShellHtml(), /ai-pd-panel-host/);
});

// --- MEMO CACHE ---

test('lazy compute memoizes identical input', () => {
  clearPurchaseDecisionMemoCache();
  const rec = getTopRecommendation();
  const input = buildPurchaseDecisionInput(rec, profile);
  const first = runPurchaseDecisionEngine(input);
  const second = runPurchaseDecisionEngine(input);
  assert.equal(first, second);
});

test('cache key differs by recommendation id', () => {
  const a = buildPurchaseDecisionCacheKey({ id: 'a' }, profile);
  const b = buildPurchaseDecisionCacheKey({ id: 'b' }, profile);
  assert.notEqual(a, b);
});

test('clearPurchaseDecisionMemoCache resets cache', () => {
  clearPurchaseDecisionMemoCache();
  const rec = getTopRecommendation();
  const input = buildPurchaseDecisionInput(rec, profile);
  const first = runPurchaseDecisionEngine(input);
  clearPurchaseDecisionMemoCache();
  const second = runPurchaseDecisionEngine(input);
  assert.notEqual(first, second);
  assert.deepEqual(first, second);
});

test('runPurchaseDecisionEngine returns null for empty input', () => {
  clearPurchaseDecisionMemoCache();
  const result = runPurchaseDecisionEngine(buildPurchaseDecisionInput({}, profile));
  assert.equal(result, null);
});

// --- FIT_SCORE UNCHANGED ---

test('fit_score value unchanged by purchase decision', () => {
  clearRecommendationMemoCache();
  const before = runRecommendationEngine(listings, profile);
  const topItem = before.top[0];
  const originalFitScore = topItem.fit_score;

  clearPurchaseDecisionMemoCache();
  runPurchaseDecisionEngine(buildPurchaseDecisionInput(topItem, profile));

  clearRecommendationMemoCache();
  const after = runRecommendationEngine(listings, profile);
  const sameItem = after.top.find((i) => String(i.id) === String(topItem.id));
  assert.equal(sameItem.fit_score, originalFitScore);
});

// --- ADMIN INTEGRATION ---

test('buildRecommendationCardHtml includes Al Kararı button', () => {
  const rec = getTopRecommendation();
  const html = buildRecommendationCardHtml(rec);
  assert.match(html, /Al Kararı/);
  assert.match(html, /data-rec-pd-id/);
});

test('buildRecommendationsDashboardHtml includes pd host', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.match(html, /ai-pd-panel-host/);
});

test('recommendation card does not show pd button without id', () => {
  const html = buildRecommendationCardHtml({ fit_score: 80, recommendation_label: 'Uygun', title: 'Test' });
  assert.doesNotMatch(html, /data-rec-pd-id/);
});

// --- RISK LEVEL ---

test('resolveRiskLevel thresholds', () => {
  assert.equal(resolveRiskLevel(20), 'low');
  assert.equal(resolveRiskLevel(45), 'medium');
  assert.equal(resolveRiskLevel(70), 'high');
});

test('purchaseDecision riskLabel Turkish', () => {
  const pd = runPd();
  assert.ok(Object.values(RISK_LEVEL_LABELS).includes(pd.riskLabel));
});

// --- ENGINE OUTPUT SHAPE ---

test('purchaseDecision has all required fields', () => {
  const pd = runPd();
  const required = [
    'decisionScore', 'decisionLevel', 'decisionLabel',
    'confidenceScore', 'confidenceLevel', 'confidenceLabel',
    'riskLevel', 'riskLabel',
    'primaryAction', 'primaryActionLabel',
    'positiveFactors', 'riskFactors',
    'missingInfoImpact', 'negotiationScenario', 'waitScenario',
    'summary', 'nextSteps'
  ];
  for (const key of required) {
    assert.ok(key in pd, `Missing field: ${key}`);
  }
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /'listings'/);
  assert.doesNotMatch(router, /purchase-decision/i);
});

test('guard: no schema change for purchase decision tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /purchase_decision/i);
});

test('guard: shared purchase decision module exists', () => {
  const p = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/purchase-decision/purchase-decision-engine.js');
  assert.ok(fs.existsSync(p));
});

test('guard: client purchase decision module exists', () => {
  const p = path.join(process.cwd(), 'js/ai-purchase-decision/index.js');
  assert.ok(fs.existsSync(p));
});

test('buildPurchaseDecisionInput preserves fit_score', () => {
  const input = buildPurchaseDecisionInput({ id: 'x', fit_score: 77 }, profile);
  assert.equal(input.fit_score, 77);
});

test('buildPositiveFactors never exceeds 5 even with rich signals', () => {
  const signals = {
    qualityScore: 95,
    trustScore: 95,
    offerAdvantage: 90,
    ownershipCostSignal: 90,
    negotiationSignal: 80,
    negotiationRisk: 10,
    recommendationScore: 90,
    duplicateRisk: 5,
    hasImageEvidence: true,
    missingCritical: []
  };
  const strength = buildDecisionStrength(90, 20);
  assert.equal(buildPositiveFactors(signals, strength).length, 5);
});

test('buildRiskFactors never exceeds 5 even with many risks', () => {
  const signals = {
    missingCritical: ['a', 'b', 'c'],
    priceUncertainty: true,
    hasImageEvidence: false,
    duplicateRisk: 80,
    ownershipCostSignal: 20,
    suspiciousPrice: 70,
    staleRisk: 70,
    categoryRisk: 60,
    negotiationRisk: 80
  };
  const strength = buildDecisionStrength(30, 80);
  assert.equal(buildRiskFactors(signals, strength).length, 5);
});

test('wait scenario buildWaitScenario returns complete object', () => {
  const signals = extractPurchaseSignals(buildPurchaseDecisionInput(sparseListing, profile));
  const strength = buildDecisionStrength(50, 60);
  const wait = buildWaitScenario(signals, strength, 'vehicle');
  assert.ok(wait.explanation);
  assert.ok(wait.whenToWait.length);
  assert.ok(wait.whenNotToWait.length);
});

test('negotiation scenario decisionChange field present', () => {
  const pd = runPd();
  for (const scenario of pd.negotiationScenario) {
    assert.ok('decisionChange' in scenario);
    assert.ok('estimatedDecisionScore' in scenario);
  }
});

test('shared and client engines produce identical output', async () => {
  const shared = await import('../../supabase/functions/_shared/ai-listings/purchase-decision/index.js');
  clearPurchaseDecisionMemoCache();
  shared.clearPurchaseDecisionMemoCache();
  const rec = getTopRecommendation();
  const input = buildPurchaseDecisionInput(rec, profile);
  const clientResult = runPurchaseDecisionEngine(input, { skipCache: true });
  const sharedResult = shared.runPurchaseDecisionEngine(input, { skipCache: true });
  assert.deepEqual(clientResult, sharedResult);
});

test('confidenceLevel maps correctly from confidenceScore', () => {
  const pd = runPd();
  if (pd.confidenceScore >= 80) assert.equal(pd.confidenceLevel, 'high');
  else if (pd.confidenceScore >= 55) assert.equal(pd.confidenceLevel, 'medium');
  else assert.equal(pd.confidenceLevel, 'low');
});

test('vehicle critical fields detected for sparse listing', () => {
  const fields = detectMissingCriticalFields(sparseListing, 'vehicle');
  assert.ok(fields.includes('Kilometre'));
  assert.ok(fields.includes('Model yılı'));
});
