import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  clearExecutiveReportMemoCache,
  buildExecutiveReportCacheKey,
  buildExecutiveReportInput,
  runExecutiveReportEngine,
  REPORT_LEVEL_LABELS,
  EXECUTIVE_REPORT_FORBIDDEN_PHRASES,
  DATA_LIMITATION_LABELS,
  resolveReportLevel,
  computeReportScore,
  sanitizeExecutiveReportText,
  containsForbiddenExecutiveReportPhrase,
  buildExecutiveSummary,
  buildDataLimitations,
  buildVerificationChecklist,
  buildSection,
  resolveSectionStatus,
  buildRecommendationSection,
  buildOwnershipCostSection,
  buildQualityTrustSection,
  buildNegotiationSection,
  buildPurchaseDecisionSection,
  buildExplainabilitySection,
  buildDecisionSnapshot,
  buildRiskSummary,
  CATEGORY_ACTION_PLANS,
  buildActionPlan,
  PDF_DISCLAIMERS,
  buildPdfPayload,
  buildExecutiveReportPanelHtml,
  buildExecutiveReportShellHtml
} = await import('../../js/ai-executive-decision-report/index.js');

const { extractPurchaseSignals } = await import('../../js/ai-purchase-decision/decision-strength-engine.js');
const { runRecommendationEngine, clearRecommendationMemoCache } = await import(
  '../../js/ai-recommendation-engine/index.js'
);
const { runPurchaseDecisionEngine, clearPurchaseDecisionMemoCache, buildPurchaseDecisionInput } = await import(
  '../../js/ai-purchase-decision/index.js'
);
const { runExplainabilityEngine, clearExplainabilityMemoCache, buildExplainabilityInput } = await import(
  '../../js/ai-decision-explainability/index.js'
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

function runEdr(rec = null, intent = profile) {
  clearExecutiveReportMemoCache();
  clearPurchaseDecisionMemoCache();
  clearExplainabilityMemoCache();
  const recommendation = rec ?? getTopRecommendation();
  const input = buildExecutiveReportInput(recommendation, intent);
  return runExecutiveReportEngine(input);
}

function getSignals(rec = bmwListing) {
  return extractPurchaseSignals(buildExecutiveReportInput(rec, profile));
}

// --- REPORT SCORE BOUNDS ---

test('reportScore is between 0 and 100', () => {
  const edr = runEdr();
  assert.ok(edr.reportScore >= 0 && edr.reportScore <= 100);
});

test('reportScore clamps via computeReportScore', () => {
  const score = computeReportScore({ signals: {}, sections: [] });
  assert.ok(score >= 0 && score <= 100);
});

test('rich data produces higher reportScore than sparse', () => {
  const rich = runEdr(bmwListing);
  const sparse = runEdr(sparseListing);
  assert.ok(rich.reportScore >= sparse.reportScore);
});

test('computeReportScore rewards available sections', () => {
  const withSections = computeReportScore({
    signals: { hasPriceEvidence: true, hasImageEvidence: true, missingCritical: [] },
    sections: [{ dataAvailable: true }, { dataAvailable: true }, { dataAvailable: true }],
    purchase_decision: { decisionScore: 70 },
    explainability: { explanationScore: 65 }
  });
  const without = computeReportScore({ signals: {}, sections: [] });
  assert.ok(withSections > without);
});

// --- REPORT LEVEL THRESHOLDS ---

test('resolveReportLevel complete at 80+', () => {
  assert.equal(resolveReportLevel(80), 'complete');
  assert.equal(resolveReportLevel(100), 'complete');
});

test('resolveReportLevel strong at 65-79', () => {
  assert.equal(resolveReportLevel(65), 'strong');
  assert.equal(resolveReportLevel(79), 'strong');
});

test('resolveReportLevel partial at 45-64', () => {
  assert.equal(resolveReportLevel(45), 'partial');
  assert.equal(resolveReportLevel(64), 'partial');
});

test('resolveReportLevel weak below 45', () => {
  assert.equal(resolveReportLevel(44), 'weak');
  assert.equal(resolveReportLevel(0), 'weak');
});

test('reportLabel matches reportLevel Turkish labels', () => {
  const edr = runEdr();
  assert.equal(edr.reportLabel, REPORT_LEVEL_LABELS[edr.reportLevel]);
});

test('REPORT_LEVEL_LABELS has all four Turkish labels', () => {
  assert.equal(REPORT_LEVEL_LABELS.complete, 'Tam rapor');
  assert.equal(REPORT_LEVEL_LABELS.strong, 'Güçlü rapor');
  assert.equal(REPORT_LEVEL_LABELS.partial, 'Kısmi rapor');
  assert.equal(REPORT_LEVEL_LABELS.weak, 'Zayıf rapor');
});

// --- EXECUTIVE SUMMARY ---

test('executiveSummary is a non-empty Turkish string', () => {
  const edr = runEdr();
  assert.ok(edr.executiveSummary.length > 20);
  assert.match(edr.executiveSummary, /rapor|karar|veri/i);
});

test('executiveSummary does not contain banned phrases', () => {
  const edr = runEdr();
  for (const phrase of EXECUTIVE_REPORT_FORBIDDEN_PHRASES) {
    assert.ok(!edr.executiveSummary.toLowerCase().includes(phrase), `Found banned: ${phrase}`);
  }
});

test('sanitizeExecutiveReportText removes banned phrases', () => {
  const safe = sanitizeExecutiveReportText('Bu kesin alınır ve yatırım tavsiyesi değildir.');
  assert.ok(!containsForbiddenExecutiveReportPhrase(safe));
});

test('buildExecutiveSummary uses safe language for weak report', () => {
  const summary = buildExecutiveSummary({
    reportLevel: 'weak',
    purchase_decision: { decisionLabel: 'Bekle' },
    signals: { missingCritical: ['Tramer'], hasPriceEvidence: false, hasOwnershipCostData: false }
  });
  assert.match(summary, /sınırlı|temkinli/i);
});

// --- DECISION SNAPSHOT ---

test('decisionSnapshot has all required fields', () => {
  const edr = runEdr();
  const snap = edr.decisionSnapshot;
  const fields = [
    'primaryDecisionLabel', 'decisionScore', 'confidenceScore', 'riskLevel',
    'primaryAction', 'recommendationScore', 'qualityScore', 'trustScore', 'explanationScore'
  ];
  for (const f of fields) assert.ok(f in snap, `Missing: ${f}`);
});

test('decisionSnapshot scores are 0-100', () => {
  const snap = runEdr().decisionSnapshot;
  for (const key of ['decisionScore', 'confidenceScore', 'recommendationScore', 'qualityScore', 'trustScore', 'explanationScore']) {
    assert.ok(snap[key] >= 0 && snap[key] <= 100, `${key} out of bounds`);
  }
});

test('buildDecisionSnapshot preserves recommendation fit_score', () => {
  const rec = { id: 'x', fit_score: 87 };
  const snap = buildDecisionSnapshot({
    recommendation: rec,
    signals: getSignals(rec),
    purchase_decision: {},
    explainability: {}
  });
  assert.equal(snap.recommendationScore, 87);
});

// --- SECTION BUILDER FALLBACK ---

test('buildRecommendationSection fallback when null', () => {
  const section = buildRecommendationSection(null);
  assert.equal(section.dataAvailable, false);
  assert.equal(section.score, 0);
});

test('buildOwnershipCostSection fallback when null', () => {
  const section = buildOwnershipCostSection(null);
  assert.equal(section.dataAvailable, false);
  assert.match(section.summary, /eksik|sınırlı/i);
});

test('buildQualityTrustSection fallback with empty signals', () => {
  const section = buildQualityTrustSection({ qualityScore: 0, trustScore: 0 });
  assert.equal(section.dataAvailable, false);
});

test('buildNegotiationSection fallback without data', () => {
  const section = buildNegotiationSection({ negotiationSignal: 0, hasNegotiationData: false }, null);
  assert.equal(section.dataAvailable, false);
});

test('buildPurchaseDecisionSection fallback when null', () => {
  const section = buildPurchaseDecisionSection(null);
  assert.equal(section.dataAvailable, false);
});

test('buildExplainabilitySection fallback when null', () => {
  const section = buildExplainabilitySection(null);
  assert.equal(section.dataAvailable, false);
});

test('resolveSectionStatus positive at 70+', () => {
  assert.equal(resolveSectionStatus(70), 'positive');
  assert.equal(resolveSectionStatus(90), 'positive');
});

test('resolveSectionStatus negative below 35', () => {
  assert.equal(resolveSectionStatus(20), 'negative');
});

test('buildSection sanitizes summary and bullets', () => {
  const section = buildSection('Test', 'neutral', 50, 'kesin alınır test', ['kaçırılmaz fırsat'], true);
  assert.ok(!containsForbiddenExecutiveReportPhrase(section.summary));
  assert.ok(!containsForbiddenExecutiveReportPhrase(section.bullets[0]));
});

// --- RECOMMENDATION SECTION ---

test('recommendationSection has required shape', () => {
  const edr = runEdr();
  const s = edr.recommendationSection;
  assert.ok(['title', 'status', 'score', 'summary', 'bullets', 'dataAvailable'].every((k) => k in s));
});

test('recommendationSection dataAvailable true for valid recommendation', () => {
  const section = buildRecommendationSection({ id: 'x', fit_score: 80, recommendation_label: 'Uygun' });
  assert.equal(section.dataAvailable, true);
  assert.equal(section.score, 80);
});

// --- OWNERSHIP COST SECTION ---

test('ownershipCostSection populated for valid listing', () => {
  const edr = runEdr(bmwListing);
  assert.equal(edr.ownershipCostSection.dataAvailable, true);
  assert.ok(edr.ownershipCostSection.score > 0);
});

// --- QUALITY TRUST SECTION ---

test('qualityTrustSection uses signal scores', () => {
  const signals = getSignals(bmwListing);
  const section = buildQualityTrustSection(signals);
  assert.equal(section.dataAvailable, true);
  assert.ok(section.score > 0);
});

// --- NEGOTIATION SECTION ---

test('negotiationSection available with negotiation data', () => {
  const edr = runEdr(bmwListing);
  assert.ok('negotiationSection' in edr);
  assert.ok(edr.negotiationSection.bullets.length > 0);
});

// --- PURCHASE DECISION SECTION ---

test('purchaseDecisionSection reflects purchase decision', () => {
  const edr = runEdr(bmwListing);
  assert.equal(edr.purchaseDecisionSection.dataAvailable, true);
  assert.equal(edr.purchaseDecisionSection.score, edr.decisionSnapshot.decisionScore);
});

// --- EXPLAINABILITY SECTION ---

test('explainabilitySection reflects explanation score', () => {
  const edr = runEdr(bmwListing);
  assert.equal(edr.explainabilitySection.dataAvailable, true);
  assert.equal(edr.explainabilitySection.score, edr.decisionSnapshot.explanationScore);
});

// --- RISK SUMMARY ---

test('riskSummary topRisks max 5', () => {
  const edr = runEdr(sparseListing);
  assert.ok(edr.riskSummary.topRisks.length <= 5);
});

test('riskSummary criticalWarnings max 3', () => {
  const edr = runEdr(sparseListing);
  assert.ok(edr.riskSummary.criticalWarnings.length <= 3);
});

test('riskSummary has riskLevel and riskExplanation', () => {
  const rs = buildRiskSummary(getSignals(sparseListing), null, null);
  assert.ok(['low', 'medium', 'high'].includes(rs.riskLevel));
  assert.ok(rs.riskExplanation.length > 10);
});

test('riskSummary includes missing field risks', () => {
  const signals = getSignals(sparseListing);
  const rs = buildRiskSummary(signals, null, null);
  assert.ok(rs.topRisks.some((r) => r.label.includes('Eksik')));
});

// --- ACTION PLAN ---

test('actionPlan vehicle has tramer check', () => {
  const plan = buildActionPlan('vehicle', getSignals(bmwListing), null);
  const all = [...plan.immediateActions, ...plan.documentsToCheck].join(' ');
  assert.match(all, /Tramer|hasar/i);
});

test('actionPlan vehicle has ekspertiz', () => {
  const plan = buildActionPlan('vehicle', getSignals(bmwListing), null);
  const all = [...plan.documentsToCheck].join(' ');
  assert.match(all, /Ekspertiz/i);
});

test('actionPlan housing has tapu', () => {
  const plan = buildActionPlan('housing', getSignals(housingListing), null);
  const all = [...plan.immediateActions, ...plan.documentsToCheck].join(' ');
  assert.match(all, /Tapu/i);
});

test('actionPlan housing has iskan', () => {
  const plan = buildActionPlan('housing', getSignals(housingListing), null);
  const all = [...plan.beforeNegotiation, ...plan.documentsToCheck].join(' ');
  assert.match(all, /İskân|iskan/i);
});

test('actionPlan vacation has iptal', () => {
  const plan = buildActionPlan('vacation', getSignals(travelListing), null);
  const all = [...plan.immediateActions].join(' ');
  assert.match(all, /İptal/i);
});

test('actionPlan vacation has konum', () => {
  const plan = buildActionPlan('vacation', getSignals(travelListing), null);
  const all = [...plan.immediateActions, ...plan.beforeNegotiation].join(' ');
  assert.match(all, /Konum/i);
});

test('actionPlan has all five categories', () => {
  const edr = runEdr();
  for (const key of ['immediateActions', 'beforeNegotiation', 'beforePurchase', 'documentsToCheck', 'finalReview']) {
    assert.ok(Array.isArray(edr.actionPlan[key]), `Missing: ${key}`);
  }
});

test('CATEGORY_ACTION_PLANS has vehicle housing vacation', () => {
  assert.ok(CATEGORY_ACTION_PLANS.vehicle);
  assert.ok(CATEGORY_ACTION_PLANS.housing);
  assert.ok(CATEGORY_ACTION_PLANS.vacation);
});

// --- DATA LIMITATIONS ---

test('dataLimitations lists missing data for sparse listing', () => {
  const edr = runEdr(sparseListing);
  assert.ok(edr.dataLimitations.length > 0);
});

test('buildDataLimitations uses predefined labels', () => {
  const limitations = buildDataLimitations({ missingCritical: ['Tramer'], hasPriceEvidence: false, hasImageEvidence: false, hasOwnershipCostData: false, hasNegotiationData: false }, {});
  for (const label of limitations) {
    assert.ok(DATA_LIMITATION_LABELS.includes(label) || label === DATA_LIMITATION_LABELS[5]);
  }
});

test('DATA_LIMITATION_LABELS has six predefined items', () => {
  assert.equal(DATA_LIMITATION_LABELS.length, 6);
});

// --- PDF PAYLOAD ---

test('pdfPayload has required fields', () => {
  const edr = runEdr();
  const pdf = edr.pdfPayload;
  for (const key of ['title', 'generatedAt', 'category', 'summary', 'scores', 'sections', 'risks', 'actionPlan', 'disclaimers']) {
    assert.ok(key in pdf, `Missing pdf field: ${key}`);
  }
});

test('pdfPayload title is Executive Decision Report', () => {
  assert.equal(runEdr().pdfPayload.title, 'Executive Decision Report');
});

test('pdfPayload disclaimers has four items', () => {
  assert.equal(runEdr().pdfPayload.disclaimers.length, 4);
});

test('PDF_DISCLAIMERS contains karar destek disclaimer', () => {
  assert.ok(PDF_DISCLAIMERS.some((d) => d.includes('karar destek')));
});

test('PDF_DISCLAIMERS contains nihai karar disclaimer', () => {
  assert.ok(PDF_DISCLAIMERS.some((d) => d.includes('Nihai karar')));
});

test('PDF_DISCLAIMERS contains eksik veri disclaimer', () => {
  assert.ok(PDF_DISCLAIMERS.some((d) => d.includes('Eksik veya hatalı')));
});

test('PDF_DISCLAIMERS contains yatırım tavsiye disclaimer', () => {
  assert.ok(PDF_DISCLAIMERS.some((d) => d.includes('yatırım')));
});

test('buildPdfPayload sections count matches report sections', () => {
  const edr = runEdr();
  assert.equal(edr.pdfPayload.sections.length, 6);
});

// --- VERIFICATION CHECKLIST ---

test('verificationChecklist for vehicle includes tramer', () => {
  const checklist = buildVerificationChecklist('vehicle', getSignals(bmwListing));
  assert.ok(checklist.some((c) => /Tramer|hasar/i.test(c)));
});

test('verificationChecklist for housing includes tapu', () => {
  const checklist = buildVerificationChecklist('housing', getSignals(housingListing));
  assert.ok(checklist.some((c) => /Tapu/i.test(c)));
});

test('verificationChecklist for vacation includes iptal', () => {
  const checklist = buildVerificationChecklist('vacation', getSignals(travelListing));
  assert.ok(checklist.some((c) => /İptal/i.test(c)));
});

// --- TURKISH LABELS ---

test('executiveDecisionReport output uses Turkish section titles', () => {
  const edr = runEdr();
  assert.equal(edr.recommendationSection.title, 'Öneri');
  assert.equal(edr.ownershipCostSection.title, 'Sahip Olma Maliyeti');
  assert.equal(edr.qualityTrustSection.title, 'Kalite ve Güven');
});

// --- BANNED PHRASE SAFETY ---

test('all section summaries are free of banned phrases', () => {
  const edr = runEdr();
  const sections = [
    edr.recommendationSection, edr.ownershipCostSection, edr.qualityTrustSection,
    edr.negotiationSection, edr.purchaseDecisionSection, edr.explainabilitySection
  ];
  for (const s of sections) {
    assert.ok(!containsForbiddenExecutiveReportPhrase(s.summary));
    for (const b of s.bullets) assert.ok(!containsForbiddenExecutiveReportPhrase(b));
  }
});

test('EXECUTIVE_REPORT_FORBIDDEN_PHRASES is non-empty', () => {
  assert.ok(EXECUTIVE_REPORT_FORBIDDEN_PHRASES.length >= 5);
});

// --- CARD BUILDER ---

test('buildExecutiveReportPanelHtml escapes XSS', () => {
  const html = buildExecutiveReportPanelHtml({
    reportScore: 70,
    reportLevel: 'strong',
    reportLabel: 'Güçlü rapor',
    executiveSummary: '<script>alert(1)</script>',
    decisionSnapshot: { primaryDecisionLabel: '<img onerror=alert(1)>', decisionScore: 70, confidenceScore: 60, riskLevel: 'low', primaryAction: 'buy', recommendationScore: 80, qualityScore: 75, trustScore: 70, explanationScore: 65 },
    recommendationSection: { title: 'Öneri', status: 'positive', score: 80, summary: 'test', bullets: [], dataAvailable: true },
    ownershipCostSection: { title: 'Maliyet', status: 'neutral', score: 50, summary: 'test', bullets: [], dataAvailable: true },
    qualityTrustSection: { title: 'Kalite', status: 'positive', score: 70, summary: 'test', bullets: [], dataAvailable: true },
    negotiationSection: { title: 'Pazarlık', status: 'neutral', score: 50, summary: 'test', bullets: [], dataAvailable: true },
    purchaseDecisionSection: { title: 'Karar', status: 'positive', score: 70, summary: 'test', bullets: [], dataAvailable: true },
    explainabilitySection: { title: 'Açıklama', status: 'positive', score: 65, summary: 'test', bullets: [], dataAvailable: true },
    riskSummary: { topRisks: [], criticalWarnings: [], riskLevel: 'low', riskExplanation: 'test' },
    actionPlan: { immediateActions: [], beforeNegotiation: [], beforePurchase: [], documentsToCheck: [], finalReview: [] },
    dataLimitations: [],
    verificationChecklist: [],
    pdfPayload: { title: 'Executive Decision Report', category: 'vehicle' }
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img onerror'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img onerror'));
});

test('buildExecutiveReportPanelHtml empty state message', () => {
  const html = buildExecutiveReportPanelHtml(null);
  assert.match(html, /yönetici karar raporu üretilemedi/i);
});

test('buildExecutiveReportPanelHtml includes all sections', () => {
  const html = buildExecutiveReportPanelHtml(runEdr());
  assert.match(html, /Yönetici özeti/);
  assert.match(html, /Karar özeti/);
  assert.match(html, /Risk özeti/);
  assert.match(html, /Eylem planı/);
  assert.match(html, /PDF dışa aktarım/);
});

test('buildExecutiveReportShellHtml creates host div', () => {
  const html = buildExecutiveReportShellHtml();
  assert.match(html, /ai-edr-panel-host/);
  assert.match(html, /hidden/);
});

test('recommendation card includes Yönetici Raporu button', () => {
  const html = buildRecommendationCardHtml({ id: 'x', fit_score: 80, recommendation_label: 'Uygun', title: 'Test' });
  assert.match(html, /Yönetici Raporu/);
  assert.match(html, /data-rec-edr-id/);
});

test('recommendation card hides edr button without id', () => {
  const html = buildRecommendationCardHtml({ fit_score: 80, recommendation_label: 'Uygun', title: 'Test' });
  assert.doesNotMatch(html, /data-rec-edr-id/);
});

// --- MEMO CACHE ---

test('memo cache returns same object on second call', () => {
  clearExecutiveReportMemoCache();
  const rec = getTopRecommendation();
  const input = buildExecutiveReportInput(rec, profile);
  const first = runExecutiveReportEngine(input);
  const second = runExecutiveReportEngine(input);
  assert.equal(first, second);
});

test('skipCache bypasses memo read', () => {
  clearExecutiveReportMemoCache();
  const rec = getTopRecommendation();
  const input = buildExecutiveReportInput(rec, profile);
  const cached = runExecutiveReportEngine(input);
  const fresh = runExecutiveReportEngine(input, { skipCache: true });
  assert.notEqual(cached, fresh);
});

test('buildExecutiveReportCacheKey is deterministic', () => {
  const key1 = buildExecutiveReportCacheKey({ id: 'abc' }, profile);
  const key2 = buildExecutiveReportCacheKey({ id: 'abc' }, profile);
  assert.equal(key1, key2);
});

test('clearExecutiveReportMemoCache clears cache', () => {
  const rec = getTopRecommendation();
  const input = buildExecutiveReportInput(rec, profile);
  const first = runExecutiveReportEngine(input);
  clearExecutiveReportMemoCache();
  const second = runExecutiveReportEngine(input, { skipCache: true });
  assert.notEqual(first, second);
});

// --- SCORE UNCHANGED GUARDS ---

test('fit_score unchanged by executive report', () => {
  const rec = getTopRecommendation();
  const fitBefore = rec.fit_score;
  runExecutiveReportEngine(buildExecutiveReportInput(rec, profile), { skipCache: true });
  assert.equal(rec.fit_score, fitBefore);
});

test('purchase decision score unchanged by executive report', () => {
  clearPurchaseDecisionMemoCache();
  const rec = getTopRecommendation();
  const pdBefore = runPurchaseDecisionEngine(buildPurchaseDecisionInput(rec, profile), { skipCache: true });
  const decisionScoreBefore = pdBefore.decisionScore;
  runExecutiveReportEngine(buildExecutiveReportInput(rec, profile), { skipCache: true });
  const pdAfter = runPurchaseDecisionEngine(buildPurchaseDecisionInput(rec, profile), { skipCache: true });
  assert.equal(pdAfter.decisionScore, decisionScoreBefore);
});

test('explanation score unchanged by executive report', () => {
  clearExplainabilityMemoCache();
  const rec = getTopRecommendation();
  const expBefore = runExplainabilityEngine(buildExplainabilityInput(rec, profile), { skipCache: true });
  const scoreBefore = expBefore.explanationScore;
  runExecutiveReportEngine(buildExecutiveReportInput(rec, profile), { skipCache: true });
  const expAfter = runExplainabilityEngine(buildExplainabilityInput(rec, profile), { skipCache: true });
  assert.equal(expAfter.explanationScore, scoreBefore);
});

test('executive report does not mutate recommendation object', () => {
  const rec = { ...getTopRecommendation() };
  const fitBefore = rec.fit_score;
  runExecutiveReportEngine(buildExecutiveReportInput(rec, profile), { skipCache: true });
  assert.equal(rec.fit_score, fitBefore);
});

// --- FULL OUTPUT SHAPE ---

test('executiveDecisionReport has all required top-level fields', () => {
  const edr = runEdr();
  const required = [
    'reportScore', 'reportLevel', 'reportLabel', 'executiveSummary', 'decisionSnapshot',
    'recommendationSection', 'ownershipCostSection', 'qualityTrustSection', 'negotiationSection',
    'purchaseDecisionSection', 'explainabilitySection', 'riskSummary', 'actionPlan',
    'dataLimitations', 'verificationChecklist', 'pdfPayload'
  ];
  for (const key of required) assert.ok(key in edr, `Missing: ${key}`);
});

test('runExecutiveReportEngine returns null without id and score', () => {
  assert.equal(runExecutiveReportEngine(buildExecutiveReportInput({}, profile)), null);
});

// --- SHARED VS CLIENT ---

test('shared and client engines produce identical output', async () => {
  const shared = await import('../../supabase/functions/_shared/ai-listings/executive-report/index.js');
  clearExecutiveReportMemoCache();
  shared.clearExecutiveReportMemoCache();
  const rec = getTopRecommendation();
  const input = buildExecutiveReportInput(rec, profile);
  const clientResult = runExecutiveReportEngine(input, { skipCache: true });
  const sharedResult = shared.runExecutiveReportEngine(input, { skipCache: true });
  assert.deepEqual(clientResult, sharedResult);
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /'listings'/);
  assert.doesNotMatch(router, /executive-report/i);
});

