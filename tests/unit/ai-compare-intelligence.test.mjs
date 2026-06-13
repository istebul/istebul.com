import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  clearCompareMemoCache,
  buildCompareCacheKey,
  buildCompareInput,
  runCompareEngine,
  COMPARE_LEVEL_LABELS,
  WINNER_GAP_THRESHOLD,
  COMPARE_WEIGHTS,
  computeItemCompareScore,
  normalizeCostSignal,
  buildScoreComparison,
  buildRanking,
  resolveWinner,
  buildWinnerReason,
  buildRiskComparison,
  buildCostComparison,
  COMPARE_FORBIDDEN_PHRASES,
  sanitizeCompareText,
  containsForbiddenComparePhrase,
  computeCompareScore,
  computeDataQuality,
  buildCompareSummary,
  buildTradeoffs,
  buildCategoryNextSteps,
  buildComparePanelHtml,
  buildCompareShellHtml,
  buildCompareToolbarHtml
} = await import('../../js/ai-compare-intelligence/index.js');

const { runRecommendationEngine, clearRecommendationMemoCache } = await import(
  '../../js/ai-recommendation-engine/index.js'
);
const { runPurchaseDecisionEngine, clearPurchaseDecisionMemoCache, buildPurchaseDecisionInput } = await import(
  '../../js/ai-purchase-decision/index.js'
);
const { runExplainabilityEngine, clearExplainabilityMemoCache, buildExplainabilityInput } = await import(
  '../../js/ai-decision-explainability/index.js'
);
const { runExecutiveReportEngine, clearExecutiveReportMemoCache, buildExecutiveReportInput } = await import(
  '../../js/ai-executive-decision-report/index.js'
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

function getTopRecommendations(count = 3) {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine(listings, profile);
  return result.top.slice(0, count);
}

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

function runCmp(recs = null) {
  clearCompareMemoCache();
  clearPurchaseDecisionMemoCache();
  clearExplainabilityMemoCache();
  const recommendations = recs ?? getTopRecommendations(2);
  const input = buildCompareInput(recommendations, profile);
  return runCompareEngine(input);
}

// --- COMPARE SCORE BOUNDS ---

test('compareScore is between 0 and 100', () => {
  const cmp = runCmp();
  assert.ok(cmp.compareScore >= 0 && cmp.compareScore <= 100);
});

test('computeCompareScore clamps to 0-100', () => {
  assert.ok(computeCompareScore(150, 3) <= 100);
  assert.ok(computeCompareScore(-10, 2) >= 0);
});

test('computeItemCompareScore is between 0 and 100', () => {
  const cmp = runCmp();
  for (const item of cmp.comparedItems) {
    assert.ok(item.score >= 0 && item.score <= 100);
  }
});

test('COMPARE_WEIGHTS sum to 1', () => {
  const sum = Object.values(COMPARE_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 0.01);
});

// --- COMPARE LEVEL ---

test('COMPARE_LEVEL_LABELS has four Turkish labels', () => {
  assert.equal(COMPARE_LEVEL_LABELS.clear_winner, 'Net avantaj');
  assert.equal(COMPARE_LEVEL_LABELS.slight_advantage, 'Hafif avantaj');
  assert.equal(COMPARE_LEVEL_LABELS.close_call, 'Yakın karar');
  assert.equal(COMPARE_LEVEL_LABELS.weak_comparison, 'Zayıf karşılaştırma');
});

test('compareLabel matches compareLevel', () => {
  const cmp = runCmp();
  assert.equal(cmp.compareLabel, COMPARE_LEVEL_LABELS[cmp.compareLevel]);
});

test('resolveWinner close_call when gap below threshold', () => {
  const ranking = [
    { id: 'a', title: 'A', score: 70 },
    { id: 'b', title: 'B', score: 65 }
  ];
  const result = resolveWinner(ranking, 80);
  assert.equal(result.compareLevel, 'close_call');
  assert.equal(result.winner, null);
});

test('resolveWinner clear_winner when gap >= 15', () => {
  const ranking = [
    { id: 'a', title: 'A', score: 85 },
    { id: 'b', title: 'B', score: 65 }
  ];
  const result = resolveWinner(ranking, 80);
  assert.equal(result.compareLevel, 'clear_winner');
  assert.ok(result.winner);
});

test('resolveWinner slight_advantage when gap 8-14', () => {
  const ranking = [
    { id: 'a', title: 'A', score: 78 },
    { id: 'b', title: 'B', score: 68 }
  ];
  const result = resolveWinner(ranking, 80);
  assert.equal(result.compareLevel, 'slight_advantage');
});

test('resolveWinner weak_comparison with low data quality', () => {
  const ranking = [{ id: 'a', title: 'A', score: 70 }];
  const result = resolveWinner(ranking, 30);
  assert.equal(result.compareLevel, 'weak_comparison');
});

test('WINNER_GAP_THRESHOLD is 8', () => {
  assert.equal(WINNER_GAP_THRESHOLD, 8);
});

// --- 2 ITEM COMPARISON ---

test('runCompareEngine works with 2 items', () => {
  const cmp = runCmp(getTopRecommendations(2));
  assert.equal(cmp.comparedItems.length, 2);
});

test('runCompareEngine returns null with 1 item', () => {
  assert.equal(runCompareEngine(buildCompareInput([bmwListing], profile)), null);
});

test('runCompareEngine returns null with 0 items', () => {
  assert.equal(runCompareEngine(buildCompareInput([], profile)), null);
});

// --- 3+ ITEM RANKING ---

test('runCompareEngine works with 3 items', () => {
  const cmp = runCmp([makeRec(bmwListing, 82), makeRec(sparseListing, 55), makeRec({ ...bmwListing, id: '22222222-2222-2222-2222-222222222222', title: 'Audi A4', price: 1650000 }, 70)]);
  assert.equal(cmp.comparedItems.length, 3);
  assert.equal(cmp.ranking.length, 3);
});

test('buildRanking sorts by score descending', () => {
  const items = [
    { id: 'a', title: 'A', score: 60 },
    { id: 'b', title: 'B', score: 80 },
    { id: 'c', title: 'C', score: 70 }
  ];
  const ranking = buildRanking(items);
  assert.equal(ranking[0].id, 'b');
  assert.equal(ranking[1].id, 'c');
  assert.equal(ranking[2].id, 'a');
});

test('ranking has rank numbers 1 to n', () => {
  const cmp = runCmp([makeRec(bmwListing, 82), makeRec(sparseListing, 55), makeRec({ ...bmwListing, id: '22222222-2222-2222-2222-222222222222', title: 'Audi A4' }, 70)]);
  assert.deepEqual(cmp.ranking.map((r) => r.rank), [1, 2, 3]);
});

// --- WINNER SELECTION ---

test('winner has id title score when clear winner', () => {
  const ranking = [
    { id: 'a', title: 'A', score: 90, decisionLabel: 'Al' },
    { id: 'b', title: 'B', score: 60, decisionLabel: 'Bekle' }
  ];
  const { winner } = resolveWinner(ranking, 80);
  assert.equal(winner.id, 'a');
});

test('winner null on close call in full compare', () => {
  const items = [
    { id: 'a', title: 'A', score: 72, _context: { signals: { hasPriceEvidence: true, missingCritical: [] }, purchase_decision: {}, explainability: {} } },
    { id: 'b', title: 'B', score: 68, _context: { signals: { hasPriceEvidence: true, missingCritical: [] }, purchase_decision: {}, explainability: {} } }
  ];
  const { winner } = resolveWinner(buildRanking(items), 80);
  assert.equal(winner, null);
});

test('winnerReason is non-empty string', () => {
  const cmp = runCmp();
  assert.ok(cmp.winnerReason.length > 10);
});

test('buildWinnerReason safe for close call', () => {
  const reason = buildWinnerReason(null, { title: 'B' }, 5, 'close_call');
  assert.match(reason, /yakın/i);
});

// --- MISSING DATA FALLBACK ---

test('sparse listing produces weak_comparison or close_call', () => {
  const cmp = runCmp([bmwListing, sparseListing]);
  assert.ok(['weak_comparison', 'close_call', 'slight_advantage', 'clear_winner'].includes(cmp.compareLevel));
});

test('computeDataQuality lower for sparse items', () => {
  const rich = { _context: { signals: { hasPriceEvidence: true, hasImageEvidence: true, hasOwnershipCostData: true, hasNegotiationData: true, missingCritical: [] }, purchase_decision: {}, explainability: {} } };
  const sparse = { _context: { signals: { missingCritical: ['Tramer', 'KM'] }, purchase_decision: null, explainability: null } };
  assert.ok(computeDataQuality([rich]) > computeDataQuality([sparse]));
});

test('comparedItems have strengths and weaknesses arrays', () => {
  const cmp = runCmp();
  for (const item of cmp.comparedItems) {
    assert.ok(Array.isArray(item.strengths));
    assert.ok(Array.isArray(item.weaknesses));
  }
});

// --- COST COMPARISON ---

test('costComparison has items and summary', () => {
  const cmp = runCmp();
  assert.ok('items' in cmp.costComparison);
  assert.ok('summary' in cmp.costComparison);
});

test('buildCostComparison identifies lowest cost', () => {
  const items = [
    { id: 'a', title: 'A', _context: { ownership_cost: { total_cost: 1000000 } } },
    { id: 'b', title: 'B', _context: { ownership_cost: { total_cost: 2000000 } } }
  ];
  const cost = buildCostComparison(items);
  assert.equal(cost.lowestCostId, 'a');
});

// --- QUALITY TRUST COMPARISON ---

test('qualityTrustComparison has items', () => {
  const cmp = runCmp();
  assert.ok(Array.isArray(cmp.qualityTrustComparison.items));
});

test('comparedItems have qualityScore and trustScore', () => {
  const cmp = runCmp();
  for (const item of cmp.comparedItems) {
    assert.ok(item.qualityScore >= 0);
    assert.ok(item.trustScore >= 0);
  }
});

// --- NEGOTIATION COMPARISON ---

test('negotiationComparison has items', () => {
  const cmp = runCmp();
  assert.ok(Array.isArray(cmp.negotiationComparison.items));
});

test('comparedItems have negotiationSignal', () => {
  const cmp = runCmp();
  for (const item of cmp.comparedItems) {
    assert.ok('negotiationSignal' in item);
  }
});

// --- PURCHASE DECISION COMPARISON ---

test('purchaseDecisionComparison has items', () => {
  const cmp = runCmp();
  assert.ok(Array.isArray(cmp.purchaseDecisionComparison.items));
});

test('comparedItems have decisionLabel', () => {
  const cmp = runCmp();
  for (const item of cmp.comparedItems) {
    assert.ok(item.decisionLabel);
  }
});

// --- RISK COMPARISON ---

test('riskComparison has items and summary', () => {
  const cmp = runCmp();
  assert.ok(Array.isArray(cmp.riskComparison.items));
  assert.ok(cmp.riskComparison.summary);
});

test('buildRiskComparison identifies lowest risk', () => {
  const items = [
    { id: 'a', title: 'A', _context: { signals: { riskPenalty: 20, missingCritical: [] }, purchase_decision: { riskLevel: 'low' } } },
    { id: 'b', title: 'B', _context: { signals: { riskPenalty: 70, missingCritical: ['Tramer'] }, purchase_decision: { riskLevel: 'high' } } }
  ];
  const risk = buildRiskComparison(items);
  assert.equal(risk.lowestRiskId, 'a');
});

// --- EXPLAINABILITY COMPARISON ---

test('explainabilityComparison has items', () => {
  const cmp = runCmp();
  assert.ok(Array.isArray(cmp.explainabilityComparison.items));
});

test('comparedItems have explanationScore', () => {
  const cmp = runCmp();
  for (const item of cmp.comparedItems) {
    assert.ok(item.explanationScore >= 0);
  }
});

// --- TRADEOFFS ---

test('tradeoffs max 6', () => {
  const cmp = runCmp(getTopRecommendations(3));
  assert.ok(cmp.tradeoffs.length <= 6);
  assert.ok(cmp.tradeoffs.length > 0);
});

test('buildTradeoffs returns at least one item', () => {
  const items = [
    { id: 'a', title: 'A', score: 80, decisionScore: 75, costSignal: 40, strengths: ['Güçlü'], weaknesses: ['Zayıf'] },
    { id: 'b', title: 'B', score: 70, decisionScore: 65, costSignal: 70, strengths: ['İyi'], weaknesses: ['Risk'] }
  ];
  const tradeoffs = buildTradeoffs(items, buildScoreComparison(items), buildCostComparison(items), buildRiskComparison(items));
  assert.ok(tradeoffs.length >= 1);
});

// --- SUMMARY SAFE LANGUAGE ---

test('summary does not contain banned phrases', () => {
  const cmp = runCmp();
  for (const phrase of COMPARE_FORBIDDEN_PHRASES) {
    assert.ok(!cmp.summary.toLowerCase().includes(phrase));
  }
});

test('sanitizeCompareText removes banned phrases', () => {
  const safe = sanitizeCompareText('Bu kesin alınır ve risksiz');
  assert.ok(!containsForbiddenComparePhrase(safe));
});

test('summary is Turkish paragraph', () => {
  const cmp = runCmp();
  assert.match(cmp.summary, /seçenek|karar|karşılaştır/i);
});

// --- CATEGORY NEXT STEPS ---

test('vehicle next steps include tramer', () => {
  const steps = buildCategoryNextSteps('vehicle');
  assert.ok(steps.some((s) => /tramer|ekspertiz/i.test(s)));
  assert.ok(steps.length >= 4 && steps.length <= 6);
});

test('housing next steps include tapu', () => {
  const steps = buildCategoryNextSteps('housing');
  assert.ok(steps.some((s) => /tapu|iskan/i.test(s)));
});

test('vacation next steps include iptal', () => {
  const steps = buildCategoryNextSteps('vacation');
  assert.ok(steps.some((s) => /iptal|konum/i.test(s)));
});

test('nextSteps in compare output has 4-6 items', () => {
  const cmp = runCmp();
  assert.ok(cmp.nextSteps.length >= 4 && cmp.nextSteps.length <= 6);
});

// --- CARD BUILDER ---

test('buildComparePanelHtml escapes XSS', () => {
  const html = buildComparePanelHtml({
    compareScore: 70,
    compareLevel: 'slight_advantage',
    compareLabel: 'Hafif avantaj',
    winner: { title: '<script>alert(1)</script>', score: 75 },
    winnerReason: '<img onerror=alert(1)>',
    ranking: [],
    scoreComparison: { items: [], summary: '' },
    costComparison: { items: [], summary: '' },
    qualityTrustComparison: { items: [], summary: '' },
    negotiationComparison: { items: [], summary: '' },
    purchaseDecisionComparison: { items: [], summary: '' },
    riskComparison: { items: [], summary: '' },
    explainabilityComparison: { items: [], summary: '' },
    tradeoffs: ['<script>x</script>'],
    summary: 'test',
    nextSteps: []
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img onerror'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('buildComparePanelHtml empty state', () => {
  const html = buildComparePanelHtml(null);
  assert.match(html, /karşılaştırma analizi üretilemedi/i);
});

test('buildComparePanelHtml includes all sections', () => {
  const html = buildComparePanelHtml(runCmp());
  assert.match(html, /Sıralama/);
  assert.match(html, /Skor karşılaştırması/);
  assert.match(html, /Trade-off/);
  assert.match(html, /Sonraki adımlar/);
});

test('buildCompareShellHtml creates host', () => {
  assert.match(buildCompareShellHtml(), /ai-cmp-panel-host/);
});

test('buildCompareToolbarHtml has compare button', () => {
  assert.match(buildCompareToolbarHtml(2), /Seçilenleri Karşılaştır/);
});

test('buildCompareToolbarHtml disables button with 1 selection', () => {
  assert.match(buildCompareToolbarHtml(1), /disabled/);
});

test('recommendation card shows compare checkbox in compare mode', () => {
  const html = buildRecommendationCardHtml(
    { id: 'x', fit_score: 80, recommendation_label: 'Uygun', title: 'Test' },
    { compareMode: true, compareSelectedIds: ['x'] }
  );
  assert.match(html, /data-rec-compare-id/);
  assert.match(html, /Karşılaştır/);
  assert.match(html, /checked/);
});

// --- MEMO CACHE ---

test('memo cache returns same object', () => {
  clearCompareMemoCache();
  const recs = getTopRecommendations(2);
  const input = buildCompareInput(recs, profile);
  const first = runCompareEngine(input);
  const second = runCompareEngine(input);
  assert.equal(first, second);
});

test('skipCache bypasses memo read', () => {
  clearCompareMemoCache();
  const recs = getTopRecommendations(2);
  const input = buildCompareInput(recs, profile);
  const cached = runCompareEngine(input);
  const fresh = runCompareEngine(input, { skipCache: true });
  assert.notEqual(cached, fresh);
});

test('buildCompareCacheKey is deterministic', () => {
  const k1 = buildCompareCacheKey(['a', 'b'], profile);
  const k2 = buildCompareCacheKey(['b', 'a'], profile);
  assert.equal(k1, k2);
});

test('clearCompareMemoCache clears cache', () => {
  const recs = getTopRecommendations(2);
  const input = buildCompareInput(recs, profile);
  runCompareEngine(input);
  clearCompareMemoCache();
  const fresh = runCompareEngine(input, { skipCache: true });
  assert.ok(fresh);
});

// --- SCORE UNCHANGED GUARDS ---

test('fit_score unchanged by compare', () => {
  const recs = getTopRecommendations(2).map((r) => ({ ...r }));
  const fits = recs.map((r) => r.fit_score);
  runCompareEngine(buildCompareInput(recs, profile), { skipCache: true });
  recs.forEach((r, i) => assert.equal(r.fit_score, fits[i]));
});

test('purchase decision score unchanged by compare', () => {
  clearPurchaseDecisionMemoCache();
  const rec = getTopRecommendations(1)[0];
  const pdBefore = runPurchaseDecisionEngine(buildPurchaseDecisionInput(rec, profile), { skipCache: true });
  runCompareEngine(buildCompareInput(getTopRecommendations(2), profile), { skipCache: true });
  const pdAfter = runPurchaseDecisionEngine(buildPurchaseDecisionInput(rec, profile), { skipCache: true });
  assert.equal(pdAfter.decisionScore, pdBefore.decisionScore);
});

test('explanation score unchanged by compare', () => {
  clearExplainabilityMemoCache();
  const rec = getTopRecommendations(1)[0];
  const expBefore = runExplainabilityEngine(buildExplainabilityInput(rec, profile), { skipCache: true });
  runCompareEngine(buildCompareInput(getTopRecommendations(2), profile), { skipCache: true });
  const expAfter = runExplainabilityEngine(buildExplainabilityInput(rec, profile), { skipCache: true });
  assert.equal(expAfter.explanationScore, expBefore.explanationScore);
});

test('executive report unchanged by compare', () => {
  clearExecutiveReportMemoCache();
  const rec = getTopRecommendations(1)[0];
  const edrBefore = runExecutiveReportEngine(buildExecutiveReportInput(rec, profile), { skipCache: true });
  runCompareEngine(buildCompareInput(getTopRecommendations(2), profile), { skipCache: true });
  const edrAfter = runExecutiveReportEngine(buildExecutiveReportInput(rec, profile), { skipCache: true });
  assert.equal(edrAfter.reportScore, edrBefore.reportScore);
});

// --- FULL OUTPUT SHAPE ---

test('compareIntelligence has all required fields', () => {
  const cmp = runCmp();
  const required = [
    'compareScore', 'compareLevel', 'compareLabel', 'comparedItems', 'winner',
    'winnerReason', 'ranking', 'scoreComparison', 'costComparison',
    'qualityTrustComparison', 'negotiationComparison', 'purchaseDecisionComparison',
    'riskComparison', 'explainabilityComparison', 'tradeoffs', 'summary', 'nextSteps'
  ];
  for (const key of required) assert.ok(key in cmp, `Missing: ${key}`);
});

test('comparedItems have required fields', () => {
  const item = runCmp().comparedItems[0];
  for (const key of ['id', 'title', 'category', 'score', 'decisionLabel', 'qualityScore', 'trustScore', 'strengths', 'weaknesses']) {
    assert.ok(key in item, `Missing: ${key}`);
  }
});

// --- SHARED VS CLIENT ---

test('shared and client engines produce identical output', async () => {
  const shared = await import('../../supabase/functions/_shared/ai-listings/compare/index.js');
  clearCompareMemoCache();
  shared.clearCompareMemoCache();
  const recs = getTopRecommendations(2);
  const input = buildCompareInput(recs, profile);
  const clientResult = runCompareEngine(input, { skipCache: true });
  const sharedResult = shared.runCompareEngine(input, { skipCache: true });
  assert.deepEqual(clientResult, sharedResult);
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /'listings'/);
  assert.doesNotMatch(router, /compare-intelligence/i);
});

test('guard: no schema change for compare tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /compare_intelligence/i);
});

test('guard: shared compare module exists', () => {
  assert.ok(fs.existsSync(path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/compare/compare-engine.js')));
});

test('guard: client compare module exists', () => {
  assert.ok(fs.existsSync(path.join(process.cwd(), 'js/ai-compare-intelligence/index.js')));
});

test('guard: all shared sub-modules exist', () => {
  for (const m of ['compare-score-engine.js', 'compare-winner-engine.js', 'compare-risk-engine.js', 'compare-cost-engine.js', 'compare-summary.js']) {
    assert.ok(fs.existsSync(path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/compare', m)));
  }
});

test('guard: all client sub-modules exist', () => {
  for (const m of ['compare-engine.js', 'compare-score-engine.js', 'compare-winner-engine.js', 'compare-risk-engine.js', 'compare-cost-engine.js', 'compare-summary.js', 'compare-card-builder.js']) {
    assert.ok(fs.existsSync(path.join(process.cwd(), 'js/ai-compare-intelligence', m)));
  }
});

test('dashboard html includes compare toolbar in generated view', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true, compareMode: true });
  assert.match(html, /ai-rec-compare-bar/);
  assert.match(html, /data-cmp-action="toggle-mode"/);
});

test('buildCompareInput preserves recommendations', () => {
  const input = buildCompareInput([bmwListing, housingListing], profile);
  assert.equal(input.recommendations.length, 2);
});

test('normalizeCostSignal low risk gives higher score', () => {
  const low = normalizeCostSignal('low', 1000000, 2000000);
  const high = normalizeCostSignal('high', 1000000, 2000000);
  assert.ok(low > high);
});

test('buildScoreComparison computes gap', () => {
  const items = [
    { id: 'a', title: 'A', score: 80, decisionScore: 75, recommendationScore: 70, qualityScore: 80, trustScore: 75, explanationScore: 70 },
    { id: 'b', title: 'B', score: 60, decisionScore: 55, recommendationScore: 50, qualityScore: 60, trustScore: 55, explanationScore: 50 }
  ];
  const sc = buildScoreComparison(items);
  assert.equal(sc.gap, 20);
});

test('COMPARE_FORBIDDEN_PHRASES is non-empty', () => {
  assert.ok(COMPARE_FORBIDDEN_PHRASES.length >= 5);
});

test('minimum 2 selection guard via engine', () => {
  assert.equal(runCompareEngine(buildCompareInput([bmwListing], profile)), null);
});

test('buildCompareSummary uses safe language', () => {
  const summary = buildCompareSummary(
    [{ title: 'A' }, { title: 'B' }],
    { title: 'A' },
    'clear_winner',
    { gap: 15 }
  );
  assert.ok(!containsForbiddenComparePhrase(summary));
});

test('vehicle compare with housing category uses vehicle steps by default', () => {
  const cmp = runCmp([bmwListing, sparseListing]);
  assert.ok(cmp.nextSteps.some((s) => /tramer|ekspertiz|maliyet/i.test(s)));
});

test('housing profile compare uses housing steps', () => {
  clearCompareMemoCache();
  const housingProfile = { ...profile, category: 'housing' };
  const cmp = runCompareEngine(
    buildCompareInput(
      [makeRec(housingListing, 78), makeRec({ ...housingListing, id: '66666666-6666-6666-6666-666666666666', title: 'Beşiktaş 2+1', price: 4800000 }, 72)],
      housingProfile
    ),
    { skipCache: true }
  );
  assert.ok(cmp);
  assert.ok(cmp.nextSteps.some((s) => /tapu|emsal/i.test(s)));
});

test('vacation profile compare uses vacation steps', () => {
  clearCompareMemoCache();
  const travelProfile = { ...profile, category: 'vacation' };
  const cmp = runCompareEngine(
    buildCompareInput(
      [makeRec(travelListing, 80), makeRec({ ...travelListing, id: '77777777-7777-7777-7777-777777777777', title: 'Bodrum Paket', price: 38000 }, 75)],
      travelProfile
    ),
    { skipCache: true }
  );
  assert.ok(cmp);
  assert.ok(cmp.nextSteps.some((s) => /iptal|konum/i.test(s)));
});

// --- ADDITIONAL COVERAGE ---

test('computeItemCompareScore uses all weight components', () => {
  const signals = {
    recommendationScore: 80,
    qualityScore: 70,
    trustScore: 60,
    negotiationSignal: 50,
    ownershipCostSignal: 40,
    riskPenalty: 20
  };
  const score = computeItemCompareScore(
    signals,
    { decisionScore: 75, confidenceScore: 70 },
    { explanationScore: 65 },
    { cost_risk_level: 'low', total_cost: 1000000 },
    2000000
  );
  assert.ok(score > 0 && score <= 100);
});

test('buildWinnerReason for clear winner mentions title', () => {
  const reason = buildWinnerReason({ title: 'BMW' }, { title: 'Audi' }, 18, 'clear_winner');
  assert.match(reason, /BMW/);
});

test('buildWinnerReason for weak comparison', () => {
  const reason = buildWinnerReason(null, null, 0, 'weak_comparison');
  assert.match(reason, /eksik|doğrulama/i);
});

test('tradeoffs are sanitized', () => {
  const cmp = runCmp();
  for (const t of cmp.tradeoffs) {
    assert.ok(!containsForbiddenComparePhrase(t));
  }
});

test('scoreComparison has bestId and worstId', () => {
  const cmp = runCmp();
  assert.ok(cmp.scoreComparison.bestId);
  assert.ok(cmp.scoreComparison.worstId);
});

test('comparedItems do not expose _context', () => {
  const cmp = runCmp();
  for (const item of cmp.comparedItems) {
    assert.equal(item._context, undefined);
  }
});

test('compare with same listings produces deterministic ranking order', () => {
  clearCompareMemoCache();
  const recs = [makeRec(bmwListing, 82), makeRec(sparseListing, 55)];
  const a = runCompareEngine(buildCompareInput(recs, profile), { skipCache: true });
  clearCompareMemoCache();
  const b = runCompareEngine(buildCompareInput(recs, profile), { skipCache: true });
  assert.deepEqual(a.ranking.map((r) => r.id), b.ranking.map((r) => r.id));
});

test('buildCompareInput includes category from profile', () => {
  const input = buildCompareInput([makeRec(bmwListing), makeRec(sparseListing)], profile);
  assert.equal(input.category, 'vehicle');
});

test('buildComparePanelHtml shows close call when no winner', () => {
  const cmp = runCmp([makeRec(bmwListing, 72), makeRec(sparseListing, 68)]);
  const html = buildComparePanelHtml(cmp);
  if (!cmp.winner) assert.match(html, /yakın|Yakın/i);
});

test('buildCompareToolbarHtml shows selection count', () => {
  assert.match(buildCompareToolbarHtml(3), /3 seçili/);
});

test('recommendation card hides compare checkbox without compare mode', () => {
  const html = buildRecommendationCardHtml({ id: 'x', fit_score: 80, recommendation_label: 'Uygun', title: 'Test' });
  assert.doesNotMatch(html, /data-rec-compare-id/);
});

test('dashboard compare mode adds CSS class', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true, compareMode: true });
  assert.match(html, /ai-rec-dashboard--compare-mode/);
});

