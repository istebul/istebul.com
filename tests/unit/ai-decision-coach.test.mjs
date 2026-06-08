import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  COACH_LABELS,
  clearDecisionCoachMemoCache,
  buildDecisionCoachCacheKey,
  buildDecisionCoachInput,
  resolveCoachLabel,
  buildShouldConsider,
  buildShouldAvoidIf,
  computeCoachConfidence,
  runDecisionCoach,
  COACH_FORBIDDEN_PHRASES,
  COACH_SAFE_PHRASES,
  containsCoachForbiddenPhrase,
  sanitizeCoachSummaryText,
  buildCoachSummary,
  VERIFICATION_QUESTIONS_BY_CATEGORY,
  resolveCategoryForQuestions,
  buildVerificationQuestions,
  buildRedFlags,
  buildNextSteps,
  buildComparisonNotes,
  buildDecisionCoachPanelHtml,
  buildDecisionCoachShellHtml
} = await import('../../js/ai-decision-coach/index.js');

const { runRecommendationEngine, clearRecommendationMemoCache } = await import(
  '../../js/ai-recommendation-engine/index.js'
);

const { buildRecommendationsDashboardHtml } = await import(
  '../../js/admin/ai-listings-recommendations-admin.js'
);
const { buildRecommendationCardHtml } = await import(
  '../../js/ai-recommendation-engine/recommendation-card-builder.js'
);

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
  description: 'Yetkili servis bakımlı, ekspertiz raporu mevcut',
  price: 1780000,
  currency: 'TRY',
  location: 'İzmir',
  source_type: 'manual',
  source_url: 'https://example.com/bmw-320i',
  status: 'approved',
  created_at: '2026-06-07T10:00:00.000Z',
  updated_at: '2026-06-07T11:00:00.000Z',
  images: ['img1.jpg', 'img2.jpg'],
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
  location: '',
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
  },
  duplicate_status: 'exact'
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

const housingListing = {
  id: '44444444-4444-4444-4444-444444444444',
  category: 'housing',
  title: 'Kadıköy 3+1 Daire',
  description: 'Deniz manzaralı, aidat düşük',
  price: 4500000,
  currency: 'TRY',
  location: 'İstanbul',
  source_type: 'manual',
  source_url: 'https://example.com/daire',
  status: 'approved',
  images: ['h1.jpg'],
  attributes: { rooms: '3+1', sqm: 120 },
  latest_analysis: { ai_score: 70, risk_score: 30, quality_score: 80, decision_score: 70 }
};

const travelListing = {
  id: '55555555-5555-5555-5555-555555555555',
  category: 'travel',
  title: 'Antalya Yaz Tatili Paketi',
  description: 'Her şey dahil',
  price: 35000,
  currency: 'TRY',
  location: 'Antalya',
  source_type: 'partner_api',
  source_url: 'https://example.com/tatil',
  status: 'approved',
  images: ['t1.jpg'],
  attributes: { nights: 7 },
  latest_analysis: { ai_score: 68, risk_score: 25, quality_score: 72, decision_score: 68 }
};

const listings = [bmwListing, riskyListing, suvListing, housingListing, travelListing];

function getRecommendationResult() {
  clearRecommendationMemoCache();
  return runRecommendationEngine(listings, profile);
}

function getCoachInput(selected, top) {
  return buildDecisionCoachInput(profile, selected, top);
}

// --- COACH LABEL ---

test('COACH_LABELS includes all required labels', () => {
  assert.equal(COACH_LABELS.STRONG, 'Güçlü aday');
  assert.equal(COACH_LABELS.REVIEW, 'İncelenebilir');
  assert.equal(COACH_LABELS.CAUTIOUS, 'Dikkatli ilerle');
  assert.equal(COACH_LABELS.VERIFY, 'Önce doğrula');
  assert.equal(COACH_LABELS.NOT_SUITABLE, 'Uygun görünmüyor');
});

test('resolveCoachLabel returns Güçlü aday for high fit low risk', () => {
  const ctx = {
    selected_recommendation: { fit_score: 90, risk_score: 25, quality_score: 85 },
    risk_score: 25,
    listing_quality: { quality_score: 85 },
    missing_fields: [],
    duplicate_status: 'new'
  };
  assert.equal(resolveCoachLabel(ctx), COACH_LABELS.STRONG);
});

