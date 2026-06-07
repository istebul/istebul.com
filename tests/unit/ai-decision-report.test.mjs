import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  clearDecisionReportMemoCache,
  buildReportCacheKey,
  buildReportInput,
  runDecisionReport,
  computeFinalConfidence,
  REPORT_FORBIDDEN_PHRASES,
  sanitizeReportText,
  buildExecutiveSummary,
  buildRecommendationSection,
  buildCoachSection,
  buildSimulatorSection,
  buildStrengthsSection,
  buildWeaknessesSection,
  resolveRiskLevel,
  RISK_LEVELS,
  buildRiskSection,
  VERIFICATION_CHECKLIST_BY_CATEGORY,
  resolveChecklistCategory,
  buildVerificationSection,
  buildAlternativesSection,
  FINAL_DECISION_LABELS,
  resolveFinalDecisionLabel,
  buildFinalDecisionExplanation,
  buildFinalDecisionSection,
  buildDecisionReportPanelHtml,
  buildDecisionReportShellHtml
} = await import('../../js/ai-decision-report/index.js');

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
  attributes: { brand: 'BMW', model: '520i', year: 2010, km: 220000 },
  latest_analysis: { ai_score: 45, risk_score: 72, quality_score: 40, decision_score: 45 },
  duplicate_status: 'exact'
};

const housingListing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'housing',
  title: 'Kadıköy Daire',
  price: 4500000,
  location: 'İstanbul',
  images: ['h.jpg'],
  attributes: { rooms: '3+1' },
  latest_analysis: { ai_score: 70, risk_score: 30, quality_score: 80, decision_score: 70 }
};

const listings = [bmwListing, riskyListing, housingListing];

function getRecResult() {
  clearRecommendationMemoCache();
  return runRecommendationEngine(listings, profile);
}

function runReport() {
  clearDecisionReportMemoCache();
  const result = getRecResult();
  const selected = result.top[0];
  const input = buildReportInput(selected, profile, result.top);
  return runDecisionReport(input);
}

// --- EXECUTIVE SUMMARY ---

test('buildExecutiveSummary uses safe phrasing', () => {
  const summary = buildExecutiveSummary({
    recommendation: { title: 'BMW 320i', fit_score: 80 },
    final_confidence: 65,
    coach: { confidence: 65 }
  });
  assert.match(summary, /mevcut bilgiler ışığında/i);
  assert.match(summary, /doğrulama önerilir/i);
});

test('sanitizeReportText removes forbidden phrases', () => {
  const safe = sanitizeReportText('Kesin alın ve garanti kazandırır.');
  assert.ok(!safe.toLowerCase().includes('kesin alın'));
  assert.ok(!safe.toLowerCase().includes('garanti'));
});

test('REPORT_FORBIDDEN_PHRASES includes garanti', () => {
  assert.ok(REPORT_FORBIDDEN_PHRASES.includes('garanti'));
});

test('runDecisionReport executive_summary has no forbidden wording', () => {
  const report = runReport();
  for (const phrase of REPORT_FORBIDDEN_PHRASES) {
    assert.ok(!report.executive_summary.toLowerCase().includes(phrase));
  }
});

test('executive summary mentions confidence band', () => {
  const report = runReport();
  assert.match(report.executive_summary, /karar güveni/i);
});

// --- RECOMMENDATION SECTION ---

test('buildRecommendationSection returns fit score', () => {
  const rec = getRecResult().top[0];
  const section = buildRecommendationSection(rec);
  assert.ok(section.fit_score > 0);
  assert.ok(section.label);
});

test('buildRecommendationSection includes reasons', () => {
  const rec = getRecResult().top[0];
  const section = buildRecommendationSection(rec);
  assert.ok(Array.isArray(section.reasons));
});

test('report recommendation section populated', () => {
  const report = runReport();
  assert.ok(report.recommendation.fit_score > 0);
});

test('recommendation section has title', () => {
  const report = runReport();
  assert.ok(report.recommendation.title.length > 0);
});

// --- COACH SECTION ---

test('buildCoachSection returns label', () => {
  const report = runReport();
  const section = buildCoachSection(report.decision_coach);
  assert.ok(section.label);
});

test('coach section has should_consider', () => {
  const report = runReport();
  assert.ok(Array.isArray(report.decision_coach.should_consider));
});

test('coach section has verification questions', () => {
  const report = runReport();
  assert.ok(Array.isArray(report.decision_coach.verification_questions));
});

test('coach section confidence 0-100', () => {
  const report = runReport();
  assert.ok(report.decision_coach.confidence >= 0 && report.decision_coach.confidence <= 100);
});

// --- SIMULATOR SECTION ---

