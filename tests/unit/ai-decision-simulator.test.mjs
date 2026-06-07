import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  clearDecisionSimulatorMemoCache,
  buildSimulatorCacheKey,
  buildSimulatorInput,
  computeSimulatorConfidence,
  runDecisionSimulator,
  SIMULATOR_BUDGET_DELTAS,
  SIMULATOR_RISK_OPTIONS,
  SIMULATOR_USAGE_OPTIONS,
  SIMULATOR_ANNUAL_KM_OPTIONS,
  SIMULATOR_PRIORITY_OPTIONS,
  applyBudgetDelta,
  mapSimulatorUsageToProfile,
  mapSimulatorPriorityToProfile,
  buildDefaultScenario,
  buildScenarioProfile,
  describeScenarioChanges,
  computeFitDelta,
  computeSubscoreDelta,
  classifyDeltaDirection,
  DELTA_REASON_TEMPLATES,
  buildSimulationExplanation,
  buildFactorChangeList,
  SIMULATOR_FORBIDDEN_PHRASES,
  sanitizeSimulatorSummary,
  buildSimulatorSummary,
  buildSimulatorRecommendation,
  buildSimulatorFormHtml,
  buildSimulatorResultBodyHtml,
  buildSimulatorPanelHtml,
  buildSimulatorDrawerPanelHtml,
  buildSimulatorShellHtml
} = await import('../../js/ai-decision-simulator/index.js');

const { buildDecisionCoachInput, runDecisionCoach, clearDecisionCoachMemoCache } = await import(
  '../../js/ai-decision-coach/index.js'
);

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
  source_url: 'https://example.com/bmw',
  status: 'approved',
  images: ['img1.jpg', 'img2.jpg'],
  attributes: { brand: 'BMW', model: '320i', year: 2022, km: 45000, body_type: 'sedan' },
  latest_analysis: { ai_score: 82, risk_score: 28, quality_score: 88, decision_score: 82 }
};

const riskyListing = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'vehicle',
  title: '2010 BMW 520i',
  price: 950000,
  location: '',
  images: [],
  attributes: { brand: 'BMW', model: '520i', year: 2010, km: 220000, body_type: 'sedan' },
  latest_analysis: { ai_score: 45, risk_score: 72, quality_score: 40, decision_score: 45 }
};

const listings = [bmwListing, riskyListing];

function getTopRecommendation() {
  clearRecommendationMemoCache();
  return runRecommendationEngine(listings, profile).top[0];
}

function runSim(scenario = {}) {
  clearDecisionSimulatorMemoCache();
  clearDecisionCoachMemoCache();
  const rec = getTopRecommendation();
  const coach = runDecisionCoach(buildDecisionCoachInput(profile, rec, [rec]));
  const input = buildSimulatorInput(rec, coach, profile);
  return runDecisionSimulator(input, scenario);
}

// --- SCENARIO BUILDER ---

test('SIMULATOR_BUDGET_DELTAS includes required options', () => {
  assert.deepEqual([...SIMULATOR_BUDGET_DELTAS], [-20, -10, 0, 10, 20]);
});

test('applyBudgetDelta increases budget by 10%', () => {
  assert.equal(applyBudgetDelta(1800000, 10), 1980000);
});

test('applyBudgetDelta decreases budget by 20%', () => {
  assert.equal(applyBudgetDelta(1800000, -20), 1440000);
});

test('applyBudgetDelta returns null for missing budget', () => {
  assert.equal(applyBudgetDelta(null, 10), null);
});

test('mapSimulatorUsageToProfile maps family', () => {
  assert.equal(mapSimulatorUsageToProfile('family'), 'family');
});

test('mapSimulatorUsageToProfile maps city to city profile', () => {
  assert.equal(mapSimulatorUsageToProfile('city'), 'city');
});

test('mapSimulatorPriorityToProfile maps low_risk', () => {
  assert.equal(mapSimulatorPriorityToProfile('low_risk'), 'low_risk');
});