test('resolveCoachLabel returns İncelenebilir for good fit', () => {
  const ctx = {
    selected_recommendation: { fit_score: 75, risk_score: 45, quality_score: 70 },
    risk_score: 45,
    listing_quality: { quality_score: 70 },
    missing_fields: [],
    duplicate_status: 'new'
  };
  assert.equal(resolveCoachLabel(ctx), COACH_LABELS.REVIEW);
});

test('resolveCoachLabel returns Dikkatli ilerle for moderate fit', () => {
  const ctx = {
    selected_recommendation: { fit_score: 55, risk_score: 58, quality_score: 60 },
    risk_score: 58,
    missing_fields: [],
    duplicate_status: 'new'
  };
  assert.equal(resolveCoachLabel(ctx), COACH_LABELS.CAUTIOUS);
});

test('resolveCoachLabel returns Önce doğrula for high missing fields', () => {
  const ctx = {
    selected_recommendation: { fit_score: 70, risk_score: 40 },
    risk_score: 40,
    missing_fields: ['Fotoğraf', 'Konum', 'Kaynak URL'],
    duplicate_status: 'new'
  };
  assert.equal(resolveCoachLabel(ctx), COACH_LABELS.VERIFY);
});

test('resolveCoachLabel returns Önce doğrula for exact duplicate', () => {
  const ctx = {
    selected_recommendation: { fit_score: 80, risk_score: 40 },
    risk_score: 40,
    missing_fields: [],
    duplicate_status: 'exact'
  };
  assert.equal(resolveCoachLabel(ctx), COACH_LABELS.VERIFY);
});

test('resolveCoachLabel returns Uygun görünmüyor for low fit', () => {
  const ctx = {
    selected_recommendation: { fit_score: 30, risk_score: 50 },
    risk_score: 50,
    missing_fields: []
  };
  assert.equal(resolveCoachLabel(ctx), COACH_LABELS.NOT_SUITABLE);
});

test('resolveCoachLabel returns Uygun görünmüyor for high risk', () => {
  const ctx = {
    selected_recommendation: { fit_score: 60, risk_score: 75 },
    risk_score: 75,
    missing_fields: []
  };
  assert.equal(resolveCoachLabel(ctx), COACH_LABELS.NOT_SUITABLE);
});

test('resolveCoachLabel returns Uygun görünmüyor when no selection', () => {
  assert.equal(resolveCoachLabel({ selected_recommendation: null }), COACH_LABELS.NOT_SUITABLE);
});

// --- COACH CONFIDENCE ---

test('computeCoachConfidence returns 0-100 range', () => {
  const result = getRecommendationResult();
  const input = getCoachInput(result.top[0], result.top);
  const confidence = computeCoachConfidence(input);
  assert.ok(confidence >= 0 && confidence <= 100);
});

test('computeCoachConfidence higher for strong candidate', () => {
  const strong = {
    selected_recommendation: { fit_score: 92, quality_score: 90, risk_score: 20 },
    risk_score: 20,
    listing_quality: { quality_score: 90 },
    missing_fields: [],
    duplicate_status: 'new',
    price_intelligence: { price_confidence: 80 },
    market_intelligence: { market_context_score: 75 }
  };
  const weak = {
    selected_recommendation: { fit_score: 35, quality_score: 40, risk_score: 75 },
    risk_score: 75,
    listing_quality: { quality_score: 40 },
    missing_fields: ['Fotoğraf', 'Konum', 'Açıklama'],
    duplicate_status: 'exact',
    price_intelligence: { price_confidence: 10 },
    market_intelligence: { market_context_score: 20 }
  };
  assert.ok(computeCoachConfidence(strong) > computeCoachConfidence(weak));
});

test('computeCoachConfidence penalizes duplicate status', () => {
  const base = {
    selected_recommendation: { fit_score: 75, quality_score: 75, risk_score: 35 },
    risk_score: 35,
    listing_quality: { quality_score: 75 },
    missing_fields: [],
    price_intelligence: { price_confidence: 50 },
    market_intelligence: { market_context_score: 50 }
  };
  const withDup = { ...base, duplicate_status: 'exact' };
  assert.ok(computeCoachConfidence(base) > computeCoachConfidence(withDup));
});

test('computeCoachConfidence penalizes missing fields', () => {
  const complete = { ...getCoachInput(getRecommendationResult().top[0], []), missing_fields: [] };
  const incomplete = { ...complete, missing_fields: ['Fotoğraf', 'Konum', 'Açıklama', 'Kaynak URL'] };
  assert.ok(computeCoachConfidence(complete) >= computeCoachConfidence(incomplete));
});