test('buildSimulatorSection available when simulator provided', () => {
  const report = runReport();
  assert.equal(report.decision_simulator.available, true);
});

test('simulator section has old and new labels', () => {
  const report = runReport();
  assert.ok(report.decision_simulator.old_label);
  assert.ok(report.decision_simulator.new_label);
});

test('simulator section has delta', () => {
  const report = runReport();
  assert.equal(typeof report.decision_simulator.delta, 'number');
});

test('buildSimulatorSection unavailable for null', () => {
  const section = buildSimulatorSection(null);
  assert.equal(section.available, false);
});

// --- STRENGTHS ---

test('buildStrengthsSection returns prefixed items', () => {
  const report = runReport();
  assert.ok(report.strengths.length > 0);
  assert.ok(report.strengths[0].startsWith('✓'));
});

test('strengths may include budget for good fit', () => {
  const report = runReport();
  const joined = report.strengths.join(' ').toLowerCase();
  assert.ok(joined.length > 0);
});

test('strengths high quality listing', () => {
  const result = getRecResult();
  const ctx = buildReportInput(result.top[0], profile, result.top);
  const strengths = buildStrengthsSection(ctx);
  assert.ok(strengths.some((s) => /kalite|bütçe|recommendation/i.test(s)));
});

// --- WEAKNESSES ---

test('weaknesses returns prefixed items', () => {
  const report = runReport();
  if (report.weaknesses.length) {
    assert.ok(report.weaknesses[0].startsWith('⚠'));
  }
});

test('weaknesses for risky listing may include flags', () => {
  const result = getRecResult();
  const risky = result.recommendations.find((r) => String(r.id) === riskyListing.id) ?? result.top[0];
  const input = buildReportInput(risky, profile, result.top);
  const report = runDecisionReport(input);
  assert.ok(Array.isArray(report.weaknesses));
});

test('buildWeaknessesSection detects duplicate', () => {
  const ctx = {
    recommendation: { duplicate_status: 'exact' },
    coach: { red_flags: ['Duplicate yüksek'] },
    missing_fields: []
  };
  const w = buildWeaknessesSection(ctx);
  assert.ok(w.some((item) => /duplicate/i.test(item)));
});

test('weaknesses detects missing photo', () => {
  const ctx = {
    recommendation: {},
    coach: { red_flags: ['Fotoğraf yok'] },
    missing_fields: ['Fotoğraf']
  };
  const w = buildWeaknessesSection(ctx);
  assert.ok(w.some((item) => /fotoğraf/i.test(item)));
});

// --- RISK ---

test('resolveRiskLevel low for score 25', () => {
  assert.equal(resolveRiskLevel(25), 'Düşük');
});

test('resolveRiskLevel medium for score 50', () => {
  assert.equal(resolveRiskLevel(50), 'Orta');
});

test('resolveRiskLevel high for score 75', () => {
  assert.equal(resolveRiskLevel(75), 'Yüksek');
});

test('RISK_LEVELS has three levels', () => {
  assert.equal(RISK_LEVELS.length, 3);
});

test('buildRiskSection returns level and reasons', () => {
  const report = runReport();
  assert.ok(['Düşük', 'Orta', 'Yüksek'].includes(report.risk_analysis.level));
  assert.ok(Array.isArray(report.risk_analysis.reasons));
});

test('risk section summary mentions level', () => {
  const report = runReport();
  assert.match(report.risk_analysis.summary, /Risk seviyesi/i);
});

// --- VERIFICATION ---

test('resolveChecklistCategory vehicle includes ekspertiz', () => {
  const items = resolveChecklistCategory('vehicle');
  assert.ok(items.includes('ekspertiz'));
});

test('resolveChecklistCategory housing includes tapu', () => {
  const items = resolveChecklistCategory('housing');
  assert.ok(items.includes('tapu'));
});

test('resolveChecklistCategory travel includes iptal', () => {
  const items = resolveChecklistCategory('travel');
  assert.ok(items.some((i) => i.toLowerCase().includes('iptal')));
});

test('VERIFICATION_CHECKLIST vehicle has tramer', () => {
  assert.ok(VERIFICATION_CHECKLIST_BY_CATEGORY.vehicle.includes('tramer'));
});

test('verification checklist uses checkbox symbol', () => {
  const report = runReport();
  assert.ok(report.verification_checklist.items.length > 0);
  assert.equal(report.verification_checklist.items[0].symbol, '□');
});

test('vehicle report checklist includes servis', () => {
  const report = runReport();
  const labels = report.verification_checklist.items.map((i) => i.label).join(' ');
  assert.ok(/servis|tramer|ekspertiz/i.test(labels));
});

// --- ALTERNATIVES ---