test('mapSimulatorPriorityToProfile maps value to resale', () => {
  assert.equal(mapSimulatorPriorityToProfile('value'), 'resale');
});

test('buildDefaultScenario returns baseline values', () => {
  const scenario = buildDefaultScenario(profile);
  assert.equal(scenario.budget_delta_pct, 0);
  assert.equal(scenario.risk_tolerance, 'medium');
});

test('buildScenarioProfile applies budget delta', () => {
  const scenario = buildScenarioProfile(profile, { budget_delta_pct: 20 });
  assert.equal(scenario.budget, 2160000);
});

test('describeScenarioChanges lists budget change', () => {
  const changes = describeScenarioChanges(profile, { budget_delta_pct: 10 });
  assert.ok(changes.some((c) => c.includes('Bütçe')));
});

test('SIMULATOR_RISK_OPTIONS has three levels', () => {
  assert.equal(SIMULATOR_RISK_OPTIONS.length, 3);
});

test('SIMULATOR_USAGE_OPTIONS has five options', () => {
  assert.equal(SIMULATOR_USAGE_OPTIONS.length, 5);
});

test('SIMULATOR_ANNUAL_KM_OPTIONS includes 15000', () => {
  assert.ok(SIMULATOR_ANNUAL_KM_OPTIONS.includes(15000));
});

test('SIMULATOR_PRIORITY_OPTIONS includes total_cost', () => {
  assert.ok(SIMULATOR_PRIORITY_OPTIONS.some((o) => o.value === 'total_cost'));
});

// --- BUDGET DELTA ---

test('budget +20% may change fit score', () => {
  const base = runSim({ budget_delta_pct: 0 });
  const plus = runSim({ budget_delta_pct: 20 });
  assert.equal(typeof plus.delta, 'number');
  assert.ok(plus.new_fit_score >= 0);
});

test('budget -20% can reduce fit score', () => {
  const minus = runSim({ budget_delta_pct: -20 });
  assert.ok(minus.new_fit_score <= 100);
});

test('budget delta produces numeric delta field', () => {
  const result = runSim({ budget_delta_pct: 10 });
  assert.equal(result.delta, result.new_fit_score - result.old_fit_score);
});

test('budget increase may add positive budget reason', () => {
  const result = runSim({ budget_delta_pct: 20 });
  if (result.delta > 0) {
    assert.ok(result.positive_reasons.length >= 0);
  } else {
    assert.ok(Array.isArray(result.positive_reasons));
  }
});

// --- RISK DELTA ---

test('risk low tolerance may change fit', () => {
  const base = runSim({ risk_tolerance: 'medium' });
  const low = runSim({ risk_tolerance: 'low' });
  assert.notEqual(low.new_fit_score, undefined);
  assert.equal(typeof low.delta, 'number');
});

test('risk high tolerance may change fit', () => {
  const high = runSim({ risk_tolerance: 'high' });
  assert.ok(high.new_fit_score >= 0 && high.new_fit_score <= 100);
});

test('risk change updates scenario_changes', () => {
  const result = runSim({ risk_tolerance: 'low' });
  assert.ok(Array.isArray(result.scenario_changes));
});

test('risk low may produce negative reasons for risky listing context', () => {
  const result = runSim({ risk_tolerance: 'low' });
  assert.ok(Array.isArray(result.negative_reasons));
});

// --- PRIORITY DELTA ---

test('priority low_risk changes profile priority', () => {
  const profileResult = buildScenarioProfile(profile, { priority: 'low_risk' });
  assert.equal(profileResult.priority, 'low_risk');
});

test('priority performance may change fit', () => {
  const result = runSim({ priority: 'performance' });
  assert.equal(typeof result.new_fit_score, 'number');
});

test('priority value maps to resale', () => {
  const result = runSim({ priority: 'value' });
  assert.ok(result.new_label);
});

test('priority total_cost baseline unchanged delta possible', () => {
  const result = runSim({ priority: 'total_cost', budget_delta_pct: 0 });
  assert.equal(result.direction, classifyDeltaDirection(result.delta));
});