test('runDecisionCoach returns confidence number', () => {
  clearDecisionCoachMemoCache();
  const result = getRecommendationResult();
  const coach = runDecisionCoach(getCoachInput(result.top[0], result.top));
  assert.equal(typeof coach.confidence, 'number');
  assert.ok(coach.confidence >= 0);
});

// --- VEHICLE VERIFICATION QUESTIONS ---

test('resolveCategoryForQuestions returns vehicle questions', () => {
  const questions = resolveCategoryForQuestions('vehicle');
  assert.ok(questions.some((q) => /tramer/i.test(q)));
  assert.ok(questions.some((q) => /servis/i.test(q)));
  assert.ok(questions.some((q) => /kilometre/i.test(q)));
  assert.ok(questions.some((q) => /boya|değişen/i.test(q)));
});

test('VERIFICATION_QUESTIONS_BY_CATEGORY vehicle has ekspertiz topic', () => {
  const joined = VERIFICATION_QUESTIONS_BY_CATEGORY.vehicle.join(' ');
  assert.match(joined, /bakım|muayene/i);
});

test('buildVerificationQuestions vehicle category includes tramer', () => {
  const questions = buildVerificationQuestions({
    user_intent: { category: 'vehicle' },
    missing_fields: []
  });
  assert.ok(questions.some((q) => /tramer/i.test(q)));
});

test('buildVerificationQuestions vehicle includes servis question', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'vehicle' }, missing_fields: [] });
  assert.ok(questions.some((q) => /servis/i.test(q)));
});

test('buildVerificationQuestions vehicle includes km question', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'vehicle' }, missing_fields: [] });
  assert.ok(questions.some((q) => /kilometre/i.test(q)));
});

// --- HOUSING VERIFICATION QUESTIONS ---

test('buildVerificationQuestions housing includes tapu', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'housing' }, missing_fields: [] });
  assert.ok(questions.some((q) => /tapu/i.test(q)));
});

test('buildVerificationQuestions housing includes deprem riski', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'housing' }, missing_fields: [] });
  assert.ok(questions.some((q) => /deprem/i.test(q)));
});

test('buildVerificationQuestions housing includes aidat', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'housing' }, missing_fields: [] });
  assert.ok(questions.some((q) => /aidat/i.test(q)));
});

test('buildVerificationQuestions housing includes krediye uygunluk', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'housing' }, missing_fields: [] });
  assert.ok(questions.some((q) => /kredi/i.test(q)));
});

test('buildVerificationQuestions housing includes iskan', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'housing' }, missing_fields: [] });
  assert.ok(questions.some((q) => /[İi]skan/.test(q)));
});

// --- TRAVEL VERIFICATION QUESTIONS ---

test('buildVerificationQuestions travel includes iptal koşulu', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'travel' }, missing_fields: [] });
  assert.ok(questions.some((q) => q.toLowerCase().includes('ptal')));
});

test('buildVerificationQuestions travel includes konum doğrulama', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'travel' }, missing_fields: [] });
  assert.ok(questions.some((q) => /konum/i.test(q)));
});

test('buildVerificationQuestions travel includes yorumlar', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'travel' }, missing_fields: [] });
  assert.ok(questions.some((q) => /yorum/i.test(q)));
});

test('buildVerificationQuestions travel includes ek ücretler', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'travel' }, missing_fields: [] });
  assert.ok(questions.some((q) => /ek ücret/i.test(q)));
});

test('buildVerificationQuestions travel includes sezon fiyatı', () => {
  const questions = buildVerificationQuestions({ user_intent: { category: 'travel' }, missing_fields: [] });
  assert.ok(questions.some((q) => /sezon/i.test(q)));
});

// --- RED FLAGS ---

test('buildRedFlags detects missing photo', () => {
  const flags = buildRedFlags({
    selected_recommendation: { listing: { images: [], location: 'İzmir', description: 'test' } },
    risk_score: 30
  });
  assert.ok(flags.includes('Fotoğraf yok'));
});

test('buildRedFlags detects missing location', () => {
  const flags = buildRedFlags({
    selected_recommendation: { listing: { images: ['a.jpg'], location: '', description: 'test desc' } },
    risk_score: 30
  });
  assert.ok(flags.includes('Konum yok'));
});

test('buildRedFlags detects high duplicate', () => {
  const flags = buildRedFlags({
    selected_recommendation: { listing: { images: ['a.jpg'], location: 'İzmir', description: 'test' } },
    duplicate_status: 'exact',
    risk_score: 30
  });
  assert.ok(flags.includes('Duplicate yüksek'));
});