test('guard: no schema change for executive report tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /executive_decision_report/i);
});

test('guard: shared executive report module exists', () => {
  const p = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/executive-report/executive-report-engine.js');
  assert.ok(fs.existsSync(p));
});

test('guard: client executive report module exists', () => {
  const p = path.join(process.cwd(), 'js/ai-executive-decision-report/index.js');
  assert.ok(fs.existsSync(p));
});

test('guard: all shared sub-modules exist', () => {
  const modules = [
    'report-section-builder.js',
    'report-summary-engine.js',
    'report-risk-engine.js',
    'report-action-plan-engine.js',
    'report-pdf-payload-builder.js'
  ];
  for (const m of modules) {
    const p = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/executive-report', m);
    assert.ok(fs.existsSync(p), `Missing: ${m}`);
  }
});

test('guard: all client sub-modules exist', () => {
  const modules = [
    'executive-report-engine.js',
    'report-section-builder.js',
    'report-summary-engine.js',
    'report-risk-engine.js',
    'report-action-plan-engine.js',
    'report-pdf-payload-builder.js',
    'executive-report-card-builder.js'
  ];
  for (const m of modules) {
    const p = path.join(process.cwd(), 'js/ai-executive-decision-report', m);
    assert.ok(fs.existsSync(p), `Missing: ${m}`);
  }
});

test('dashboard html includes edr panel shell', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.match(html, /ai-edr-panel-host/);
});

test('buildExecutiveReportInput preserves fit_score', () => {
  const input = buildExecutiveReportInput({ id: 'x', fit_score: 82 }, profile);
  assert.equal(input.fit_score, 82);
});

test('buildExecutiveReportInput includes category', () => {
  const input = buildExecutiveReportInput(bmwListing, profile);
  assert.equal(input.category, 'vehicle');
});

test('vehicle edr action plan in full report', () => {
  const edr = runEdr(bmwListing);
  const docs = edr.actionPlan.documentsToCheck.join(' ');
  assert.match(docs, /Tramer|Ekspertiz|Ruhsat/i);
});

test('housing edr action plan in full report', () => {
  const edr = runEdr(housingListing);
  const docs = edr.actionPlan.documentsToCheck.join(' ');
  assert.match(docs, /Tapu|İskân/i);
});

test('vacation edr action plan in full report', () => {
  const edr = runEdr(travelListing);
  const docs = edr.actionPlan.documentsToCheck.join(' ');
  assert.match(docs, /İptal|Rezervasyon/i);
});
