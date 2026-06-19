import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  clearScenarioSimulatorMemoCache,
  buildScenarioCacheKey,
  buildScenarioInput,
  runScenarioSimulator,
  SCENARIO_LEVEL_LABELS,
  SCENARIO_FORBIDDEN_PHRASES,
  sanitizeScenarioText,
  containsForbiddenScenarioPhrase,
  resolveScenarioLevel,
  buildScenarioSummary,
  buildScenarioNextSteps,
  PRICE_SCENARIO_PRESETS,
  buildPriceScenario,
  buildPriceScenarios,
  getCostScenarioPresets,
  buildCostScenarios,
  RISK_SCENARIO_PRESETS,
  buildRiskScenarios,
  buildScenarioPanelHtml,
  buildScenarioTeaserHtml,
  buildScenarioShellHtml
} = await import('../../js/ai-scenario-simulator/index.js');

const { runRecommendationEngine, clearRecommendationMemoCache } = await import(
  '../../js/ai-recommendation-engine/index.js'
);
const { runPurchaseDecisionEngine, clearPurchaseDecisionMemoCache, buildPurchaseDecisionInput } = await import(
  '../../js/ai-purchase-decision/index.js'
);
const { extractPurchaseSignals } = await import('../../js/ai-purchase-decision/decision-strength-engine.js');

const routerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/router.js');

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
  description: 'Yetkili servis bakımlı, tramer kaydı temiz',
  price: 1780000,
  location: 'İzmir',
  images: ['img1.jpg', 'img2.jpg'],
  attributes: { brand: 'BMW', model: '320i', year: 2022, km: 45000 },
  latest_analysis: { risk_score: 28, quality_score: 88, decision_score: 82 },
  updated_at: new Date().toISOString()
};

const housingListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'housing',
  title: 'Kadıköy 3+1 Daire',
  description: 'Tapu kat mülkiyeti, iskan mevcut',
  price: 5200000,
  location: 'İstanbul',
  images: ['h1.jpg'],
  latest_analysis: { risk_score: 35, quality_score: 75 },
  updated_at: new Date().toISOString()
};