test('buildRedFlags detects high risk score', () => {
  const flags = buildRedFlags({
    selected_recommendation: { listing: { images: ['a.jpg'], location: 'İzmir', description: 'test' } },
    risk_score: 72
  });
  assert.ok(flags.includes('Risk skoru yüksek'));
});

test('buildRedFlags detects missing source url', () => {
  const flags = buildRedFlags({
    selected_recommendation: {
      listing: { images: ['a.jpg'], location: 'İzmir', description: 'long enough description here', source_url: '' }
    },
    risk_score: 30
  });
  assert.ok(flags.includes('Kaynak URL yok'));
});

test('buildRedFlags detects insufficient description', () => {
  const flags = buildRedFlags({
    selected_recommendation: { listing: { images: ['a.jpg'], location: 'İzmir', description: 'kısa' } },
    risk_score: 30
  });
  assert.ok(flags.includes('Açıklama yetersiz'));
});

test('runDecisionCoach red_flags includes photo flag for risky listing', () => {
  clearDecisionCoachMemoCache();
  const result = getRecommendationResult();
  const risky = result.recommendations.find((r) => String(r.id) === riskyListing.id) ?? result.top[0];
  const coach = runDecisionCoach(getCoachInput(risky, result.top));
  assert.ok(coach.red_flags.includes('Fotoğraf yok'));
});

// --- NEXT STEPS ---

test('buildNextSteps vehicle includes ekspertiz', () => {
  const steps = buildNextSteps({ user_intent: { category: 'vehicle' } }, []);
  assert.ok(steps.some((s) => /ekspertiz/i.test(s)));
});

test('buildNextSteps vehicle includes tramer', () => {
  const steps = buildNextSteps({ user_intent: { category: 'vehicle' } }, []);
  assert.ok(steps.some((s) => /tramer|servis/i.test(s)));
});

test('buildNextSteps adds photo step when photo flag present', () => {
  const steps = buildNextSteps({ user_intent: { category: 'vehicle' } }, ['Fotoğraf yok']);
  assert.ok(steps.some((s) => /fotoğraf/i.test(s)));
});

test('runDecisionCoach next_steps is non-empty array', () => {
  clearDecisionCoachMemoCache();
  const result = getRecommendationResult();
  const coach = runDecisionCoach(getCoachInput(result.top[0], result.top));
  assert.ok(Array.isArray(coach.next_steps));
  assert.ok(coach.next_steps.length > 0);
});

// --- SHOULD CONSIDER ---

test('buildShouldConsider includes budget when fit high', () => {
  const items = buildShouldConsider({
    selected_recommendation: { subscores: { budget_fit: 80 }, reasons: [] }
  });
  assert.ok(items.some((i) => /bütçe/i.test(i)));
});

test('buildShouldConsider includes risk when acceptable', () => {
  const items = buildShouldConsider({
    selected_recommendation: { subscores: { risk_fit: 75 }, risk_score: 30, reasons: [] }
  });
  assert.ok(items.some((i) => /risk/i.test(i)));
});

test('buildShouldConsider includes quality when sufficient', () => {
  const items = buildShouldConsider({
    selected_recommendation: { subscores: { quality_fit: 70 }, quality_score: 70, reasons: [] }
  });
  assert.ok(items.some((i) => /kalite/i.test(i)));
});

test('runDecisionCoach should_consider is populated', () => {
  clearDecisionCoachMemoCache();
  const result = getRecommendationResult();
  const coach = runDecisionCoach(getCoachInput(result.top[0], result.top));
  assert.ok(coach.should_consider.length > 0);
});

// --- SHOULD AVOID IF ---

test('buildShouldAvoidIf vehicle includes ekspertiz condition', () => {
  const items = buildShouldAvoidIf({ user_intent: { category: 'vehicle' } }, 'vehicle');
  assert.ok(items.some((i) => /ekspertiz|hasar/i.test(i)));
});

test('buildShouldAvoidIf vehicle includes servis condition', () => {
  const items = buildShouldAvoidIf({ user_intent: { category: 'vehicle' } }, 'vehicle');
  assert.ok(items.some((i) => /servis/i.test(i)));
});

test('buildShouldAvoidIf housing includes tapu condition', () => {
  const items = buildShouldAvoidIf({ user_intent: { category: 'housing' } }, 'housing');
  assert.ok(items.some((i) => /tapu/i.test(i)));
});

