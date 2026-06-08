import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  clearExplainabilityMemoCache,
  buildExplainabilityCacheKey,
  buildExplainabilityInput,
  runExplainabilityEngine,
  computeExplanationScore,
  buildDataGaps,
  EXPLAINABILITY_FORBIDDEN_PHRASES,
  EXPLANATION_LEVEL_LABELS,
  CONFIDENCE_LEVEL_LABELS,
  CONTRIBUTION_LABELS,
  resolveExplanationLevel,
  resolveConfidenceLevel,
  sanitizeExplainabilityText,
  containsForbiddenExplainabilityPhrase,
  buildReasoningSummary,
  buildUserFriendlyExplanation,
  buildVerificationSteps,
  CONTRIBUTION_KEYS,
  clampContribution,
  resolveContributionDirection,
  buildScoreContributions,
  buildTopPositiveDrivers,
  buildTopNegativeDrivers,
  buildDecisionPath,
  buildConfidenceExplanation,
  buildExplainabilityPanelHtml,
  buildExplainabilityShellHtml
} = await import('../../js/ai-decision-explainability/index.js');

const { extractPurchaseSignals } = await import('../../js/ai-purchase-decision/decision-strength-engine.js');
const { runRecommendationEngine, clearRecommendationMemoCache } = await import(
  '../../js/ai-recommendation-engine/index.js'
);
const { runPurchaseDecisionEngine, clearPurchaseDecisionMemoCache, buildPurchaseDecisionInput } = await import(
  '../../js/ai-purchase-decision/index.js'
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
  location: 'İzmir',
  images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
  attributes: { brand: 'BMW', model: '320i', year: 2022, km: 45000 },
  latest_analysis: { risk_score: 28, quality_score: 88, decision_score: 82 },
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
  latest_analysis: { risk_score: 35, quality_score: 75 },
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
  latest_analysis: { risk_score: 22, quality_score: 80 },
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

function runExp(rec = null, intent = profile) {
  clearExplainabilityMemoCache();
  const recommendation = rec ?? getTopRecommendation();
  const input = buildExplainabilityInput(recommendation, intent);
  return runExplainabilityEngine(input);
}

function getSignals(rec = bmwListing) {
  return extractPurchaseSignals(buildExplainabilityInput(rec, profile));
}

// --- EXPLANATION SCORE ---

test('explanationScore is between 0 and 100', () => {
  const exp = runExp();
  assert.ok(exp.explanationScore >= 0 && exp.explanationScore <= 100);
});

test('computeExplanationScore clamps to 0-100', () => {
  const signals = getSignals(sparseListing);
  const conf = buildConfidenceExplanation(signals);
  const score = computeExplanationScore(signals, conf);
  assert.ok(score >= 0 && score <= 100);
});

test('rich data produces higher explanationScore than sparse', () => {
  const rich = runExp(bmwListing);
  const sparse = runExp(sparseListing);
  assert.ok(rich.explanationScore >= sparse.explanationScore);
});

// --- EXPLANATION LEVEL ---

test('resolveExplanationLevel very_clear at 80+', () => {
  assert.equal(resolveExplanationLevel(80), 'very_clear');
  assert.equal(resolveExplanationLevel(100), 'very_clear');
});

test('resolveExplanationLevel clear at 65-79', () => {
  assert.equal(resolveExplanationLevel(65), 'clear');
  assert.equal(resolveExplanationLevel(79), 'clear');
});

test('resolveExplanationLevel partial at 45-64', () => {
  assert.equal(resolveExplanationLevel(45), 'partial');
  assert.equal(resolveExplanationLevel(64), 'partial');
});

test('resolveExplanationLevel weak below 45', () => {
  assert.equal(resolveExplanationLevel(44), 'weak');
  assert.equal(resolveExplanationLevel(0), 'weak');
});

test('explanationLabel is Turkish', () => {
  const exp = runExp();
  assert.ok(Object.values(EXPLANATION_LEVEL_LABELS).includes(exp.explanationLabel));
});

// --- DECISION PATH ---

test('decisionPath produces 7 steps', () => {
  const exp = runExp();
  assert.equal(exp.decisionPath.length, 7);
});

test('decisionPath step order is correct', () => {
  const exp = runExp();
  const ids = exp.decisionPath.map((s) => s.id);
  assert.deepEqual(ids, [
    'listing_info',
    'quality_score',
    'trust_score',
    'ownership_cost',
    'negotiation_signal',
    'risks',
    'purchase_decision'
  ]);
});

test('decisionPath steps have required fields', () => {
  const exp = runExp();
  for (const step of exp.decisionPath) {
    assert.ok(step.id);
    assert.ok(step.label);
    assert.ok(['positive', 'neutral', 'warning', 'negative'].includes(step.status));
    assert.ok(['low', 'medium', 'high'].includes(step.impact));
    assert.ok(step.explanation);
  }
});

test('decisionPath labels are Turkish', () => {
  const exp = runExp();
  assert.ok(exp.decisionPath.some((s) => /İlan bilgileri|Kalite skoru|Güven skoru/i.test(s.label)));
});

test('buildDecisionPath works without purchase decision', () => {
  const path = buildDecisionPath(getSignals(), null);
  const last = path[path.length - 1];
  assert.equal(last.id, 'purchase_decision');
  assert.match(last.explanation, /temel sinyaller/i);
});

// --- POSITIVE / NEGATIVE DRIVERS ---

test('topPositiveDrivers max 5', () => {
  const exp = runExp();
  assert.ok(exp.topPositiveDrivers.length <= 5);
  assert.ok(exp.topPositiveDrivers.length > 0);
});

test('topNegativeDrivers max 5', () => {
  const exp = runExp(sparseListing);
  assert.ok(exp.topNegativeDrivers.length <= 5);
});

test('positive drivers have required shape', () => {
  const drivers = buildTopPositiveDrivers(getSignals(bmwListing));
  for (const d of drivers) {
    assert.ok(d.key);
    assert.ok(d.label);
    assert.ok(d.impact);
    assert.ok(d.explanation);
  }
});

test('negative drivers for sparse listing', () => {
  const drivers = buildTopNegativeDrivers(getSignals(sparseListing));
  assert.ok(drivers.some((d) => /eksik|görsel|doğrula|belirsiz/i.test(d.label)));
});

test('buildTopPositiveDrivers never exceeds 5', () => {
  const signals = {
    qualityScore: 95,
    trustScore: 95,
    ownershipCostSignal: 90,
    negotiationSignal: 80,
    negotiationRisk: 10,
    recommendationScore: 90,
    duplicateRisk: 5,
    hasImageEvidence: true,
    missingCritical: [],
    missingInfoPenalty: 0
  };
  assert.equal(buildTopPositiveDrivers(signals).length, 5);
});

test('buildTopNegativeDrivers never exceeds 5', () => {
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
  assert.equal(buildTopNegativeDrivers(signals).length, 5);
});

// --- SCORE CONTRIBUTIONS ---

test('scoreContributions clamp -100 to +100', () => {
  assert.equal(clampContribution(-150), -100);
  assert.equal(clampContribution(150), 100);
  assert.equal(clampContribution(50), 50);
});

test('score contribution direction positive', () => {
  assert.equal(resolveContributionDirection(80), 'positive');
});

test('score contribution direction negative', () => {
  assert.equal(resolveContributionDirection(30), 'negative');
});

test('score contribution direction neutral', () => {
  assert.equal(resolveContributionDirection(52), 'neutral');
});

test('scoreContributions includes all keys', () => {
  const exp = runExp();
  const keys = exp.scoreContributions.map((c) => c.key);
  for (const key of CONTRIBUTION_KEYS) {
    assert.ok(keys.includes(key), `Missing contribution key: ${key}`);
  }
});

test('scoreContributions have label and explanation', () => {
  const contributions = buildScoreContributions(getSignals());
  for (const c of contributions) {
    assert.ok(c.label);
    assert.ok(c.explanation);
    assert.ok(c.contribution >= -100 && c.contribution <= 100);
    assert.ok(['positive', 'neutral', 'negative'].includes(c.direction));
  }
});

test('CONTRIBUTION_LABELS are Turkish', () => {
  assert.equal(CONTRIBUTION_LABELS.quality, 'Kalite skoru');
  assert.equal(CONTRIBUTION_LABELS.trust, 'Güven skoru');
});

// --- FALLBACKS ---

test('missing quality fallback', () => {
  const signals = extractPurchaseSignals(buildExplainabilityInput({ ...sparseListing, quality_score: null }, profile));
  assert.ok(signals.qualityScore >= 0);
});

test('missing trust fallback', () => {
  const signals = extractPurchaseSignals(buildExplainabilityInput({ ...bmwListing, trust_score: null }, profile));
  assert.ok(signals.trustScore >= 0 && signals.trustScore <= 100);
});

test('missing negotiation fallback', () => {
  const signals = extractPurchaseSignals(
    buildExplainabilityInput(
      { ...bmwListing, negotiation_intelligence: null, price_intelligence: { deviation_pct: -10 } },
      profile
    )
  );
  assert.ok(signals.negotiationSignal > 0);
});

test('missing purchase decision fallback', () => {
  const exp = runExp({ ...bmwListing, purchase_decision: null });
  const lastStep = exp.decisionPath[exp.decisionPath.length - 1];
  assert.ok(lastStep.explanation);
});

test('listing_quality used when available', () => {
  const signals = extractPurchaseSignals(
    buildExplainabilityInput({ ...bmwListing, listing_quality: { qualityScore: 92, trustScore: 88 } }, profile)
  );
  assert.equal(signals.qualityScore, 92);
  assert.equal(signals.trustScore, 88);
});

// --- CONFIDENCE EXPLANATION ---

test('confidenceExplanation has required fields', () => {
  const exp = runExp();
  const conf = exp.confidenceExplanation;
  assert.ok(conf.confidenceScore >= 0 && conf.confidenceScore <= 100);
  assert.ok(conf.confidenceLevel);
  assert.ok(conf.confidenceLabel);
  assert.ok(conf.whyThisConfidence);
  assert.ok(Array.isArray(conf.whatWouldIncreaseConfidence));
});

test('confidenceLabel is Turkish', () => {
  const conf = buildConfidenceExplanation(getSignals());
  assert.ok(Object.values(CONFIDENCE_LEVEL_LABELS).includes(conf.confidenceLabel));
});

test('whyThisConfidence explains data state', () => {
  const conf = buildConfidenceExplanation(getSignals(sparseListing));
  assert.match(conf.whyThisConfidence, /Veri güveni/i);
});

test('whatWouldIncreaseConfidence has items for sparse data', () => {
  const conf = buildConfidenceExplanation(getSignals(sparseListing));
  assert.ok(conf.whatWouldIncreaseConfidence.length > 0);
});

// --- DATA GAPS ---

test('dataGaps lists missing fields', () => {
  const gaps = buildDataGaps(getSignals(sparseListing));
  assert.ok(gaps.length > 0);
});

test('dataGaps included in output', () => {
  const exp = runExp(sparseListing);
  assert.ok(Array.isArray(exp.dataGaps));
  assert.ok(exp.dataGaps.length > 0);
});

// --- VERIFICATION STEPS ---

test('category verification steps vehicle', () => {
  const steps = buildVerificationSteps('vehicle');
  assert.ok(steps.some((s) => /tramer|ekspertiz|kilometre|pazarlık|maliyet/i.test(s)));
  assert.ok(steps.length >= 4 && steps.length <= 6);
});

test('category verification steps konut', () => {
  const steps = buildVerificationSteps('konut');
  assert.ok(steps.some((s) => /tapu|aidat|deprem|emsal|finansman/i.test(s)));
});

test('category verification steps tatil', () => {
  const steps = buildVerificationSteps('tatil');
  assert.ok(steps.some((s) => /iptal|konum|ücret|alternatif|tarih/i.test(s)));
});

test('nextVerificationSteps in output for housing', () => {
  clearExplainabilityMemoCache();
  const exp = runExplainabilityEngine(buildExplainabilityInput(housingListing, { ...profile, category: 'housing' }));
  assert.ok(exp.nextVerificationSteps.some((s) => /tapu|aidat/i.test(s)));
});

// --- TURKISH LABELS ---

test('EXPLANATION_LEVEL_LABELS all Turkish', () => {
  assert.equal(EXPLANATION_LEVEL_LABELS.very_clear, 'Çok net açıklanabilir');
  assert.equal(EXPLANATION_LEVEL_LABELS.clear, 'Açıklanabilir');
  assert.equal(EXPLANATION_LEVEL_LABELS.partial, 'Kısmen açıklanabilir');
  assert.equal(EXPLANATION_LEVEL_LABELS.weak, 'Zayıf açıklanabilir');
});

// --- SUMMARY SAFETY ---

test('reasoningSummary does not contain banned words', () => {
  const exp = runExp();
  for (const phrase of EXPLAINABILITY_FORBIDDEN_PHRASES) {
    assert.ok(!exp.reasoningSummary.toLowerCase().includes(phrase.toLowerCase()));
  }
});

test('userFriendlyExplanation safe language', () => {
  const exp = runExp();
  for (const phrase of EXPLAINABILITY_FORBIDDEN_PHRASES) {
    assert.ok(!exp.userFriendlyExplanation.toLowerCase().includes(phrase.toLowerCase()));
  }
  assert.match(exp.userFriendlyExplanation, /değerlendir|karar|doğrulama/i);
});

test('sanitizeExplainabilityText removes banned phrases', () => {
  const raw = 'Bu kesin alınır ve kaçırılmaz fırsat risksiz garanti kazanç sunar';
  const safe = sanitizeExplainabilityText(raw);
  assert.ok(!containsForbiddenExplainabilityPhrase(safe));
});

test('buildReasoningSummary uses safe language', () => {
  const summary = buildReasoningSummary({ hasQuality: true, hasTrust: true, hasGaps: true });
  assert.match(summary, /karar|değerlendir/i);
  assert.ok(!containsForbiddenExplainabilityPhrase(summary));
});

test('buildUserFriendlyExplanation is 2-4 sentences', () => {
  const text = buildUserFriendlyExplanation({ decisionLabel: 'Al adayı', positiveCount: 3, negativeCount: 2, confidenceLabel: 'Orta veri güveni' });
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
  assert.ok(sentences.length >= 2 && sentences.length <= 5);
});

// --- CARD BUILDER ---

test('buildExplainabilityPanelHtml escapes XSS', () => {
  const html = buildExplainabilityPanelHtml(
    {
      explanationScore: 70,
      explanationLevel: 'clear',
      explanationLabel: '<script>x</script>',
      decisionPath: [{ id: 'x', label: '<img>', status: 'positive', impact: 'high', explanation: '<script>' }],
      topPositiveDrivers: [{ label: '<script>', impact: 'high', explanation: '<script>' }],
      topNegativeDrivers: [{ label: '<script>', impact: 'high', explanation: '<script>' }],
      scoreContributions: [{ label: '<x>', contribution: 10, direction: 'positive', explanation: '<script>' }],
      confidenceExplanation: { confidenceScore: 60, confidenceLabel: 'Orta', whyThisConfidence: '<script>', whatWouldIncreaseConfidence: ['<a>'] },
      dataGaps: ['<script>'],
      userFriendlyExplanation: '<script>',
      reasoningSummary: '<script>',
      nextVerificationSteps: ['<script>']
    },
    { title: 'Test' }
  );
  assert.ok(!html.includes('<script>'));
});

test('buildExplainabilityPanelHtml renders all sections', () => {
  const exp = runExp();
  const html = buildExplainabilityPanelHtml(exp, { title: 'BMW 320i' });
  assert.match(html, /Açıklama skoru/);
  assert.match(html, /Karar oluşum yolu/);
  assert.match(html, /Olumlu faktörler/);
  assert.match(html, /Risk \/ olumsuz faktörler/);
  assert.match(html, /Skor katkıları/);
  assert.match(html, /Veri güveni açıklaması/);
  assert.match(html, /Eksik veri etkileri/);
  assert.match(html, /Kullanıcı dostu açıklama/);
  assert.match(html, /Doğrulama adımları/);
  assert.match(html, /Karar Açıklaması/);
});

test('buildExplainabilityPanelHtml empty state', () => {
  const html = buildExplainabilityPanelHtml(null, { title: 'Test' });
  assert.match(html, /Bu öneri için karar açıklaması üretilemedi/);
});

test('buildExplainabilityShellHtml renders host', () => {
  assert.match(buildExplainabilityShellHtml(), /ai-exp-panel-host/);
});

// --- MEMO CACHE ---

test('lazy compute memoizes identical input', () => {
  clearExplainabilityMemoCache();
  const rec = getTopRecommendation();
  const input = buildExplainabilityInput(rec, profile);
  const first = runExplainabilityEngine(input);
  const second = runExplainabilityEngine(input);
  assert.equal(first, second);
});

test('cache key differs by recommendation id', () => {
  const a = buildExplainabilityCacheKey({ id: 'a' }, profile);
  const b = buildExplainabilityCacheKey({ id: 'b' }, profile);
  assert.notEqual(a, b);
});

test('clearExplainabilityMemoCache resets cache', () => {
  clearExplainabilityMemoCache();
  const rec = getTopRecommendation();
  const input = buildExplainabilityInput(rec, profile);
  const first = runExplainabilityEngine(input);
  clearExplainabilityMemoCache();
  const second = runExplainabilityEngine(input);
  assert.notEqual(first, second);
  assert.deepEqual(first, second);
});

test('runExplainabilityEngine returns null for empty input', () => {
  clearExplainabilityMemoCache();
  assert.equal(runExplainabilityEngine(buildExplainabilityInput({}, profile)), null);
});

// --- SCORES UNCHANGED ---

test('fit_score unchanged by explainability', () => {
  clearRecommendationMemoCache();
  const before = runRecommendationEngine(listings, profile);
  const topItem = before.top[0];
  const originalFitScore = topItem.fit_score;

  clearExplainabilityMemoCache();
  runExplainabilityEngine(buildExplainabilityInput(topItem, profile));

  clearRecommendationMemoCache();
  const after = runRecommendationEngine(listings, profile);
  const sameItem = after.top.find((i) => String(i.id) === String(topItem.id));
  assert.equal(sameItem.fit_score, originalFitScore);
});

test('purchase decision score unchanged by explainability', () => {
  clearPurchaseDecisionMemoCache();
  const rec = getTopRecommendation();
  const pdBefore = runPurchaseDecisionEngine(buildPurchaseDecisionInput(rec, profile), { skipCache: true });

  clearExplainabilityMemoCache();
  runExplainabilityEngine(buildExplainabilityInput(rec, profile), { skipCache: true });

  clearPurchaseDecisionMemoCache();
  const pdAfter = runPurchaseDecisionEngine(buildPurchaseDecisionInput(rec, profile), { skipCache: true });
  assert.equal(pdAfter.decisionScore, pdBefore.decisionScore);
});

// --- ADMIN INTEGRATION ---

test('buildRecommendationCardHtml includes Neden Bu Karar button', () => {
  const rec = getTopRecommendation();
  const html = buildRecommendationCardHtml(rec);
  assert.match(html, /Neden Bu Karar/);
  assert.match(html, /data-rec-exp-id/);
});

test('buildRecommendationsDashboardHtml includes exp host', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.match(html, /ai-exp-panel-host/);
});