const travelListing = {
  id: '44444444-4444-4444-4444-444444444444',
  category: 'vacation',
  title: 'Antalya 7 Gün Paket',
  description: 'İptal koşulları esnek',
  price: 42000,
  location: 'Antalya',
  images: ['t1.jpg'],
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

function getRec(listing = bmwListing) {
  clearRecommendationMemoCache();
  const result = runRecommendationEngine([listing, sparseListing], profile);
  return result.top.find((r) => String(r.id) === String(listing.id)) ?? result.top[0];
}

function runSs(rec = null, scenarioKey = 'price_minus_5', userIntent = profile) {
  clearScenarioSimulatorMemoCache();
  clearPurchaseDecisionMemoCache();
  const recommendation = rec ?? getRec();
  const input = buildScenarioInput(recommendation, userIntent, scenarioKey);
  return runScenarioSimulator(input, { skipCache: true });
}

// --- BASE SCORE ---

test('baseDecisionScore fallback to 0 when no data', () => {
  const result = runScenarioSimulator(buildScenarioInput({}, profile, 'price_minus_5'), { skipCache: true });
  assert.equal(result, null);
});

test('baseDecisionScore is present for valid recommendation', () => {
  const ss = runSs();
  assert.ok(ss);
  assert.ok(Number.isFinite(ss.baseDecisionScore));
  assert.ok(ss.baseDecisionScore >= 0);
});

test('simulatedDecisionScore clamped 0-100', () => {
  const ss = runSs();
  assert.ok(ss.simulatedDecisionScore >= 0 && ss.simulatedDecisionScore <= 100);
});

test('baseDecisionScore clamped 0-100', () => {
  const ss = runSs();
  assert.ok(ss.baseDecisionScore >= 0 && ss.baseDecisionScore <= 100);
});

test('scoreDelta is numeric', () => {
  const ss = runSs();
  assert.ok(Number.isFinite(ss.scoreDelta));
});

// --- PRICE SCENARIOS ---

test('price minus 3 scenario exists', () => {
  const ss = runSs(null, 'price_minus_3');
  const price = ss.priceScenarios.find((s) => s.key === 'price_minus_3');
  assert.ok(price);
  assert.equal(price.discountPct, 3);
});

test('price minus 5 scenario exists', () => {
  const ss = runSs(null, 'price_minus_5');
  const price = ss.priceScenarios.find((s) => s.key === 'price_minus_5');
  assert.ok(price);
  assert.equal(price.discountPct, 5);
});

test('price minus 10 scenario exists', () => {
  const ss = runSs(null, 'price_minus_10');
  const price = ss.priceScenarios.find((s) => s.key === 'price_minus_10');
  assert.ok(price);
  assert.equal(price.discountPct, 10);
});

test('price minus 10 improves score vs base', () => {
  const ss = runSs(null, 'price_minus_10');
  const price = ss.priceScenarios.find((s) => s.key === 'price_minus_10');
  assert.ok(price.estimatedDecisionScore >= ss.baseDecisionScore);
});

test('price scenario has adjustedPrice', () => {
  const ss = runSs();
  const price = ss.priceScenarios[0];
  assert.ok(price.adjustedPrice > 0);
  assert.ok(price.adjustedPrice < bmwListing.price);
});

test('price scenario explanation uses tahmini language', () => {
  const ss = runSs();
  const price = ss.priceScenarios[0];
  assert.match(String(price.explanation), /tahmini/i);
});

test('buildPriceScenarios returns 3 presets by default', () => {
  const rec = getRec();
  const pdInput = buildPurchaseDecisionInput(rec, profile);
  const pd = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  const signals = extractPurchaseSignals(pdInput);
  const scenarios = buildPriceScenarios(signals, pd.decisionScore, bmwListing.price);
  assert.equal(scenarios.length, 3);
});

test('PRICE_SCENARIO_PRESETS has Turkish labels', () => {
  assert.ok(PRICE_SCENARIO_PRESETS.every((p) => p.label.startsWith('Fiyat')));
});

test('custom price change scenario supported', () => {
  const rec = getRec();
  const pdInput = buildPurchaseDecisionInput(rec, profile);
  const pd = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  const signals = extractPurchaseSignals(pdInput);
  const scenarios = buildPriceScenarios(signals, pd.decisionScore, bmwListing.price, 7);
  assert.ok(scenarios.some((s) => s.key === 'custom_price_change'));
});

// --- DECISION LABEL CHANGE ---

test('decision label change tracked in price scenario', () => {
  const ss = runSs(null, 'price_minus_10');
  assert.ok(ss.baseDecisionLabel);
  assert.ok(ss.simulatedDecisionLabel);
  const selected = ss.selectedScenario;
  assert.ok(selected.baseDecisionLabel || ss.baseDecisionLabel);
});

test('scenarioLabel is Turkish', () => {
  const ss = runSs();
  assert.ok(['Kararı güçlendirir', 'Etki sınırlı', 'Kararı zayıflatır', 'Veri yetersiz'].includes(ss.scenarioLabel));
});

test('SCENARIO_LEVEL_LABELS has all levels', () => {
  assert.equal(SCENARIO_LEVEL_LABELS.improves, 'Kararı güçlendirir');
  assert.equal(SCENARIO_LEVEL_LABELS.neutral, 'Etki sınırlı');
  assert.equal(SCENARIO_LEVEL_LABELS.worsens, 'Kararı zayıflatır');
  assert.equal(SCENARIO_LEVEL_LABELS.insufficient_data, 'Veri yetersiz');
});

// --- INSUFFICIENT DATA ---

test('insufficient data fallback for empty recommendation', () => {
  const result = runScenarioSimulator(buildScenarioInput({}, profile), { skipCache: true });
  assert.equal(result, null);
});

test('resolveScenarioLevel insufficient_data when no data', () => {
  assert.equal(resolveScenarioLevel(5, false), 'insufficient_data');
});

test('buildScenarioSummary insufficient_data uses safe language', () => {
  const summary = buildScenarioSummary({ scoreDelta: 0, scenarioLevel: 'insufficient_data' });
  assert.match(summary, /tahmini|veri/i);
  assert.ok(!containsForbiddenScenarioPhrase(summary));
});

// --- COST SCENARIOS ---

test('vehicle cost scenario presets', () => {
  const presets = getCostScenarioPresets('vehicle');
  assert.equal(presets.length, 3);
  assert.ok(presets.some((p) => p.key === 'yearly_km_change'));
  assert.ok(presets.some((p) => p.key === 'fuel_cost_change'));
  assert.ok(presets.some((p) => p.key === 'maintenance_cost_change'));
});

test('housing cost scenario presets', () => {
  const presets = getCostScenarioPresets('housing');
  assert.ok(presets.some((p) => p.key === 'financing_rate_change'));
  assert.ok(presets.some((p) => p.key === 'dues_change'));
  assert.ok(presets.some((p) => p.key === 'renovation_cost_change'));
});

test('vacation cost scenario presets', () => {
  const presets = getCostScenarioPresets('travel');
  assert.ok(presets.some((p) => p.key === 'extra_fee_change'));
  assert.ok(presets.some((p) => p.key === 'date_change'));
  assert.ok(presets.some((p) => p.key === 'cancellation_policy_change'));
});

test('vehicle cost scenarios in simulation output', () => {
  const ss = runSs();
  assert.equal(ss.costScenarios.length, 3);
  assert.ok(ss.costScenarios.some((s) => s.key === 'fuel_cost_change'));
});

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

test('housing cost scenarios with housing profile', () => {
  const housingProfile = { ...profile, category: 'housing' };
  const rec = makeRec(housingListing, 78);
  const ss = runScenarioSimulator(buildScenarioInput(rec, housingProfile, 'financing_rate_change'), {
    skipCache: true
  });
  assert.ok(ss);
  assert.ok(ss.costScenarios.some((s) => s.key === 'financing_rate_change'));
});

test('vacation cost scenarios with vacation profile', () => {
  const travelProfile = { ...profile, category: 'vacation' };
  const rec = makeRec(travelListing, 80);
  const ss = runScenarioSimulator(buildScenarioInput(rec, travelProfile, 'extra_fee_change'), {
    skipCache: true
  });
  assert.ok(ss);
  assert.ok(ss.costScenarios.some((s) => s.key === 'extra_fee_change'));
});

test('cost scenario explanation sanitized', () => {
  const rec = getRec();
  const pdInput = buildPurchaseDecisionInput(rec, profile);
  const pd = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  const signals = extractPurchaseSignals(pdInput);
  const costs = buildCostScenarios(signals, pd.decisionScore, 'vehicle');
  for (const c of costs) {
    assert.ok(!containsForbiddenScenarioPhrase(c.explanation));
  }
});

// --- RISK SCENARIOS ---

test('risk scenario presets count', () => {
  assert.equal(RISK_SCENARIO_PRESETS.length, 4);
});

test('missing_info_completed risk scenario', () => {
  const ss = runSs(null, 'missing_info_completed');
  assert.ok(ss.riskScenarios.some((s) => s.key === 'missing_info_completed'));
});

test('duplicate_risk_removed risk scenario', () => {
  const ss = runSs(null, 'duplicate_risk_removed');
  const risk = ss.riskScenarios.find((s) => s.key === 'duplicate_risk_removed');
  assert.ok(risk);
  assert.match(risk.label, /Mükerrer/);
});

test('suspicious_price_verified risk scenario', () => {
  const ss = runSs(null, 'suspicious_price_verified');
  assert.ok(ss.riskScenarios.some((s) => s.key === 'suspicious_price_verified'));
});

test('risk scenario improves score when missing info completed', () => {
  const ss = runSs(null, 'missing_info_completed');
  const risk = ss.riskScenarios.find((s) => s.key === 'missing_info_completed');
  assert.ok(risk.estimatedDecisionScore >= ss.baseDecisionScore);
});

test('buildRiskScenarios returns 4 items', () => {
  const rec = getRec();
  const pdInput = buildPurchaseDecisionInput(rec, profile);
  const pd = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  const signals = extractPurchaseSignals(pdInput);
  const risks = buildRiskScenarios(signals, pd.decisionScore);
  assert.equal(risks.length, 4);
});

// --- SAFE LANGUAGE ---

test('summary uses tahmini language', () => {
  const ss = runSs();
  assert.match(String(ss.summary), /tahmini|veri kalitesine/i);
});

test('summary does not contain banned phrases', () => {
  const ss = runSs();
  assert.ok(!containsForbiddenScenarioPhrase(ss.summary));
});

test('next steps do not contain banned phrases', () => {
  const ss = runSs();
  for (const step of ss.nextSteps) {
    assert.ok(!containsForbiddenScenarioPhrase(step));
  }
});

test('sanitizeScenarioText replaces kesin alınır', () => {
  const text = sanitizeScenarioText('Bu araç kesin alınır fırsatı');
  assert.ok(!containsForbiddenScenarioPhrase(text));
  assert.match(text, /değerlendirilebilir/);
});

test('sanitizeScenarioText replaces garanti kazanç', () => {
  const text = sanitizeScenarioText('garanti kazanç sağlar');
  assert.ok(!containsForbiddenScenarioPhrase(text));
});

test('sanitizeScenarioText replaces kaçırılmaz', () => {
  const text = sanitizeScenarioText('kaçırılmaz fırsat');
  assert.ok(!containsForbiddenScenarioPhrase(text));
});

test('sanitizeScenarioText replaces risksiz', () => {
  const text = sanitizeScenarioText('tamamen risksiz');
  assert.ok(!containsForbiddenScenarioPhrase(text));
});

test('sanitizeScenarioText replaces mutlaka al', () => {
  const text = sanitizeScenarioText('mutlaka al');
  assert.ok(!containsForbiddenScenarioPhrase(text));
});

test('SCENARIO_FORBIDDEN_PHRASES includes mutlaka sat', () => {
  assert.ok(SCENARIO_FORBIDDEN_PHRASES.includes('mutlaka sat'));
});

// --- NEXT STEPS BRANCHING ---

test('vehicle next steps mention fiyat', () => {
  const steps = buildScenarioNextSteps('vehicle');
  assert.ok(steps.some((s) => /fiyat|maliyet|ekspertiz/i.test(s)));
});

test('housing next steps mention finansman', () => {
  const steps = buildScenarioNextSteps('housing');
  assert.ok(steps.some((s) => /finansman|aidat|tapu/i.test(s)));
});

test('vacation next steps mention iptal', () => {
  const steps = buildScenarioNextSteps('vacation');
  assert.ok(steps.some((s) => /iptal|tarih|rezervasyon/i.test(s)));
});

test('simulation nextSteps match category', () => {
  const ss = runSs();
  assert.ok(ss.nextSteps.length >= 3);
});

// --- SCENARIO LEVEL ---

test('resolveScenarioLevel improves for delta >= 4', () => {
  assert.equal(resolveScenarioLevel(5, true), 'improves');
});

test('resolveScenarioLevel worsens for delta <= -4', () => {
  assert.equal(resolveScenarioLevel(-5, true), 'worsens');
});

test('resolveScenarioLevel neutral for small delta', () => {
  assert.equal(resolveScenarioLevel(2, true), 'neutral');
  assert.equal(resolveScenarioLevel(-2, true), 'neutral');
});

// --- MEMO CACHE ---

test('memo cache returns same result', () => {
  clearScenarioSimulatorMemoCache();
  const rec = getRec();
  const input = buildScenarioInput(rec, profile, 'price_minus_5');
  const a = runScenarioSimulator(input);
  const b = runScenarioSimulator(input);
  assert.deepEqual(a, b);
});

test('skipCache produces fresh result', () => {
  clearScenarioSimulatorMemoCache();
  const rec = getRec();
  const input = buildScenarioInput(rec, profile, 'price_minus_5');
  const a = runScenarioSimulator(input, { skipCache: true });
  const b = runScenarioSimulator(input, { skipCache: true });
  assert.deepEqual(a, b);
});

test('buildScenarioCacheKey includes id and scenario', () => {
  const key = buildScenarioCacheKey({ id: 'abc' }, profile, 'price_minus_3');
  assert.match(key, /ss:abc:price_minus_3/);
});

test('clearScenarioSimulatorMemoCache works', () => {
  clearScenarioSimulatorMemoCache();
  const rec = getRec();
  const input = buildScenarioInput(rec, profile);
  runScenarioSimulator(input);
  clearScenarioSimulatorMemoCache();
  const again = runScenarioSimulator(input, { skipCache: true });
  assert.ok(again);
});

// --- PANEL HTML ---

test('buildScenarioPanelHtml empty state Turkish', () => {
  const html = buildScenarioPanelHtml(null);
  assert.match(html, /senaryo simülasyonu üretilemedi/i);
  assert.match(html, /Senaryo Simülasyonu/);
});

test('buildScenarioPanelHtml shows scores', () => {
  const ss = runSs();
  const html = buildScenarioPanelHtml(ss, { title: 'BMW Test' });
  assert.match(html, /Eski karar skoru/);
  assert.match(html, /Yeni tahmini skor/);
  assert.match(html, /Skor farkı/);
  assert.match(html, /BMW Test/);
});

test('buildScenarioPanelHtml has preset buttons', () => {
  const ss = runSs();
  const html = buildScenarioPanelHtml(ss);
  assert.match(html, /data-ss-scenario="price_minus_3"/);
  assert.match(html, /data-ss-scenario="duplicate_risk_removed"/);
  assert.match(html, /Fiyat -%5/);
});

test('buildScenarioPanelHtml escapes title XSS', () => {
  const ss = runSs();
  const html = buildScenarioPanelHtml(ss, { title: '<script>x</script>' });
  assert.doesNotMatch(html, /<script>/);
});

test('buildScenarioTeaserHtml includes scenario action', () => {
  const html = buildScenarioTeaserHtml({ summary: 'Test teaser' });
  assert.match(html, /data-ws-action="scenario"/);
  assert.match(html, /Test teaser/);
});

test('buildScenarioShellHtml has host id', () => {
  assert.match(buildScenarioShellHtml(), /id="ai-ss-panel-host"/);
});

// --- MUTATION SAFETY ---

test('fit_score unchanged after scenario run', () => {
  const rec = getRec();
  const before = rec.fit_score;
  runSs(rec);
  assert.equal(rec.fit_score, before);
});

test('decisionScore on purchase engine unchanged', () => {
  const rec = getRec();
  const pdInput = buildPurchaseDecisionInput(rec, profile);
  const before = runPurchaseDecisionEngine(pdInput, { skipCache: true }).decisionScore;
  runSs(rec);
  const after = runPurchaseDecisionEngine(pdInput, { skipCache: true }).decisionScore;
  assert.equal(after, before);
});

test('recommendation listing price unchanged', () => {
  const rec = getRec();
  const before = rec.price;
  runSs(rec, 'price_minus_10');
  assert.equal(rec.price, before);
});

// --- ROUTER INTEGRATION ---

test('scenario simulator shared module exists in router path area', () => {
  const enginePath = path.join(
    process.cwd(),
    'supabase/functions/_shared/ai-listings/scenario-simulator/scenario-simulator-engine.js'
  );
  assert.ok(fs.existsSync(enginePath));
});

test('buildScenarioInput preserves category', () => {
  const rec = getRec();
  const input = buildScenarioInput(rec, profile, 'price_minus_5');
  assert.equal(input.category, 'vehicle');
});

test('buildScenarioInput includes scenario_key', () => {
  const input = buildScenarioInput({ id: 'x', fit_score: 80, category: 'vehicle', price: 100 }, profile, 'price_minus_3');
  assert.equal(input.scenario_key, 'price_minus_3');
});

test('selectedScenario matches scenario_key', () => {
  const ss = runSs(null, 'duplicate_risk_removed');
  assert.equal(ss.selectedScenario?.key, 'duplicate_risk_removed');
});

test('scenarioLevel is valid enum', () => {
  const ss = runSs();
  assert.ok(['improves', 'neutral', 'worsens', 'insufficient_data'].includes(ss.scenarioLevel));
});

test('price scenarios all have explanation', () => {
  const ss = runSs();
  for (const p of ss.priceScenarios) {
    assert.ok(p.explanation);
    assert.match(String(p.explanation), /tahmini/i);
  }
});

test('buildPriceScenario clamps estimatedDecisionScore', () => {
  const rec = getRec();
  const pdInput = buildPurchaseDecisionInput(rec, profile);
  const pd = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  const signals = extractPurchaseSignals(pdInput);
  const scenario = buildPriceScenario(signals, pd.decisionScore, 1780000, 50, 'test');
  assert.ok(scenario.estimatedDecisionScore >= 0 && scenario.estimatedDecisionScore <= 100);
});