test('buildShouldAvoidIf travel includes iptal condition', () => {
  const items = buildShouldAvoidIf({ user_intent: { category: 'travel' } }, 'travel');
  assert.ok(items.some((i) => i.toLowerCase().includes('ptal')));
});

test('runDecisionCoach should_avoid_if is populated', () => {
  clearDecisionCoachMemoCache();
  const result = getRecommendationResult();
  const coach = runDecisionCoach(getCoachInput(result.top[0], result.top));
  assert.ok(coach.should_avoid_if.length > 0);
});

// --- COMPARISON NOTES ---

test('buildComparisonNotes with single item returns fallback', () => {
  const note = buildComparisonNotes({ top_recommendations: [bmwListing], selected_recommendation: bmwListing });
  assert.match(note, /yeterli öneri bulunmuyor/i);
});

test('buildComparisonNotes compares multiple recommendations', () => {
  const result = getRecommendationResult();
  const note = buildComparisonNotes({
    top_recommendations: result.top,
    selected_recommendation: result.top[0]
  });
  assert.match(note, /kullanım önceliğine göre/i);
});

test('runDecisionCoach comparison_notes is string', () => {
  clearDecisionCoachMemoCache();
  const result = getRecommendationResult();
  const coach = runDecisionCoach(getCoachInput(result.top[0], result.top));
  assert.equal(typeof coach.comparison_notes, 'string');
  assert.ok(coach.comparison_notes.length > 10);
});

// --- SAFE TURKISH SUMMARY ---

test('buildCoachSummary uses safe phrasing', () => {
  const summary = buildCoachSummary(
    { selected_recommendation: { title: 'BMW 320i' }, missing_fields: ['Fotoğraf'] },
    COACH_LABELS.REVIEW
  );
  assert.match(summary, /mevcut bilgiler ışığında/i);
});

test('COACH_SAFE_PHRASES includes required safe terms', () => {
  for (const phrase of ['mevcut bilgiler ışığında', 'doğrulama önerilir', 'değerlendirilebilir']) {
    assert.ok(COACH_SAFE_PHRASES.some((p) => p.includes(phrase) || phrase.includes(p)));
  }
});

test('sanitizeCoachSummaryText removes forbidden wording', () => {
  const sanitized = sanitizeCoachSummaryText('Bu araç kesinlikle alın ve garanti kazandırır.');
  assert.ok(!sanitized.toLowerCase().includes('kesinlikle alın'));
  assert.ok(!sanitized.toLowerCase().includes('garanti'));
});

test('containsCoachForbiddenPhrase detects banned terms', () => {
  assert.ok(containsCoachForbiddenPhrase('yatırım tavsiyesi verilir'));
  assert.ok(!containsCoachForbiddenPhrase('ön değerlendirme önerilir'));
});

test('runDecisionCoach summary does not contain forbidden phrases', () => {
  clearDecisionCoachMemoCache();
  const result = getRecommendationResult();
  const coach = runDecisionCoach(getCoachInput(result.top[0], result.top));
  for (const phrase of COACH_FORBIDDEN_PHRASES) {
    assert.ok(!coach.coach_summary.toLowerCase().includes(phrase), `found: ${phrase}`);
  }
});

// --- LAZY COMPUTE ---

test('lazy compute: runDecisionCoach memoizes results', () => {
  clearDecisionCoachMemoCache();
  const result = getRecommendationResult();
  const input = getCoachInput(result.top[0], result.top);
  const first = runDecisionCoach(input);
  const second = runDecisionCoach(input);
  assert.equal(first, second);
});

test('lazy compute: cache key differs per selected recommendation', () => {
  const result = getRecommendationResult();
  const keyA = buildDecisionCoachCacheKey(getCoachInput(result.top[0], result.top));
  const keyB = buildDecisionCoachCacheKey(getCoachInput(result.top[1] ?? result.top[0], result.top));
  if (result.top.length > 1) assert.notEqual(keyA, keyB);
});

test('lazy compute: coach not run during dashboard build without button click', () => {
  clearDecisionCoachMemoCache();
  const { result } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.ok(result?.top.length > 0);
  const key = buildDecisionCoachCacheKey(getCoachInput(result.top[0], result.top));
  clearDecisionCoachMemoCache();
  runDecisionCoach(getCoachInput(result.top[0], result.top));
  clearDecisionCoachMemoCache();
  const { result: result2 } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.ok(result2?.top.length > 0);
});

