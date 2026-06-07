import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  buildDecisionPipeline,
  buildHeatMapSignals,
  buildActionCenterActions,
  buildDecisionWorkspaceHtml,
  buildDecisionWorkspaceEmptyHtml,
  buildWorkspaceLoadingHtml,
  buildWorkspaceDetailSkeletonHtml
} = await import('../../js/admin/ai-listings-decision-workspace.js');

const { buildListingCardHtml } = await import('../../js/admin/ai-listings-admin-core.js');
const { buildRecommendationCardHtml } = await import('../../js/ai-recommendation-engine/recommendation-card-builder.js');
const { runRecommendationEngine, clearRecommendationMemoCache } = await import(
  '../../js/ai-recommendation-engine/index.js'
);
const { runPurchaseDecisionEngine, clearPurchaseDecisionMemoCache, buildPurchaseDecisionInput } = await import(
  '../../js/ai-purchase-decision/index.js'
);
const { runExplainabilityEngine, clearExplainabilityMemoCache } = await import(
  '../../js/ai-decision-explainability/index.js'
);
const { runExecutiveReportEngine, clearExecutiveReportMemoCache } = await import(
  '../../js/ai-executive-decision-report/index.js'
);

const adminJsPath = path.join(process.cwd(), 'js/admin/ai-listings-admin.js');

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
  location: 'İzmir',
  status: 'approved',
  images: ['img1.jpg'],
  attributes: { brand: 'BMW', model: '320i', year: 2022, km: 45000 },
  latest_analysis: { risk_score: 28, quality_score: 88, decision_score: 82 },
  updated_at: new Date().toISOString()
};

const sparseListing = {
  id: '55555555-5555-5555-5555-555555555555',
  category: 'vehicle',
  title: 'Eksik',
  price: 500000,
  updated_at: '2024-01-01T00:00:00.000Z'
};

function makeRec(listing, fitScore = 75) {
  return {
    ...listing,
    fit_score: fitScore,
    recommendation_label: 'Uygun',
    quality_score: listing.latest_analysis?.quality_score ?? 70,
    risk_score: listing.latest_analysis?.risk_score ?? 40,
    score: fitScore
  };
}

function fullCtx(overrides = {}) {
  return {
    listing: bmwListing,
    recommendation: makeRec(bmwListing, 82),
    qualityScore: 88,
    trustScore: 75,
    decisionScore: 72,
    confidenceScore: 68,
    explanationScore: 70,
    reportScore: 65,
    riskScore: 28,
    riskLevel: 'low',
    decisionLabel: 'Uygun',
    hasOwnershipCost: true,
    hasNegotiation: true,
    hasCompare: true,
    duplicateLabel: null,
    missingCount: 0,
    ...overrides
  };
}

// --- EMPTY STATE ---

test('no selected listing empty state', () => {
  const html = buildDecisionWorkspaceEmptyHtml();
  assert.match(html, /Detayları görmek için sağdan bir ilan seçin/);
  assert.match(html, /ai-ws-empty/);
});

test('buildDecisionWorkspaceHtml without listing shows empty state', () => {
  const html = buildDecisionWorkspaceHtml({ listing: null });
  assert.match(html, /Detayları görmek için sağdan bir ilan seçin/);
});

// --- SELECTED LISTING SUMMARY ---

test('selected listing summary shows title', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx());
  assert.match(html, /2022 BMW 320i M Sport/);
});

test('selected listing summary shows category in Turkish', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx());
  assert.match(html, /Araç/);
});

test('selected listing summary shows price', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx());
  assert.match(html, /1\.780\.000/);
});

test('limited data warning shown when limitedData true', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx({ limitedData: true }));
  assert.match(html, /detay verisi sınırlı/i);
});

test('duplicate label shown when present', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx({ duplicateLabel: 'Aynı ilan bulundu' }));
  assert.match(html, /Aynı ilan bulundu/);
});

// --- PIPELINE ---

test('pipeline steps render 9 steps', () => {
  const pipeline = buildDecisionPipeline(fullCtx());
  assert.equal(pipeline.length, 9);
});

