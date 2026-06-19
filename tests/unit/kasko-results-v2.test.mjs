import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const {
  buildKaskoResultsV2Payload,
  syncCanonicalKaskoScores,
  resolvePrimaryKaskoResult,
  renderKaskoActionsBarHtml,
  buildEngineResult,
  KASKO_RESULTS_MOUNT_ID
} = await import('../../js/features/kasko/kasko-results-v2.js');

const { buildKaskoPdfPayload } = await import('../../js/features/kasko/kasko-pdf.js');
const { buildKaskoResults } = await import('../../js/features/kasko/kasko-engine.js');

const sampleState = {
  age: 35,
  vehicle_category: 'otomobil',
  vehicle_year_band: '4-10',
  license_years: '3-10',
  usage_type: 'ozel',
  coverage_level: 'standard',
  risk_perception: 'orta',
  budget_level: 'orta'
};

const sampleResults = buildKaskoResults(sampleState);

test('buildKaskoResultsV2Payload uses canonical decisionScore in hero and PDF', () => {
  const payload = buildKaskoResultsV2Payload({
    state: sampleState,
    results: sampleResults,
    selectedOption: 'balanced'
  });
  const engine = buildEngineResult(sampleState);
  assert.equal(payload.decisionScore, engine.decisionScore);
  assert.equal(payload.pdfReportData.decisionScore, engine.decisionScore);
  assert.ok(payload.premiumLabel.includes('₺') || payload.premiumLabel === '—');
});

test('syncCanonicalKaskoScores overwrites legacy scenario scores', () => {
  const results = sampleResults.map((r) => ({ ...r, score: 99 }));
  syncCanonicalKaskoScores(sampleState, results, 'balanced');
  const engine = buildEngineResult(sampleState);
  assert.ok(results.every((r) => r.score === engine.decisionScore));
  assert.ok(results.every((r) => r.score !== 99));
});

test('resolvePrimaryKaskoResult picks selected scenario', () => {
  assert.equal(resolvePrimaryKaskoResult(sampleResults, 'economic')?.id, 'economic');
  assert.equal(resolvePrimaryKaskoResult(sampleResults, '')?.id, sampleResults[0]?.id);
});

test('legacy suppression CSS hides panels when kasko-v2-root is present', () => {
  const css = readFileSync(join(root, 'css/sigorta-results-v2.css'), 'utf8');
  assert.match(css, /\.kasko-v2-root ~ \.ib-premium-dashboard/);
  assert.match(css, /\.kasko-v2-root ~ \.vacation-results-header/);
  assert.match(css, /\.kasko-v2-root ~ \.vacation-result-cards/);
  assert.match(css, /\.kasko-v2-root ~ \.vacation-final-cta/);
  assert.match(css, /display:\s*none\s*!important/);
});

test('mobile overflow containment rules exist for kasko results', () => {
  const css = readFileSync(join(root, 'css/sigorta-mobile-results.css'), 'utf8');
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /body\.kasko-page #kasko-results/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /body\.kasko-page #kasko-flow/);
});

test('renderKaskoActionsBarHtml renders V2 action bar with 4 actions', () => {
  const html = renderKaskoActionsBarHtml({ userId: null });
  assert.match(html, /kasko-v2-actions/);
  assert.match(html, /aria-label="Sonuç aksiyonları"/);
  assert.match(html, /data-kasko-v2-pdf/);
  assert.match(html, /data-kasko-v2-restart/);
  assert.match(html, /data-kasko-v2-quote/);
  assert.match(html, /PDF indir/);
  assert.match(html, /Tekrar analiz/);
  assert.match(html, /Teklif iste/);
  assert.match(html, /sigorta-v2-login-hint/);
  assert.match(html, /returnTo=\/kasko\//);
});

test('logged-in users hide login hint in kasko action bar', () => {
  const html = renderKaskoActionsBarHtml({ userId: 'user-1' });
  assert.doesNotMatch(html, /sigorta-v2-login-hint/);
});

test('buildKaskoPdfPayload uses premiumBand not alternative description', () => {
  const engine = buildEngineResult(sampleState);
  const results = buildKaskoResults(sampleState);
  const pdf = buildKaskoPdfPayload({
    state: sampleState,
    engine,
    results,
    selectedOption: 'balanced'
  });
  const balanced = results.find((r) => r.id === 'balanced');
  assert.ok(pdf.totalCost.yearlyPremium.includes('₺'));
  assert.notEqual(pdf.totalCost.yearlyPremium, engine.alternatives?.[0]?.description);
  assert.ok(
    pdf.totalCost.yearlyPremium.includes(
      new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(
        balanced.metrics.premiumBand
      )
    )
  );
  assert.equal(pdf.metadata.primaryPremium, pdf.totalCost.yearlyPremium);
  assert.equal(pdf.decisionScore, engine.decisionScore);
});

test('mount binds handlers before non-blocking AI hydrate', () => {
  const src = readFileSync(join(root, 'js/features/kasko/kasko-results-v2.js'), 'utf8');
  const bindIdx = src.indexOf('bindKaskoV2Actions(root');
  const hydrateIdx = src.indexOf('void hydrateKaskoExtras(root');
  assert.ok(bindIdx > 0, 'bindKaskoV2Actions call missing');
  assert.ok(hydrateIdx > 0, 'void hydrateKaskoExtras call missing');
  assert.ok(bindIdx < hydrateIdx, 'handlers must bind before AI hydrate');
  assert.doesNotMatch(src, /await fetchKaskoExecutiveSummary/);
  assert.doesNotMatch(src, /await hydrateKaskoExtras/);
});

test('KASKO_RESULTS_MOUNT_ID is kasko-results', () => {
  assert.equal(KASKO_RESULTS_MOUNT_ID, 'kasko-results');
});