test('buildAlternativesSection returns up to 3', () => {
  const result = getRecResult();
  const input = buildReportInput(result.top[0], profile, result.top);
  const alts = buildAlternativesSection(input);
  assert.ok(alts.length <= 3);
});

test('alternatives have rank and reason', () => {
  const report = runReport();
  if (report.alternatives.length) {
    assert.equal(report.alternatives[0].rank, 1);
    assert.ok(report.alternatives[0].reason);
  }
});

test('alternatives exclude selected recommendation', () => {
  const result = getRecResult();
  const selected = result.top[0];
  const input = buildReportInput(selected, profile, result.top);
  const alts = buildAlternativesSection(input);
  assert.ok(!alts.some((a) => a.title === selected.title && result.top.length > 1));
});

// --- FINAL DECISION ---

test('FINAL_DECISION_LABELS includes required labels', () => {
  assert.ok(FINAL_DECISION_LABELS.includes('Çok uygun'));
  assert.ok(FINAL_DECISION_LABELS.includes('Önerilmez'));
});

test('resolveFinalDecisionLabel high fit', () => {
  assert.equal(resolveFinalDecisionLabel(92, 'Güçlü aday'), 'Çok uygun');
});

test('resolveFinalDecisionLabel low fit', () => {
  assert.equal(resolveFinalDecisionLabel(30, ''), 'Önerilmez');
});

test('buildFinalDecisionExplanation safe text', () => {
  const text = buildFinalDecisionExplanation('Uygun', 70);
  assert.match(text, /mevcut bilgiler ışığında/i);
});

test('final decision has label confidence explanation', () => {
  const report = runReport();
  assert.ok(report.final_decision.label);
  assert.ok(report.final_decision.confidence >= 0);
  assert.ok(report.final_decision.explanation);
});

test('computeFinalConfidence 0-100', () => {
  const result = getRecResult();
  const input = buildReportInput(result.top[0], profile, result.top);
  const conf = computeFinalConfidence({
    recommendation: result.top[0],
    coach: { confidence: 60 },
    simulator: { confidence: 50, available: true },
    weaknesses: []
  });
  assert.ok(conf >= 0 && conf <= 100);
});

test('report confidence matches final decision', () => {
  const report = runReport();
  assert.equal(report.confidence, report.final_decision.confidence);
});

// --- FULL REPORT ---

test('runDecisionReport returns all sections', () => {
  const report = runReport();
  assert.ok(report.executive_summary);
  assert.ok(report.recommendation);
  assert.ok(report.decision_coach);
  assert.ok(report.decision_simulator);
  assert.ok(report.strengths);
  assert.ok(report.weaknesses);
  assert.ok(report.risk_analysis);
  assert.ok(report.verification_checklist);
  assert.ok(report.alternatives);
  assert.ok(report.final_decision);
});

test('empty recommendation fallback', () => {
  clearDecisionReportMemoCache();
  const report = runDecisionReport({ recommendation: null, user_intent: profile, top_recommendations: [] });
  assert.equal(report.confidence, 0);
  assert.equal(report.final_decision.confidence, 0);
});

test('buildReportInput constructs context', () => {
  const result = getRecResult();
  const input = buildReportInput(result.top[0], profile, result.top);
  assert.ok(input.coach);
  assert.ok(input.simulator);
  assert.ok(Array.isArray(input.missing_fields));
});

// --- LAZY COMPUTE ---

test('lazy compute memoizes report', () => {
  clearDecisionReportMemoCache();
  const result = getRecResult();
  const input = buildReportInput(result.top[0], profile, result.top);
  const first = runDecisionReport(input);
  const second = runDecisionReport(input);
  assert.equal(first, second);
});

test('lazy compute cache key differs by recommendation', () => {
  const result = getRecResult();
  const keyA = buildReportCacheKey(buildReportInput(result.top[0], profile, result.top));
  const keyB = buildReportCacheKey(
    buildReportInput(result.top[1] ?? result.top[0], profile, result.top)
  );
  if (result.top.length > 1) assert.notEqual(keyA, keyB);
});

test('lazy compute not on dashboard build', () => {
  clearDecisionReportMemoCache();
  const { result } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.ok(result?.top.length > 0);
});

test('lazy compute 10k performance guard', () => {
  clearDecisionReportMemoCache();
  clearRecommendationMemoCache();
  const large = Array.from({ length: 10000 }, (_, i) => ({
    ...bmwListing,
    id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
    price: 1500000 + i * 100
  }));
  const started = Date.now();
  const recResult = runRecommendationEngine(large, profile);
  const input = buildReportInput(recResult.top[0], profile, recResult.top);
  const report = runDecisionReport(input);
  const elapsed = Date.now() - started;
  assert.ok(report.final_decision.label);
  assert.ok(elapsed < 35000, `too slow: ${elapsed}ms`);
});