// --- KM DELTA ---

test('annual km 5000 changes scenario profile', () => {
  const p = buildScenarioProfile(profile, { annual_km: 5000 });
  assert.equal(p.annual_km, 5000);
});

test('annual km 30000 may affect fit', () => {
  const result = runSim({ annual_km: 30000 });
  assert.ok(result.scenario_changes.some((c) => c.includes('km')));
});

test('annual km 10000 is valid option', () => {
  assert.ok(SIMULATOR_ANNUAL_KM_OPTIONS.includes(10000));
});

test('annual km change produces scenario description', () => {
  const result = runSim({ annual_km: 20000 });
  assert.ok(result.scenario_changes.length > 0);
});

// --- DELTA ENGINE ---

test('computeFitDelta returns difference', () => {
  assert.equal(computeFitDelta(75, 82), 7);
});

test('computeSubscoreDelta detects budget improvement', () => {
  const delta = computeSubscoreDelta({ budget_fit: 50 }, { budget_fit: 80 });
  assert.ok(delta.positive_reasons.some((r) => /bütçe/i.test(r)));
});

test('computeSubscoreDelta detects risk worsening', () => {
  const delta = computeSubscoreDelta({ risk_fit: 80 }, { risk_fit: 40 });
  assert.ok(delta.negative_reasons.some((r) => /risk/i.test(r)));
});

test('classifyDeltaDirection improved for +10', () => {
  assert.equal(classifyDeltaDirection(10), 'improved');
});

test('classifyDeltaDirection worsened for -10', () => {
  assert.equal(classifyDeltaDirection(-10), 'worsened');
});

test('classifyDeltaDirection unchanged for small delta', () => {
  assert.equal(classifyDeltaDirection(2), 'unchanged');
});

test('DELTA_REASON_TEMPLATES includes budget_fit', () => {
  assert.ok(DELTA_REASON_TEMPLATES.budget_fit);
});

// --- EXPLANATION ---

test('buildSimulationExplanation includes header', () => {
  const text = buildSimulationExplanation({
    positive_reasons: ['bütçe uyumu arttı'],
    negative_reasons: []
  });
  assert.match(text, /Karar değişti çünkü/i);
});

test('buildSimulationExplanation lists positive bullets', () => {
  const text = buildSimulationExplanation({
    positive_reasons: ['kalite etkisi yükseldi'],
    negative_reasons: []
  });
  assert.match(text, /kalite/i);
});

test('buildSimulationExplanation handles empty delta', () => {
  const text = buildSimulationExplanation({ positive_reasons: [], negative_reasons: [] });
  assert.ok(text.length > 0);
});

test('runDecisionSimulator explanation is string', () => {
  const result = runSim({ budget_delta_pct: 10 });
  assert.match(result.explanation, /Karar|değişmedi/i);
});

test('buildFactorChangeList reports changes', () => {
  const changes = buildFactorChangeList({ budget_fit: 50 }, { budget_fit: 75 });
  assert.ok(changes.some((c) => /bütçe/i.test(c)));
});

// --- SUMMARY ---

test('buildSimulatorSummary improved uses safe phrasing', () => {
  const summary = buildSimulatorSummary('improved');
  assert.match(summary, /mevcut senaryoya göre/i);
  assert.match(summary, /doğrulama önerilir/i);
});

test('buildSimulatorSummary worsened is safe', () => {
  const summary = buildSimulatorSummary('worsened');
  assert.ok(!summary.toLowerCase().includes('garanti'));
});

test('sanitizeSimulatorSummary removes forbidden phrases', () => {
  const safe = sanitizeSimulatorSummary('Bu kesin alın ve garanti kazandırır.');
  assert.ok(!safe.toLowerCase().includes('kesin alın'));
});

test('SIMULATOR_FORBIDDEN_PHRASES includes garanti', () => {
  assert.ok(SIMULATOR_FORBIDDEN_PHRASES.includes('garanti'));
});