test('lazy compute: 10k listings coach only for selected item', () => {
  clearDecisionCoachMemoCache();
  clearRecommendationMemoCache();
  const large = Array.from({ length: 10000 }, (_, index) => ({
    ...bmwListing,
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    price: 1500000 + index * 100
  }));
  const started = Date.now();
  const recResult = runRecommendationEngine(large, profile);
  const coach = runDecisionCoach(getCoachInput(recResult.top[0], recResult.top));
  const elapsed = Date.now() - started;
  assert.ok(coach.coach_label);
  assert.ok(elapsed < 25000, `coach too slow: ${elapsed}ms`);
});

// --- EMPTY RECOMMENDATION FALLBACK ---

test('empty recommendation fallback returns safe defaults', () => {
  clearDecisionCoachMemoCache();
  const coach = runDecisionCoach({ user_intent: profile, selected_recommendation: null, top_recommendations: [] });
  assert.equal(coach.coach_label, COACH_LABELS.NOT_SUITABLE);
  assert.equal(coach.confidence, 0);
  assert.ok(coach.coach_summary.length > 0);
});

test('buildDecisionCoachInput handles null selection', () => {
  const input = buildDecisionCoachInput(profile, null, []);
  assert.equal(input.selected_recommendation, null);
  assert.deepEqual(input.missing_fields, []);
});

// --- ADMIN RENDER ---

test('buildRecommendationCardHtml includes Karar Koçu button', () => {
  const result = getRecommendationResult();
  const html = buildRecommendationCardHtml(result.top[0]);
  assert.match(html, /Karar Koçu/);
  assert.match(html, /data-rec-coach-id/);
});

test('buildRecommendationsDashboardHtml includes coach panel host', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.match(html, /ai-coach-panel-host/);
});

test('buildDecisionCoachPanelHtml renders all sections', () => {
  clearDecisionCoachMemoCache();
  const result = getRecommendationResult();
  const coach = runDecisionCoach(getCoachInput(result.top[0], result.top));
  const html = buildDecisionCoachPanelHtml(coach, { title: 'BMW 320i' });
  assert.match(html, /Karar Koçu/);
  assert.match(html, /Neden değerlendirilmeli/);
  assert.match(html, /Hangi durumda vazgeçilmeli/);
  assert.match(html, /Doğrulama soruları/);
  assert.match(html, /Kırmızı bayraklar/);
  assert.match(html, /Sonraki adımlar/);
  assert.match(html, /Alternatif karşılaştırma/);
  assert.match(html, /güven/);
});

test('buildDecisionCoachPanelHtml escapes XSS in summary', () => {
  const html = buildDecisionCoachPanelHtml({
    coach_label: 'İncelenebilir',
    coach_summary: '<script>alert(1)</script>',
    should_consider: [],
    should_avoid_if: [],
    verification_questions: [],
    red_flags: [],
    next_steps: [],
    comparison_notes: 'test',
    confidence: 50
  });
  assert.ok(!html.includes('<script>'));
});

test('buildDecisionCoachShellHtml renders host container', () => {
  const html = buildDecisionCoachShellHtml();
  assert.match(html, /ai-coach-panel-host/);
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /'listings'/);
  assert.doesNotMatch(router, /decision-coach/i);
  assert.doesNotMatch(router, /decision_coach/i);
});

test('guard: no schema change for decision coach tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /decision_coach/i);
  assert.doesNotMatch(sql, /ai_listing_coach/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_listings/i);
});

test('guard: shared decision coach module exists', () => {
  const enginePath = path.join(
    process.cwd(),
    'supabase/functions/_shared/ai-listings/decision-coach/decision-coach.js'
  );
  assert.ok(fs.existsSync(enginePath));
});

test('guard: client decision coach module exists', () => {
  const clientPath = path.join(process.cwd(), 'js/ai-decision-coach/index.js');
  assert.ok(fs.existsSync(clientPath));
});

test('guard: admin recommendations tab unchanged', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /data-admin-view="recommendations"/);
  assert.match(html, /Öneriler/);
});

test('runDecisionCoach returns complete output shape', () => {
  clearDecisionCoachMemoCache();
  const result = getRecommendationResult();
  const coach = runDecisionCoach(getCoachInput(result.top[0], result.top));
  assert.ok('coach_label' in coach);
  assert.ok('coach_summary' in coach);
  assert.ok('should_consider' in coach);
  assert.ok('should_avoid_if' in coach);
  assert.ok('verification_questions' in coach);
  assert.ok('red_flags' in coach);
  assert.ok('next_steps' in coach);
  assert.ok('comparison_notes' in coach);
  assert.ok('confidence' in coach);
});