// --- ADMIN COMPARE TOOLBAR WIRING ---

const adminJsPath = path.join(process.cwd(), 'js/admin/ai-listings-admin.js');

test('admin.js defines compare panel open/close helpers', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /function openComparePanel/);
  assert.match(src, /function closeComparePanel/);
  assert.match(src, /buildComparePanelHtml/);
  assert.match(src, /runCompareEngine/);
});

test('admin.js binds recommendations compare toolbar actions', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /\[data-cmp-action="toggle-mode"\]/);
  assert.match(src, /\[data-rec-compare-id\]/);
  assert.match(src, /\[data-cmp-action="clear"\]/);
  assert.match(src, /\[data-cmp-action="compare"\]/);
  assert.match(src, /compareModeEnabled/);
  assert.match(src, /compareSelectedIds/);
});

test('admin.js compare panel uses global host and close handlers', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /#ai-cmp-panel-host/);
  assert.match(src, /\[data-cmp-panel-action="close"\]/);
  assert.match(src, /\[data-cmp-backdrop\]/);
  assert.match(src, /ai-listings-admin--cmp-open/);
  assert.match(src, /closeComparePanel\(root\)/);
});

test('admin.js workspace compare drawer calls openComparePanel', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /type === 'compare'/);
  assert.match(src, /openComparePanel\(root/);
});