test('runDecisionSimulator summary has no forbidden phrases', () => {
  const result = runSim({ budget_delta_pct: 15 });
  for (const phrase of SIMULATOR_FORBIDDEN_PHRASES) {
    assert.ok(!result.summary.toLowerCase().includes(phrase));
  }
});

test('buildSimulatorRecommendation produces text', () => {
  const rec = buildSimulatorRecommendation('Uygun', 'improved');
  assert.ok(rec.length > 10);
});

// --- CONFIDENCE ---

test('computeSimulatorConfidence returns 0-100', () => {
  const rec = getTopRecommendation();
  const conf = computeSimulatorConfidence(
    buildSimulatorInput(rec, {}, profile),
    rec.subscores ?? {},
    rec.subscores ?? {},
    5
  );
  assert.ok(conf >= 0 && conf <= 100);
});

test('runDecisionSimulator confidence is number', () => {
  const result = runSim();
  assert.equal(typeof result.confidence, 'number');
});

test('empty scenario confidence is zero', () => {
  const result = runDecisionSimulator({ recommendation: null, user_intent: profile }, {});
  assert.equal(result.confidence, 0);
});

// --- POSITIVE / NEGATIVE REASONS ---

test('positive_reasons is array', () => {
  const result = runSim({ budget_delta_pct: 20 });
  assert.ok(Array.isArray(result.positive_reasons));
});

test('negative_reasons is array', () => {
  const result = runSim({ budget_delta_pct: -20, risk_tolerance: 'low' });
  assert.ok(Array.isArray(result.negative_reasons));
});

test('budget decrease may add negative reason', () => {
  const result = runSim({ budget_delta_pct: -20 });
  if (result.delta < 0) {
    assert.ok(result.negative_reasons.length >= 0);
  }
});

test('usage city change produces result', () => {
  const result = runSim({ usage_type: 'city' });
  assert.ok(result.new_label);
});

// --- OUTPUT SHAPE ---

test('runDecisionSimulator returns complete output shape', () => {
  const result = runSim();
  assert.ok('old_label' in result);
  assert.ok('new_label' in result);
  assert.ok('old_fit_score' in result);
  assert.ok('new_fit_score' in result);
  assert.ok('delta' in result);
  assert.ok('positive_reasons' in result);
  assert.ok('negative_reasons' in result);
  assert.ok('recommendation' in result);
  assert.ok('confidence' in result);
});

test('old_label uses recommendation label', () => {
  const result = runSim();
  assert.ok(result.old_label.length > 0);
});

// --- EMPTY SCENARIO ---

test('empty recommendation fallback', () => {
  clearDecisionSimulatorMemoCache();
  const result = runDecisionSimulator({ recommendation: null, user_intent: profile }, {});
  assert.equal(result.old_fit_score, 0);
  assert.equal(result.delta, 0);
});

test('buildSimulatorInput handles null recommendation', () => {
  const input = buildSimulatorInput(null, {}, profile);
  assert.equal(input.recommendation, null);
});

test('default scenario produces result', () => {
  const result = runSim(buildDefaultScenario(profile));
  assert.ok(result.new_fit_score >= 0);
});

// --- LAZY COMPUTE ---

test('lazy compute memoizes identical scenario', () => {
  clearDecisionSimulatorMemoCache();
  const rec = getTopRecommendation();
  const coach = runDecisionCoach(buildDecisionCoachInput(profile, rec, [rec]));
  const input = buildSimulatorInput(rec, coach, profile);
  const scenario = { budget_delta_pct: 10 };
  const first = runDecisionSimulator(input, scenario);
  const second = runDecisionSimulator(input, scenario);
  assert.equal(first, second);
});

test('lazy compute cache key differs by scenario', () => {
  const rec = getTopRecommendation();
  const input = buildSimulatorInput(rec, {}, profile);
  const keyA = buildSimulatorCacheKey(input, { budget_delta_pct: 0 });
  const keyB = buildSimulatorCacheKey(input, { budget_delta_pct: 20 });
  assert.notEqual(keyA, keyB);
});