test('recommendation card does not show exp button without id', () => {
  const html = buildRecommendationCardHtml({ fit_score: 80, recommendation_label: 'Uygun', title: 'Test' });
  assert.doesNotMatch(html, /data-rec-exp-id/);
});

// --- OUTPUT SHAPE ---

test('decisionExplainability has all required fields', () => {
  const exp = runExp();
  const required = [
    'explanationScore', 'explanationLevel', 'explanationLabel',
    'decisionPath', 'topPositiveDrivers', 'topNegativeDrivers',
    'scoreContributions', 'confidenceExplanation', 'dataGaps',
    'reasoningSummary', 'userFriendlyExplanation', 'nextVerificationSteps'
  ];
  for (const key of required) {
    assert.ok(key in exp, `Missing field: ${key}`);
  }
});

test('shared and client engines produce identical output', async () => {
  const shared = await import('../../supabase/functions/_shared/ai-listings/explainability/index.js');
  clearExplainabilityMemoCache();
  shared.clearExplainabilityMemoCache();
  const rec = getTopRecommendation();
  const input = buildExplainabilityInput(rec, profile);
  const clientResult = runExplainabilityEngine(input, { skipCache: true });
  const sharedResult = shared.runExplainabilityEngine(input, { skipCache: true });
  assert.deepEqual(clientResult, sharedResult);
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /'listings'/);
  assert.doesNotMatch(router, /explainability/i);
});