test('pipeline step labels are Turkish', () => {
  const pipeline = buildDecisionPipeline(fullCtx());
  const labels = pipeline.map((s) => s.label);
  assert.deepEqual(labels, [
    'İlan',
    'Kalite',
    'Güven',
    'Toplam maliyet',
    'Pazarlık',
    'Al kararı',
    'Açıklama',
    'Yönetici raporu',
    'Karşılaştırma'
  ]);
});

test('pipeline listing step completed when listing present', () => {
  const pipeline = buildDecisionPipeline(fullCtx());
  assert.equal(pipeline[0].status, 'completed');
});

test('pipeline listing step missing without listing', () => {
  const pipeline = buildDecisionPipeline({ listing: null });
  assert.equal(pipeline[0].status, 'missing');
});

test('pipeline quality step completed when score >= 60', () => {
  const pipeline = buildDecisionPipeline(fullCtx({ qualityScore: 70 }));
  assert.equal(pipeline.find((s) => s.id === 'quality')?.status, 'completed');
});

test('pipeline quality step partial when score between 1-59', () => {
  const pipeline = buildDecisionPipeline(fullCtx({ qualityScore: 45 }));
  assert.equal(pipeline.find((s) => s.id === 'quality')?.status, 'partial');
});

test('pipeline quality step missing when score 0', () => {
  const pipeline = buildDecisionPipeline(fullCtx({ qualityScore: 0 }));
  assert.equal(pipeline.find((s) => s.id === 'quality')?.status, 'missing');
});

test('pipeline cost step completed when hasOwnershipCost', () => {
  const pipeline = buildDecisionPipeline(fullCtx({ hasOwnershipCost: true }));
  assert.equal(pipeline.find((s) => s.id === 'cost')?.status, 'completed');
});

test('pipeline purchase step completed when decisionScore > 0', () => {
  const pipeline = buildDecisionPipeline(fullCtx({ decisionScore: 72 }));
  assert.equal(pipeline.find((s) => s.id === 'purchase')?.status, 'completed');
});

test('pipeline compare step completed when hasCompare', () => {
  const pipeline = buildDecisionPipeline(fullCtx({ hasCompare: true }));
  assert.equal(pipeline.find((s) => s.id === 'compare')?.status, 'completed');
});

test('pipeline HTML renders completed class', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx());
  assert.match(html, /ai-ws-pipeline__step--completed/);
});

test('pipeline HTML renders missing class for sparse listing', () => {
  const html = buildDecisionWorkspaceHtml(
    fullCtx({ listing: sparseListing, qualityScore: 0, trustScore: 0, decisionScore: 0, hasOwnershipCost: false })
  );
  assert.match(html, /ai-ws-pipeline__step--missing/);
});

// --- HEAT MAP ---

test('heat map max 3 strong signals', () => {
  const heat = buildHeatMapSignals(
    fullCtx({ decisionScore: 80, qualityScore: 85, trustScore: 90, explanationScore: 75 })
  );
  assert.ok(heat.strong.length <= 3);
  assert.ok(heat.strong.length > 0);
});

test('heat map max 3 weak signals', () => {
  const heat = buildHeatMapSignals(fullCtx({ qualityScore: 30, hasOwnershipCost: false, hasNegotiation: false }));
  assert.ok(heat.weak.length <= 3);
});

test('heat map max 3 risky signals', () => {
  const heat = buildHeatMapSignals(
    fullCtx({ riskScore: 80, duplicateLabel: 'Mükerrer', missingCount: 3 })
  );
  assert.ok(heat.risky.length <= 3);
});

test('heat map HTML includes chip groups', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx({ decisionScore: 80, qualityScore: 85 }));
  assert.match(html, /Güçlü sinyaller/);
  assert.match(html, /ai-ws-heat__chip--strong/);
});

// --- ACTION CENTER ---

test('action center has 7 buttons', () => {
  const actions = buildActionCenterActions(fullCtx());
  assert.equal(actions.length, 7);
});