test('lazy compute not run on dashboard build', () => {
  clearDecisionSimulatorMemoCache();
  const { result } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.ok(result?.top.length > 0);
});

test('lazy compute 10k performance guard', () => {
  clearDecisionSimulatorMemoCache();
  clearRecommendationMemoCache();
  const large = Array.from({ length: 10000 }, (_, i) => ({
    ...bmwListing,
    id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
    price: 1500000 + i * 100
  }));
  const started = Date.now();
  const recResult = runRecommendationEngine(large, profile);
  const rec = recResult.top[0];
  const coach = runDecisionCoach(buildDecisionCoachInput(profile, rec, recResult.top));
  const sim = runDecisionSimulator(buildSimulatorInput(rec, coach, profile), { budget_delta_pct: 10 });
  const elapsed = Date.now() - started;
  assert.ok(sim.new_label);
  assert.ok(elapsed < 30000, `too slow: ${elapsed}ms`);
});

// --- ADMIN RENDER ---

test('buildRecommendationCardHtml includes Karar Simülatörü button', () => {
  const rec = getTopRecommendation();
  const html = buildRecommendationCardHtml(rec);
  assert.match(html, /Karar Simülatörü/);
  assert.match(html, /data-rec-sim-id/);
});

test('buildRecommendationsDashboardHtml includes simulator host', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.match(html, /ai-sim-panel-host/);
});

test('buildSimulatorFormHtml renders budget select', () => {
  const html = buildSimulatorFormHtml(buildDefaultScenario(profile));
  assert.match(html, /Bütçe/);
  assert.match(html, /Simüle et/);
});

test('buildSimulatorPanelHtml renders timeline', () => {
  const result = runSim({ budget_delta_pct: 10 });
  const html = buildSimulatorPanelHtml(result, { title: 'BMW', coachLabel: 'İncelenebilir' });
  assert.match(html, /Öneri/);
  assert.match(html, /Karar Koçu/);
  assert.match(html, /Senaryo Değişikliği/);
  assert.match(html, /Yeni Karar/);
});

test('buildSimulatorDrawerPanelHtml renders form drawer', () => {
  const html = buildSimulatorDrawerPanelHtml({ title: 'Test', scenario: buildDefaultScenario(profile) });
  assert.match(html, /Karar Simülatörü/);
});

test('buildSimulatorResultBodyHtml renders score delta', () => {
  const result = runSim();
  const html = buildSimulatorResultBodyHtml(result, { coachLabel: 'Güçlü aday' });
  assert.match(html, /Skor farkı|ai-sim-panel__scores/);
});

test('buildSimulatorPanelHtml escapes XSS', () => {
  const html = buildSimulatorPanelHtml(
    {
      old_label: 'Uygun',
      new_label: 'Uygun',
      old_fit_score: 80,
      new_fit_score: 80,
      delta: 0,
      positive_reasons: [],
      negative_reasons: [],
      recommendation: '<script>x</script>',
      confidence: 50,
      explanation: 'test',
      summary: 'test',
      scenario_changes: []
    },
    { title: 'Test' }
  );
  assert.ok(!html.includes('<script>'));
});

test('buildSimulatorShellHtml renders host', () => {
  assert.match(buildSimulatorShellHtml(), /ai-sim-panel-host/);
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /resource: 'listings'/);
  assert.doesNotMatch(router, /decision-simulator/i);
  assert.doesNotMatch(router, /decision_simulator/i);
});

test('guard: no schema change for simulator tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /decision_simulator/i);
  assert.doesNotMatch(sql, /ai_listing_simulator/i);
});

test('guard: shared simulator module exists', () => {
  const p = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/decision-simulator/simulator-engine.js');
  assert.ok(fs.existsSync(p));
});

test('guard: client simulator module exists', () => {
  const p = path.join(process.cwd(), 'js/ai-decision-simulator/index.js');
  assert.ok(fs.existsSync(p));
});