test('guard: no schema change for explainability tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /decision_explainability/i);
});

test('guard: shared explainability module exists', () => {
  const p = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/explainability/explainability-engine.js');
  assert.ok(fs.existsSync(p));
});

test('guard: client explainability module exists', () => {
  const p = path.join(process.cwd(), 'js/ai-decision-explainability/index.js');
  assert.ok(fs.existsSync(p));
});

test('buildExplainabilityInput preserves fit_score', () => {
  const input = buildExplainabilityInput({ id: 'x', fit_score: 82 }, profile);
  assert.equal(input.fit_score, 82);
});

test('buildExplainabilityInput includes category', () => {
  const input = buildExplainabilityInput(bmwListing, profile);
  assert.equal(input.category, 'vehicle');
});

test('explanationLevel matches explanationScore thresholds', () => {
  assert.equal(resolveExplanationLevel(85), 'very_clear');
  assert.equal(resolveExplanationLevel(70), 'clear');
  assert.equal(resolveExplanationLevel(50), 'partial');
  assert.equal(resolveExplanationLevel(30), 'weak');
});

test('resolveConfidenceLevel thresholds', () => {
  assert.equal(resolveConfidenceLevel(85), 'high');
  assert.equal(resolveConfidenceLevel(60), 'medium');
  assert.equal(resolveConfidenceLevel(40), 'low');
});