test('action center buttons include Turkish labels', () => {
  const actions = buildActionCenterActions(fullCtx());
  const labels = actions.map((a) => a.label);
  assert.ok(labels.includes('Al Kararı'));
  assert.ok(labels.includes('Neden Bu Karar?'));
  assert.ok(labels.includes('Yönetici Raporu'));
  assert.ok(labels.includes('Karşılaştır'));
  assert.ok(labels.includes('Senaryo Simülasyonu'));
  assert.ok(labels.includes('Pazarlık Analizi'));
  assert.ok(labels.includes('Kalite ve Güven'));
});

test('action center purchase disabled without recommendation', () => {
  const actions = buildActionCenterActions(fullCtx({ recommendation: null }));
  assert.equal(actions.find((a) => a.key === 'purchase')?.enabled, false);
});

test('action center compare disabled without hasCompare', () => {
  const actions = buildActionCenterActions(fullCtx({ hasCompare: false }));
  assert.equal(actions.find((a) => a.key === 'compare')?.enabled, false);
});

test('action center HTML renders data-ws-action attributes', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx());
  assert.match(html, /data-ws-action="purchase"/);
  assert.match(html, /data-ws-action="scenario"/);
});

test('action center disabled buttons have disabled attribute', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx({ recommendation: null }));
  assert.match(html, /disabled/);
});

// --- SCENARIO TEASER ---

test('workspace includes scenario teaser section', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx());
  assert.match(html, /Senaryo Simülasyonu/);
  assert.match(html, /ai-ws-scenario/);
});

// --- LISTING CARD ---

test('listing card has tabindex for keyboard', () => {
  const html = buildListingCardHtml(bmwListing, false);
  assert.match(html, /tabindex="0"/);
});

test('listing card aria-selected false when not active', () => {
  const html = buildListingCardHtml(bmwListing, false);
  assert.match(html, /aria-selected="false"/);
});

test('listing card aria-selected true when active', () => {
  const html = buildListingCardHtml(bmwListing, true);
  assert.match(html, /aria-selected="true"/);
});

test('listing card has data-listing-id for click selection', () => {
  const html = buildListingCardHtml(bmwListing, false);
  assert.match(html, /data-listing-id="11111111-1111-1111-1111-111111111111"/);
});

test('active listing card has active class', () => {
  const html = buildListingCardHtml(bmwListing, true);
  assert.match(html, /ai-listings-admin__listing-card--active/);
});

// --- RECOMMENDATION CARD ---

test('recommendation card has tabindex for keyboard', () => {
  const html = buildRecommendationCardHtml(makeRec(bmwListing));
  assert.match(html, /tabindex="0"/);
});

test('recommendation card metrics use Turkish labels', () => {
  const html = buildRecommendationCardHtml(makeRec(bmwListing));
  assert.match(html, /Kalite skoru/);
  assert.match(html, /Risk skoru/);
  assert.match(html, /Karar skoru/);
});

// --- ADMIN INTEGRATION ---

test('admin.js imports decision workspace module', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /ai-listings-decision-workspace/);
  assert.match(src, /buildDecisionWorkspaceHtml/);
});

test('admin.js sets selectedListing before showListingDetail', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /selectedListing = listing/);
});

test('admin.js binds Enter and Space on listing cards', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /event\.key === 'Enter' \|\| event\.key === ' '/);
});

test('admin.js does not call showDetailSkeleton after workspace render', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  const fnBlock = src.slice(src.indexOf('async function showListingDetail'), src.indexOf('async function autoAnalyzeListing'));
  assert.doesNotMatch(fnBlock, /showDetailSkeleton\(\)/);
});

// --- MUTATION SAFETY ---

test('fit_score unchanged after workspace context build', () => {
  const rec = makeRec(bmwListing, 82);
  const original = rec.fit_score;
  buildDecisionWorkspaceHtml(fullCtx({ recommendation: rec }));
  assert.equal(rec.fit_score, original);
});

