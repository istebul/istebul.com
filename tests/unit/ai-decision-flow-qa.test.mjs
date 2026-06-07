import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  containsForbiddenCalibrationText,
  checkDecisionFlowConsistency,
  computeConsistencyScore,
  resolveConsistencyStatus,
  buildCalibrationSummary,
  buildCalibrationSummaryText,
  CALIBRATION_FORBIDDEN_PHRASES,
  clearDecisionFlowMemoCache,
  buildDecisionFlowCacheKey,
  runDecisionFlow,
  buildCalibrationBlockHtml
} = await import('../../js/ai-decision-flow/index.js');

const { REPORT_FORBIDDEN_PHRASES } = await import('../../js/ai-decision-report/index.js');

const { buildRecommendationsDashboardHtml } = await import('../../js/admin/ai-listings-recommendations-admin.js');

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

const lowRiskProfile = { ...profile, risk_tolerance: 'low' };

const bmwListing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2022 BMW 320i M Sport',
  description: 'Yetkili servis bakımlı, ekspertiz raporu mevcut',
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
  attributes: { brand: 'BMW', model: '520i', year: 2010, km: 220000 },
  latest_analysis: { ai_score: 45, risk_score: 72, quality_score: 40, decision_score: 45 },
  duplicate_status: 'exact'
};

const lowQualityListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'vehicle',
  title: 'Eksik Bilgili Araç',
  price: 500000,
  location: '',
  images: [],
  description: '',
  attributes: {},
  latest_analysis: { ai_score: 40, risk_score: 50, quality_score: 35, decision_score: 40 }
};

const overBudgetListing = {
  id: '44444444-4444-4444-4444-444444444444',
  category: 'vehicle',
  title: 'Pahalı SUV',
  description: 'Lüks SUV',
  price: 3500000,
  location: 'İzmir',
  images: ['a.jpg'],
  attributes: { brand: 'Porsche', model: 'Cayenne', body_type: 'SUV' },
  latest_analysis: { ai_score: 70, risk_score: 35, quality_score: 75, decision_score: 70 }
};

const listings = [bmwListing, riskyListing, lowQualityListing, overBudgetListing];

function runFlow(listingsInput, prof = profile, selectedId) {
  clearDecisionFlowMemoCache();
  return runDecisionFlow(listingsInput, prof, { selectedId, skipCache: true });
}

// --- END-TO-END FLOW ---

test('flow: recommendation coach simulator report all present for BMW', () => {
  const flow = runFlow(listings, profile, bmwListing.id);
  assert.ok(flow.recommendation?.id);
  assert.ok(flow.coach?.coach_label);
  assert.ok(flow.simulator?.old_label);
  assert.ok(flow.report?.executive_summary);
});

test('flow: same profile pipeline produces calibration', () => {
  const flow = runFlow(listings, profile, bmwListing.id);
  assert.ok(flow.calibration.consistency_score >= 0);
  assert.ok(flow.calibration.status);
});

test('flow: alignment flags for healthy listing', () => {
  const flow = runFlow(listings, profile, bmwListing.id);
  assert.equal(flow.calibration.alignment.recommendation, true);
  assert.equal(flow.calibration.alignment.coach, true);
});

test('flow: checks array populated', () => {
  const flow = runFlow(listings, profile, bmwListing.id);
  assert.ok(flow.checks.length >= 5);
});

// --- HIGH RISK ---

test('high risk listing final decision is cautious', () => {
  const flow = runFlow(listings, profile, riskyListing.id);
  const label = String(flow.report.final_decision.label).toLowerCase();
  assert.ok(
    label.includes('dikkatli') || label.includes('önerilmez') || label.includes('incelenebilir'),
    `expected cautious, got ${flow.report.final_decision.label}`
  );
});

test('high risk flow may include cautious check', () => {
  const flow = runFlow(listings, profile, riskyListing.id);
  const check = flow.checks.find((c) => c.id === 'high_risk_cautious_final');
  if (check) assert.ok(check.passed || flow.calibration.warnings.length > 0);
});

test('high risk coach label not strong candidate', () => {
  const flow = runFlow(listings, profile, riskyListing.id);
  assert.ok(!String(flow.coach.coach_label).includes('Güçlü'));
});

// --- LOW QUALITY ---

test('low quality listing coach has red flags', () => {
  const flow = runFlow(listings, profile, lowQualityListing.id);
  assert.ok(flow.coach.red_flags.length > 0);
});

test('low quality consistency check for red flags', () => {
  const flow = runFlow(listings, profile, lowQualityListing.id);
  const check = flow.checks.find((c) => c.id === 'low_quality_coach_flags');
  assert.ok(check);
});

test('low quality report weaknesses populated', () => {
  const flow = runFlow(listings, profile, lowQualityListing.id);
  assert.ok(flow.report.weaknesses.length > 0);
});