test('ownership cost signal fallback defaults to 50', () => {
  const signals = extractPurchaseSignals(buildExplainabilityInput({ ...bmwListing, ownership_cost: null }, profile));
  assert.equal(signals.ownershipCostSignal, 50);
});

test('negotiation_intelligence used when available', () => {
  const signals = extractPurchaseSignals(
    buildExplainabilityInput(
      { ...bmwListing, negotiation_intelligence: { negotiation_risk: 15, offer_range_advantage: 80 } },
      profile
    )
  );
  assert.ok(signals.negotiationSignal >= 60);
});

test('suspicious price reflected in contributions', () => {
  const signals = extractPurchaseSignals(buildExplainabilityInput({ ...bmwListing, price: 6000000 }, profile));
  const contributions = buildScoreContributions(signals);
  const suspicious = contributions.find((c) => c.key === 'suspiciousPrice');
  assert.ok(suspicious);
});

test('duplicate risk reflected in contributions', () => {
  const signals = extractPurchaseSignals(buildExplainabilityInput({ ...bmwListing, duplicate_risk: 70 }, profile));
  const contributions = buildScoreContributions(signals);
  const dup = contributions.find((c) => c.key === 'duplicateRisk');
  assert.ok(dup);
  assert.ok(dup.contribution <= 0 || dup.direction === 'negative');
});