test('decisionScore unchanged on recommendation after pipeline build', () => {
  clearRecommendationMemoCache();
  clearPurchaseDecisionMemoCache();
  const rec = getRec();
  const before = rec.fit_score;
  const pdInput = buildPurchaseDecisionInput(rec, profile);
  const pd = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  const decisionBefore = pd.decisionScore;
  buildDecisionPipeline(fullCtx({ recommendation: rec, decisionScore: pd.decisionScore }));
  const pd2 = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  assert.equal(pd2.decisionScore, decisionBefore);
  assert.equal(rec.fit_score, before);
});

function getRec() {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine([bmwListing, sparseListing], profile);
  return result.top[0];
}

test('explanationScore unchanged after workspace render', () => {
  const rec = getRec();
  const expInput = { recommendation: rec, user_intent: profile };
  clearExplainabilityMemoCache();
  const exp = runExplainabilityEngine(expInput, { skipCache: true });
  const before = exp.explanationScore;
  buildDecisionWorkspaceHtml(fullCtx({ recommendation: rec, explanationScore: before }));
  const exp2 = runExplainabilityEngine(expInput, { skipCache: true });
  assert.equal(exp2.explanationScore, before);
});

test('reportScore unchanged after workspace render', () => {
  const rec = getRec();
  clearExecutiveReportMemoCache();
  const edr = runExecutiveReportEngine({ recommendation: rec, user_intent: profile }, { skipCache: true });
  const before = edr.reportScore;
  buildDecisionWorkspaceHtml(fullCtx({ recommendation: rec, reportScore: before }));
  const edr2 = runExecutiveReportEngine({ recommendation: rec, user_intent: profile }, { skipCache: true });
  assert.equal(edr2.reportScore, before);
});

test('compareScore not referenced in workspace mutation', () => {
  const rec = getRec();
  const originalScore = rec.score;
  buildHeatMapSignals(fullCtx({ recommendation: rec }));
  assert.equal(rec.score, originalScore);
});

// --- XSS SAFETY ---

test('workspace escapes listing title', () => {
  const evil = { ...bmwListing, title: '<script>alert(1)</script>' };
  const html = buildDecisionWorkspaceHtml(fullCtx({ listing: evil }));
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('workspace escapes duplicate label', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx({ duplicateLabel: '<img onerror=alert(1)>' }));
  assert.doesNotMatch(html, /<img onerror/);
});

// --- EXECUTIVE SNAPSHOT ---

test('executive snapshot shows Turkish metric labels', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx());
  assert.match(html, /Karar skoru/);
  assert.match(html, /Güven skoru/);
  assert.match(html, /Açıklama skoru/);
  assert.match(html, /Rapor skoru/);
});

test('executive snapshot shows compare availability', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx({ hasCompare: true }));
  assert.match(html, /Hazır/);
});

// --- MISSING RECOMMENDATION FALLBACK ---

test('missing recommendation fallback still shows listing', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx({ recommendation: null, decisionScore: '—' }));
  assert.match(html, /2022 BMW 320i M Sport/);
  assert.match(html, /Karar özeti üretiliyor|Mevcut verilerle/i);
});

test('action center scenario disabled without recommendation', () => {
  const actions = buildActionCenterActions(fullCtx({ recommendation: null }));
  assert.equal(actions.find((a) => a.key === 'scenario')?.enabled, false);
});

test('empty state includes CTA Öneri üret', () => {
  const html = buildDecisionWorkspaceEmptyHtml();
  assert.match(html, /Öneri üret/);
});

test('workspace loading html has skeleton blocks', () => {
  const html = buildWorkspaceLoadingHtml();
  assert.match(html, /ai-ws-loading__skeleton/);
});

test('detail skeleton separate from workspace root', () => {
  const html = buildWorkspaceDetailSkeletonHtml();
  assert.match(html, /ai-ws-detail-skeleton/);
});

test('listing card role button present', () => {
  const html = buildListingCardHtml(bmwListing, false);
  assert.match(html, /role="button"/);
});

test('admin.js uses renderDecisionWorkspace', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /renderDecisionWorkspace/);
});

test('insufficient data hint on disabled action', () => {
  const html = buildDecisionWorkspaceHtml(fullCtx({ recommendation: null }));
  assert.match(html, /disabled/);
});