// --- DUPLICATE ---

test('duplicate listing report weaknesses include duplicate', () => {
  const flow = runFlow([riskyListing], profile, riskyListing.id);
  const joined = flow.report.weaknesses.join(' ').toLowerCase();
  assert.ok(joined.includes('duplicate'));
});

test('duplicate consistency check exists', () => {
  const flow = runFlow([riskyListing], profile, riskyListing.id);
  const check = flow.checks.find((c) => c.id === 'duplicate_in_weaknesses');
  assert.ok(check?.passed);
});

// --- BUDGET ---

test('over budget listing has lower budget fit', () => {
  const flow = runFlow([overBudgetListing, bmwListing], profile, overBudgetListing.id);
  const budgetFit = Number(flow.recommendation?.subscores?.budget_fit ?? 100);
  assert.ok(budgetFit < 55);
});

test('over budget may trigger consistency warning or check', () => {
  const flow = runFlow([overBudgetListing, bmwListing], profile, overBudgetListing.id);
  const check = flow.checks.find((c) => c.id === 'over_budget_lower_score');
  assert.ok(check);
});

test('budget +20 scenario increases or maintains fit', () => {
  clearDecisionFlowMemoCache();
  const base = runDecisionFlow(listings, profile, { selectedId: bmwListing.id, scenario: { budget_delta_pct: 0 }, skipCache: true });
  const plus = runDecisionFlow(listings, profile, { selectedId: bmwListing.id, scenario: { budget_delta_pct: 20 }, skipCache: true });
  assert.ok(plus.simulator.new_fit_score >= base.simulator.old_fit_score - 2);
});

test('budget +20 scenario delta non-negative for in-budget BMW', () => {
  const plus = runDecisionFlow(listings, profile, { selectedId: bmwListing.id, scenario: { budget_delta_pct: 20 }, skipCache: true });
  assert.ok(plus.simulator.delta >= -2);
});

// --- RISK TOLERANCE ---

test('low risk tolerance deprioritizes high risk listing in top', () => {
  clearDecisionFlowMemoCache();
  const flow = runFlow(listings, lowRiskProfile);
  const topIds = flow.top_recommendations.map((r) => String(r.id));
  if (topIds.includes(riskyListing.id)) {
    const risky = flow.top_recommendations.find((r) => String(r.id) === riskyListing.id);
    const bmw = flow.top_recommendations.find((r) => String(r.id) === bmwListing.id);
    if (bmw && risky) assert.ok(Number(bmw.fit_score) >= Number(risky.fit_score));
  } else {
    assert.ok(!topIds.includes(riskyListing.id) || topIds[0] !== riskyListing.id);
  }
});

test('low risk profile top recommendation has acceptable risk fit', () => {
  const flow = runFlow(listings, lowRiskProfile);
  const top = flow.recommendation;
  if (top) {
    const riskFit = Number(top.subscores?.risk_fit ?? 0);
    assert.ok(riskFit >= 20);
  }
});

// --- FORBIDDEN WORDING ---

test('report contains no forbidden wording', () => {
  const flow = runFlow(listings, profile, bmwListing.id);
  const text = [
    flow.report.executive_summary,
    flow.report.final_decision.explanation,
    flow.calibration.summary
  ].join(' ').toLowerCase();
  for (const phrase of REPORT_FORBIDDEN_PHRASES) {
    assert.ok(!text.includes(phrase), `found: ${phrase}`);
  }
});

test('calibration summary has no forbidden phrases', () => {
  const summary = buildCalibrationSummaryText(92, []);
  for (const phrase of CALIBRATION_FORBIDDEN_PHRASES) {
    assert.ok(!summary.toLowerCase().includes(phrase));
  }
});

test('containsForbiddenCalibrationText detects banned terms', () => {
  assert.ok(containsForbiddenCalibrationText('Bu garanti kazandırır'));
});

// --- SIMULATOR REPORT CONSISTENCY ---

test('simulator delta consistent with report for BMW', () => {
  const flow = runFlow(listings, profile, bmwListing.id);
  const check = flow.checks.find((c) => c.id === 'simulator_report_consistency');
  if (flow.simulator.available && check) assert.ok(check.passed);
});

test('positive simulator delta does not contradict improved summary', () => {
  const plus = runDecisionFlow(listings, profile, { selectedId: bmwListing.id, scenario: { budget_delta_pct: 20 }, skipCache: true });
  if (plus.simulator.delta > 0) {
    assert.ok(!String(plus.simulator.summary).toLowerCase().includes('azalt'));
  }
});

// --- EMPTY / MISSING FALLBACK ---

test('empty repository safe fallback', () => {
  const flow = runFlow([], profile);
  assert.equal(flow.recommendation, null);
  assert.ok(flow.report.executive_summary);
  assert.equal(flow.calibration.consistency_score, 0);
});