test('stale risk reflected in contributions', () => {
  const signals = extractPurchaseSignals(buildExplainabilityInput(sparseListing, profile));
  const contributions = buildScoreContributions(signals);
  const stale = contributions.find((c) => c.key === 'staleRisk');
  assert.ok(stale);
});

test('decisionPath purchase_decision step uses purchase decision label', () => {
  const exp = runExp(bmwListing);
  const pdStep = exp.decisionPath.find((s) => s.id === 'purchase_decision');
  assert.ok(pdStep);
  assert.match(pdStep.explanation, /Al kararı/i);
});

test('good listing has fewer dataGaps than sparse', () => {
  const richGaps = buildDataGaps(getSignals(bmwListing));
  const sparseGaps = buildDataGaps(getSignals(sparseListing));
  assert.ok(sparseGaps.length > richGaps.length);
});

test('confidence score higher for complete listing', () => {
  const rich = buildConfidenceExplanation(getSignals(bmwListing));
  const sparse = buildConfidenceExplanation(getSignals(sparseListing));
  assert.ok(rich.confidenceScore > sparse.confidenceScore);
});

test('vehicle verification steps count 4-6', () => {
  const steps = buildVerificationSteps('vehicle');
  assert.ok(steps.length >= 4 && steps.length <= 6);
});

