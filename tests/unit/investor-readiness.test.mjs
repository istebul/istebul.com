import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const investorDir = path.join(root, 'data/investor');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(investorDir, name), 'utf8'));
}

const {
  getNestedValue,
  formatMetricValue,
  projectFinancialYear,
  buildPackFromAssets,
  resolveMetricsForSlide
} = await import('../../js/features/investor/investor-narrative.js');

const { scoreInvestorReadiness, summarizeDeckGaps, summarizeFundraisingGaps } = await import(
  '../../js/features/investor/investor-readiness.js'
);

const { buildInvestorSnapshot } = await import('../../js/features/metrics/investor-kpis.js');

test('getNestedValue resolves snapshot paths', () => {
  const snap = { subscription: { mrrTry: 299 } };
  assert.equal(getNestedValue(snap, 'subscription.mrrTry'), 299);
});

test('formatMetricValue formats TRY currency', () => {
  assert.match(formatMetricValue(1200, 'currency_try'), /₺/);
});

test('projectFinancialYear computes blended ARR', () => {
  const fm = load('financial-model.json');
  const y1 = projectFinancialYear(fm, 'base', 'y1');
  assert.ok(y1.proMrrTry > 0);
  assert.ok(y1.blendedArrTry > y1.proMrrTry * 12);
});

test('buildPackFromAssets includes projections and resolved metrics', () => {
  const snapshot = buildInvestorSnapshot({
    subscriptions: [{ status: 'active', current_period_start: '2026-05-01', current_period_end: '2026-06-01' }],
    leads: [{ estimated_revenue: 1000, actual_revenue: 500, partner_status: 'won' }],
    analyticsEvents: [{ event_name: 'page_view' }]
  });

  const pack = buildPackFromAssets(
    {
      manifest: load('investor-readiness.json'),
      investorNarrative: load('investor-narrative.json'),
      kpiStory: load('kpi-story.json'),
      metricsStory: load('metrics-story.json'),
      moatStory: load('moat-story.json'),
      marketSizing: load('market-sizing.json'),
      monetizationStory: load('monetization-story.json'),
      financialModel: load('financial-model.json'),
      growthStory: load('growth-story.json'),
      gtmNarrative: load('gtm-narrative.json'),
      deckReadiness: load('deck-readiness.json'),
      fundraisingReadiness: load('fundraising-readiness.json'),
      marketResearch: load('market-research.json')
    },
    snapshot
  );

  assert.equal(pack.version, 'p7.2');
  assert.ok(pack.investorNarrative.headline);
  assert.ok(pack.marketSizing.som.illustrativeSomTry > 0);
  assert.ok(pack.financialModel.projections.base.y1.blendedArrTry);
  const hero = pack.metricsStory.slides.find((s) => s.id === 'traction_hero');
  const mrr = hero.resolvedMetrics.find((m) => m.key === 'subscription.mrrTry');
  assert.ok(mrr.value > 0);
  assert.ok(mrr.display.includes('₺'));
});

test('scoreInvestorReadiness returns verdict for full pack', () => {
  const pack = buildPackFromAssets({
    manifest: load('investor-readiness.json'),
    investorNarrative: load('investor-narrative.json'),
    kpiStory: load('kpi-story.json'),
    metricsStory: load('metrics-story.json'),
    moatStory: load('moat-story.json'),
    marketSizing: load('market-sizing.json'),
    monetizationStory: load('monetization-story.json'),
    financialModel: load('financial-model.json'),
    growthStory: load('growth-story.json'),
    gtmNarrative: load('gtm-narrative.json'),
    deckReadiness: load('deck-readiness.json'),
    fundraisingReadiness: load('fundraising-readiness.json'),
    marketResearch: load('market-research.json')
  });
  const score = scoreInvestorReadiness(pack);
  assert.ok(score.overallPct >= 70);
  assert.ok(['near_ready', 'investor_ready', 'needs_work'].includes(score.verdict));
});

test('summarizeFundraisingGaps lists offline gaps', () => {
  const pack = buildPackFromAssets({
    fundraisingReadiness: load('fundraising-readiness.json')
  });
  const gaps = summarizeFundraisingGaps(pack);
  assert.ok(gaps.gapCount >= 2);
  assert.ok(gaps.gaps.some((g) => g.id === 'signed_loi' || g.id === 'stripe_screenshots'));
  assert.ok(gaps.readyCount >= 10);
});

test('summarizeDeckGaps flags traction snapshot blocker', () => {
  const gaps = summarizeDeckGaps({ deckReadiness: load('deck-readiness.json') });
  assert.equal(gaps.slideCount, 14);
  assert.ok(gaps.blockers.some((b) => b.id === 'traction'));
});

test('resolveMetricsForSlide handles missing keys', () => {
  const resolved = resolveMetricsForSlide({}, [{ key: 'missing.path', format: 'integer' }]);
  assert.equal(resolved[0].value, null);
  assert.equal(resolved[0].display, '—');
});