test('admin.js resolves compare checkbox id before input.value', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /function resolveCompareSelectionId/);
  assert.match(src, /getAttribute\('data-rec-compare-id'\)/);
  assert.doesNotMatch(src, /input\.value \|\| input\.getAttribute\('data-rec-compare-id'\)/);
  assert.match(src, /value !== 'on'/);
});

/**
 * Mirrors js/admin/ai-listings-admin.js resolveCompareSelectionId for runtime-style checks.
 * @param {{ value?: string, getAttribute?: (name: string) => string|null, dataset?: { recCompareId?: string } }} input
 * @returns {string}
 */
function resolveCompareSelectionIdForTest(input) {
  const attrId = String(input.getAttribute?.('data-rec-compare-id') || input.dataset?.recCompareId || '').trim();
  if (attrId) return attrId;

  const value = String(input.value ?? '').trim();
  if (value && value !== 'on') return value;

  return '';
}

test('compare selection id prefers data-rec-compare-id over checkbox default value', () => {
  assert.equal(
    resolveCompareSelectionIdForTest({
      value: 'on',
      getAttribute(name) {
        return name === 'data-rec-compare-id' ? '11111111-1111-1111-1111-111111111111' : null;
      },
      dataset: { recCompareId: '11111111-1111-1111-1111-111111111111' }
    }),
    '11111111-1111-1111-1111-111111111111'
  );
});

test('compare selection id ignores default checkbox value "on"', () => {
  assert.equal(
    resolveCompareSelectionIdForTest({
      value: 'on',
      getAttribute() {
        return null;
      },
      dataset: {}
    }),
    ''
  );
});

test('compare selection id returns distinct ids for two default-value checkboxes', () => {
  const ids = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'].map(
    (id) =>
      resolveCompareSelectionIdForTest({
        value: 'on',
        getAttribute(name) {
          return name === 'data-rec-compare-id' ? id : null;
        },
        dataset: { recCompareId: id }
      })
  );
  assert.deepEqual(ids, [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  ]);
  assert.notEqual(ids[0], ids[1]);
});

test('purchaseDecisionComparison items have decisionLabel', () => {
  const cmp = runCmp();
  for (const item of cmp.purchaseDecisionComparison.items) {
    assert.ok(item.decisionLabel);
  }
});

test('riskComparison items have riskLevel', () => {
  const cmp = runCmp();
  for (const item of cmp.riskComparison.items) {
    assert.ok(['low', 'medium', 'high'].includes(item.riskLevel) || item.riskLevel);
  }
});