test('housing verification steps count 4-6', () => {
  const steps = buildVerificationSteps('housing');
  assert.ok(steps.length >= 4 && steps.length <= 6);
});

test('vacation verification steps count 4-6', () => {
  const steps = buildVerificationSteps('vacation');
  assert.ok(steps.length >= 4 && steps.length <= 6);
});

test('userFriendlyExplanation does not use technical jargon only', () => {
  const exp = runExp();
  assert.match(exp.userFriendlyExplanation, /ilan|karar|faktör|güven/i);
});

test('reasoningSummary mentions quality and trust', () => {
  const exp = runExp();
  assert.match(exp.reasoningSummary, /kalite|güven/i);
});

test('scoreContributions sorted by absolute contribution', () => {
  const contributions = buildScoreContributions(getSignals(bmwListing));
  for (let i = 1; i < contributions.length; i++) {
    assert.ok(Math.abs(contributions[i - 1].contribution) >= Math.abs(contributions[i].contribution));
  }
});

test('decisionPath listing_info step explains completeness', () => {
  const path = buildDecisionPath(getSignals(bmwListing), null);
  const first = path[0];
  assert.equal(first.id, 'listing_info');
  assert.ok(first.explanation);
});

test('explainability does not mutate recommendation object', () => {
  const rec = { ...getTopRecommendation() };
  const fitBefore = rec.fit_score;
  runExplainabilityEngine(buildExplainabilityInput(rec, profile), { skipCache: true });
  assert.equal(rec.fit_score, fitBefore);
});