// --- ADMIN RENDER ---

test('buildRecommendationCardHtml includes AI Decision Report button', () => {
  const rec = getRecResult().top[0];
  const html = buildRecommendationCardHtml(rec);
  assert.match(html, /AI Decision Report/);
  assert.match(html, /data-rec-report-id/);
});

test('buildRecommendationsDashboardHtml includes report host', () => {
  const { html } = buildRecommendationsDashboardHtml(listings, profile, { generated: true });
  assert.match(html, /ai-report-panel-host/);
});

test('buildDecisionReportPanelHtml renders timeline sections', () => {
  const report = runReport();
  const html = buildDecisionReportPanelHtml(report, { title: 'BMW 320i' });
  assert.match(html, /Executive/);
  assert.match(html, /Recommendation/);
  assert.match(html, /Coach/);
  assert.match(html, /Simulator/);
  assert.match(html, /Strengths/);
  assert.match(html, /Weaknesses/);
  assert.match(html, /Risk/);
  assert.match(html, /Checklist/);
  assert.match(html, /Alternatives/);
  assert.match(html, /Final Decision/);
});

test('buildDecisionReportPanelHtml escapes XSS', () => {
  const html = buildDecisionReportPanelHtml(
    {
      executive_summary: '<script>x</script>',
      recommendation: { label: 'Uygun', fit_score: 80, summary: '', reasons: [], risks: [] },
      decision_coach: { label: '—', summary: '', should_consider: [], confidence: 0 },
      decision_simulator: { available: false, summary: 'test', old_label: '—', new_label: '—', delta: 0, positive_reasons: [], negative_reasons: [] },
      strengths: [],
      weaknesses: [],
      risk_analysis: { level: 'Orta', summary: '', reasons: [] },
      verification_checklist: { items: [] },
      alternatives: [],
      final_decision: { label: 'Uygun', confidence: 50, explanation: 'test' }
    },
    { title: 'Test' }
  );
  assert.ok(!html.includes('<script>'));
});

test('buildDecisionReportShellHtml renders host', () => {
  assert.match(buildDecisionReportShellHtml(), /ai-report-panel-host/);
});

// --- GUARDS ---

test('guard: no endpoint change in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /resource: 'listings'/);
  assert.doesNotMatch(router, /decision-report/i);
  assert.doesNotMatch(router, /decision_report/i);
});

test('guard: no schema change for report tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /decision_report/i);
  assert.doesNotMatch(sql, /ai_listing_report/i);
});

test('guard: shared report module exists', () => {
  const p = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/decision-report/report-engine.js');
  assert.ok(fs.existsSync(p));
});

test('guard: client report module exists', () => {
  const p = path.join(process.cwd(), 'js/ai-decision-report/index.js');
  assert.ok(fs.existsSync(p));
});

test('housing category verification includes deprem', () => {
  const items = resolveChecklistCategory('housing');
  assert.ok(items.includes('deprem'));
});

test('housing category verification includes kredi', () => {
  const items = resolveChecklistCategory('housing');
  assert.ok(items.includes('kredi'));
});

test('travel checklist includes sezon', () => {
  const items = resolveChecklistCategory('travel');
  assert.ok(items.includes('sezon'));
});

test('final decision explanation has no forbidden phrases', () => {
  const text = buildFinalDecisionExplanation('Uygun', 65);
  for (const phrase of REPORT_FORBIDDEN_PHRASES) {
    assert.ok(!text.toLowerCase().includes(phrase));
  }
});

test('resolveFinalDecisionLabel incelenebilir band', () => {
  assert.equal(resolveFinalDecisionLabel(65, 'İncelenebilir'), 'İncelenebilir');
});

test('buildRecommendationSection handles null', () => {
  const section = buildRecommendationSection(null);
  assert.equal(section.title, '—');
  assert.equal(section.fit_score, 0);
});

test('report generated_at is ISO string', () => {
  const report = runReport();
  assert.ok(report.generated_at);
  assert.ok(!Number.isNaN(Date.parse(report.generated_at)));
});

test('simulator section positive reasons array', () => {
  const report = runReport();
  assert.ok(Array.isArray(report.decision_simulator.positive_reasons));
});

test('coach section red flags array', () => {
  const report = runReport();
  assert.ok(Array.isArray(report.decision_coach.red_flags));
});

test('risk high for risky listing context', () => {
  const result = getRecResult();
  const risky = result.recommendations.find((r) => String(r.id) === riskyListing.id);
  if (risky) {
    const input = buildReportInput(risky, profile, result.top);
    const report = runDecisionReport(input);
    assert.equal(report.risk_analysis.level, 'Yüksek');
  }
});
