import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const {
  buildSigortaResultsV2Payload,
  syncCanonicalSigortaScores,
  resolvePrimarySigortaResult,
  renderSigortaActionsBarHtml,
  buildEngineResult,
  SIGORTA_RESULTS_MOUNT_ID
} = await import('../../js/features/sigorta/sigorta-results-v2.js');

const { buildSigortaPdfPayload } = await import('../../js/features/sigorta/sigorta-pdf.js');
const { buildSigortaResults } = await import('../../js/features/sigorta/sigorta-engine.js');

const sampleState = {
  insurance_type: 'saglik',
  age: 38,
  children_count: '2',
  risk_perception: 'yuksek',
  budget_level: 'orta'
};

const sampleResults = buildSigortaResults(sampleState);

test('buildSigortaResultsV2Payload uses canonical decisionScore in hero and PDF', () => {
  const payload = buildSigortaResultsV2Payload({
    state: sampleState,
    results: sampleResults,
    selectedOption: 'balanced'
  });
  const engine = buildEngineResult(sampleState);
  assert.equal(payload.decisionScore, engine.decisionScore);
  assert.equal(payload.pdfReportData.decisionScore, engine.decisionScore);
  assert.ok(payload.premiumLabel.includes('₺') || payload.premiumLabel === '—');
});

test('syncCanonicalSigortaScores overwrites legacy scenario scores', () => {
  const results = sampleResults.map((r) => ({ ...r, score: 99 }));
  syncCanonicalSigortaScores(sampleState, results, 'balanced');
  const engine = buildEngineResult(sampleState);
  assert.ok(results.every((r) => r.score === engine.decisionScore));
  assert.ok(results.every((r) => r.score !== 99));
});

test('resolvePrimarySigortaResult picks selected scenario', () => {
  assert.equal(resolvePrimarySigortaResult(sampleResults, 'economic')?.id, 'economic');
  assert.equal(resolvePrimarySigortaResult(sampleResults, '')?.id, sampleResults[0]?.id);
});

test('legacy suppression CSS hides panels when V2 root is present', () => {
  const css = readFileSync(join(root, 'css/sigorta-results-v2.css'), 'utf8');
  assert.match(css, /\.sigorta-v2-root ~ \.ib-premium-dashboard/);
  assert.match(css, /\.sigorta-v2-root ~ \.vacation-results-header/);
  assert.match(css, /\.sigorta-v2-root ~ \.vacation-results-top-pick/);
  assert.match(css, /\.sigorta-v2-root ~ \.vacation-result-cards/);
  assert.match(css, /\.sigorta-v2-root ~ \.vacation-selection-bar/);
  assert.match(css, /\.sigorta-v2-root ~ \.vacation-final-cta/);
  assert.match(css, /display:\s*none\s*!important/);
});

test('mobile overflow containment rules exist for sigorta results', () => {
  const css = readFileSync(join(root, 'css/sigorta-mobile-results.css'), 'utf8');
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /body\.sigorta-page #sigorta-results/);
  assert.match(css, /overflow-x:\s*clip/);
});

test('renderSigortaActionsBarHtml renders V2 action bar', () => {
  const html = renderSigortaActionsBarHtml({ userId: 'user-1' });
  assert.match(html, /sigorta-v2-actions/);
  assert.match(html, /aria-label="Sonuç aksiyonları"/);
  assert.match(html, /data-sigorta-v2-pdf/);
  assert.match(html, /data-sigorta-v2-restart/);
  assert.match(html, /data-sigorta-v2-quote/);
});

test('V2 action bar includes PDF download button', () => {
  const html = renderSigortaActionsBarHtml({ userId: 'user-1' });
  assert.match(html, /PDF indir/);
  assert.match(html, /data-sigorta-v2-pdf/);
});

test('V2 action bar includes restart analysis button', () => {
  const html = renderSigortaActionsBarHtml({ userId: 'user-1' });
  assert.match(html, /Tekrar analiz/);
  assert.match(html, /data-sigorta-v2-restart/);
});

test('V2 action bar includes quote request CTA', () => {
  const html = renderSigortaActionsBarHtml({ userId: 'user-1' });
  assert.match(html, /Teklif iste/);
  assert.match(html, /data-sigorta-v2-quote/);
});

test('guest users get login hint in V2 action bar', () => {
  const html = renderSigortaActionsBarHtml({ userId: null });
  assert.match(html, /sigorta-v2-login-hint/);
  assert.match(html, /Giriş yapın/);
  assert.match(html, /returnTo=\/sigorta\//);
});

test('buildSigortaPdfPayload uses premiumBand not alternative description', () => {
  const engine = buildEngineResult(sampleState);
  const results = buildSigortaResults(sampleState);
  const pdf = buildSigortaPdfPayload({
    state: sampleState,
    engine,
    results,
    selectedOption: 'balanced'
  });
  const balanced = results.find((r) => r.id === 'balanced');
  assert.ok(pdf.totalCost.yearlyPremium.includes('₺'));
  assert.notEqual(pdf.totalCost.yearlyPremium, engine.alternatives?.[1]?.description);
  assert.notEqual(pdf.totalCost.yearlyPremium, engine.alternatives?.[0]?.description);
  assert.ok(
    pdf.totalCost.yearlyPremium.includes(
      new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(
        balanced.metrics.premiumBand
      )
    )
  );
  assert.equal(pdf.metadata.primaryPremium, pdf.totalCost.yearlyPremium);
});

test('SIGORTA_RESULTS_MOUNT_ID is sigorta-results', () => {
  assert.equal(SIGORTA_RESULTS_MOUNT_ID, 'sigorta-results');
});

test('legacy actions hidden but V2 preserves user actions', () => {
  const css = readFileSync(join(root, 'css/sigorta-results-v2.css'), 'utf8');
  assert.match(css, /\.sigorta-v2-root ~ \.vacation-final-cta/);
  const html = renderSigortaActionsBarHtml({ userId: null });
  assert.match(html, /PDF indir/);
  assert.match(html, /Tekrar analiz/);
  assert.match(html, /Teklif iste/);
  assert.match(html, /sigorta-v2-login-hint/);
});