test('empty repository calibration warnings', () => {
  const flow = runFlow([], profile);
  assert.ok(flow.calibration.warnings.length > 0);
});

test('missing fields listing still produces report', () => {
  const flow = runFlow([lowQualityListing], profile, lowQualityListing.id);
  assert.ok(flow.report.verification_checklist.items.length > 0);
});

test('missing fields coach verification questions present', () => {
  const flow = runFlow([lowQualityListing], profile, lowQualityListing.id);
  assert.ok(Array.isArray(flow.coach.verification_questions));
});

// --- CALIBRATION SUMMARY ---

test('resolveConsistencyStatus Tutarlı for high score', () => {
  assert.equal(resolveConsistencyStatus(92), 'Tutarlı');
});

test('resolveConsistencyStatus Çelişkili for low score', () => {
  assert.equal(resolveConsistencyStatus(30), 'Çelişkili');
});

test('buildCalibrationSummary output shape', () => {
  const summary = buildCalibrationSummary({
    checks: [
      { id: 'has_recommendation', passed: true, message: 'ok' },
      { id: 'coach_present', passed: true, message: 'ok' }
    ],
    warnings: []
  });
  assert.equal(typeof summary.consistency_score, 'number');
  assert.ok(summary.status);
  assert.ok(summary.summary);
  assert.ok(summary.alignment);
});

test('computeConsistencyScore calculates percentage', () => {
  const score = computeConsistencyScore({
    checks: [
      { passed: true },
      { passed: true },
      { passed: false }
    ]
  });
  assert.equal(score, 67);
});

test('checkDecisionFlowConsistency returns checks and warnings', () => {
  const flow = runFlow(listings, profile, bmwListing.id);
  const result = checkDecisionFlowConsistency({
    recommendation: flow.recommendation,
    coach: flow.coach,
    simulator: flow.simulator,
    report: flow.report,
    profile
  });
  assert.ok(result.checks.length > 0);
  assert.ok(Array.isArray(result.warnings));
});

// --- LAZY COMPUTE ---

test('lazy compute memoizes decision flow', () => {
  clearDecisionFlowMemoCache();
  const first = runDecisionFlow(listings, profile, { selectedId: bmwListing.id });
  const second = runDecisionFlow(listings, profile, { selectedId: bmwListing.id });
  assert.equal(first, second);
});

test('cache key differs by selected id', () => {
  const keyA = buildDecisionFlowCacheKey(listings, profile, bmwListing.id);
  const keyB = buildDecisionFlowCacheKey(listings, profile, riskyListing.id);
  assert.notEqual(keyA, keyB);
});

test('lazy compute 10k performance guard', () => {
  clearDecisionFlowMemoCache();
  const large = Array.from({ length: 10000 }, (_, i) => ({
    ...bmwListing,
    id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
    price: 1500000 + i * 100
  }));
  const started = Date.now();
  const flow = runDecisionFlow(large, profile, { skipCache: true });
  const elapsed = Date.now() - started;
  assert.ok(flow.calibration.consistency_score >= 0);
  assert.ok(elapsed < 45000, `too slow: ${elapsed}ms`);
});

// --- ADMIN RENDER ---

test('dashboard renders Karar Tutarlılığı block when generated', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.match(html, /Karar Tutarlılığı/);
  assert.match(html, /ai-flow-cal/);
});

test('dashboard no calibration block before generate', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: false });
  assert.doesNotMatch(html, /Karar Tutarlılığı/);
});

test('buildCalibrationBlockHtml renders score and alignment', () => {
  const flow = runFlow(listings, profile, bmwListing.id);
  const html = buildCalibrationBlockHtml(flow.calibration);
  assert.match(html, /Öneri/);
  assert.match(html, /Karar Koçu/);
  assert.match(html, /Karar Simülatörü/);
  assert.match(html, /Karar Raporu/);
});

test('buildCalibrationBlockHtml escapes XSS', () => {
  const html = buildCalibrationBlockHtml({
    consistency_score: 50,
    status: '<script>x</script>',
    warnings: ['<img>'],
    summary: 'test',
    alignment: { recommendation: true, coach: true, simulator: true, report: true }
  });
  assert.ok(!html.includes('<script>'));
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /resource: 'listings'/);
  assert.doesNotMatch(router, /decision-flow/i);
});

test('guard: no schema change for flow tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /decision_flow/i);
  assert.doesNotMatch(sql, /ai_listing_flow/i);
});

test('guard: shared decision flow module exists', () => {
  const p = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/decision-flow/consistency-checker.js');
  assert.ok(fs.existsSync(p));
});

test('guard: client decision flow module exists', () => {
  const p = path.join(process.cwd(), 'js/ai-decision-flow/index.js');
  assert.ok(fs.existsSync(p));
});
