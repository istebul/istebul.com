import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  computeRepositoryAnalytics,
  clearAnalyticsMemoCache,
  buildAnalyticsCacheKey,
  enrichRecordsWithDuplicateSimilarity,
  computeAnalyticsKpi,
  buildDeterministicExecutiveSummary,
  computeScoreDistribution,
  computeRiskTierDistribution,
  computeExecutiveDistribution,
  computeDuplicateDistribution,
  computeSourceDistribution,
  computeCategoryDistribution,
  computeTopCounts,
  computeTrendSeries,
  computeAllTrends,
  countRecordsToday,
  countRecordsInDays,
  bucketScoreValue,
  classifyRiskTier,
  classifyExecutiveBucket,
  classifyDuplicateBucket,
  SCORE_BUCKETS,
  runAnalyticsEngine
} = await import('../../js/ai-listings-analytics/index.js');

const { computeQualityDistribution } = await import('../../js/ai-listings-analytics/quality-engine.js');
const { countHighRiskRecords } = await import('../../js/ai-listings-analytics/risk-engine.js');
const { countNonNewDuplicates } = await import('../../js/ai-listings-analytics/duplicate-engine.js');
const { countExecutiveBucket } = await import('../../js/ai-listings-analytics/executive-engine.js');
const {
  buildBarChartSvg,
  buildTopListHtml,
  buildChartFallbackHtml,
  CHART_FALLBACK_MESSAGE
} = await import('../../js/ai-listings-analytics/chart-builder.js');
const {
  buildAnalyticsDashboardHtml,
  buildAnalyticsKpiCardsHtml,
  buildAnalyticsSummaryHtml
} = await import('../../js/admin/ai-listings-analytics-admin.js');

const routerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/router.js');
const authPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/auth.js');
const handlerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/handler.js');
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260701_ai_listings_engine_v1.sql');
const adminHtmlPath = path.join(process.cwd(), 'admin/ai-listings.html');

const now = Date.parse('2026-06-07T12:00:00.000Z');

const vehicle = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2021 BMW 320i',
  price: 1250000,
  currency: 'TRY',
  source_type: 'manual',
  status: 'approved',
  created_at: '2026-06-07T10:00:00.000Z',
  updated_at: '2026-06-07T10:00:00.000Z',
  attributes: { brand: 'BMW', model: '320i', year: 2021 },
  latest_analysis: {
    ai_score: 85,
    risk_score: 25,
    quality_score: 88,
    decision_score: 85,
    tags: ['executive_label:Satın Alınabilir']
  }
};

const vehicleSimilar = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'vehicle',
  title: '2021 BMW 320i M Sport',
  price: 1240000,
  currency: 'TRY',
  source_type: 'ai_builder',
  status: 'draft',
  created_at: '2026-06-06T10:00:00.000Z',
  updated_at: '2026-06-06T10:00:00.000Z',
  attributes: { brand: 'BMW', model: '320i', year: 2021 },
  latest_analysis: {
    ai_score: 72,
    risk_score: 55,
    quality_score: 70,
    decision_score: 72,
    tags: ['executive_label:İncelenebilir']
  }
};

const housing = {
  id: '33333333-3333-3333-3333-333333333333',
  category: 'housing',
  title: 'Kadıköy Daire',
  price: 4500000,
  currency: 'TRY',
  source_type: 'csv',
  status: 'pending_review',
  created_at: '2026-05-20T10:00:00.000Z',
  updated_at: '2026-05-20T10:00:00.000Z',
  attributes: { brand: 'Audi', model: 'A3' },
  latest_analysis: {
    ai_score: 45,
    risk_score: 72,
    quality_score: 42,
    decision_score: 45,
    tags: ['executive_label:Riskli']
  }
};

const vacation = {
  id: '44444444-4444-4444-4444-444444444444',
  category: 'vacation',
  title: 'Bodrum Villa',
  price: 15000,
  currency: 'TRY',
  source_type: 'json',
  status: 'archived',
  created_at: '2026-06-01T10:00:00.000Z',
  updated_at: '2026-06-01T10:00:00.000Z',
  attributes: { brand: 'Mercedes', model: 'Vito' }
};

test.beforeEach(() => clearAnalyticsMemoCache());

test('bucketScoreValue maps score ranges', () => {
  assert.equal(bucketScoreValue(10, SCORE_BUCKETS), '0-20');
  assert.equal(bucketScoreValue(25, SCORE_BUCKETS), '20-40');
  assert.equal(bucketScoreValue(50, SCORE_BUCKETS), '40-60');
  assert.equal(bucketScoreValue(75, SCORE_BUCKETS), '60-80');
  assert.equal(bucketScoreValue(95, SCORE_BUCKETS), '80-100');
});

test('classifyRiskTier returns low medium high', () => {
  assert.equal(classifyRiskTier(20), 'low');
  assert.equal(classifyRiskTier(45), 'medium');
  assert.equal(classifyRiskTier(70), 'high');
});

test('classifyExecutiveBucket maps Turkish labels', () => {
  assert.equal(classifyExecutiveBucket('Satın Alınabilir'), 'buyable');
  assert.equal(classifyExecutiveBucket('İncelenebilir'), 'reviewable');
  assert.equal(classifyExecutiveBucket('Dikkatli İncelenmeli'), 'careful');
  assert.equal(classifyExecutiveBucket('Riskli'), 'risky');
  assert.equal(classifyExecutiveBucket('Önerilmez'), 'not_recommended');
});

test('classifyDuplicateBucket uses similarity thresholds', () => {
  assert.equal(classifyDuplicateBucket('new', 98), 'exact');
  assert.equal(classifyDuplicateBucket('new', 90), 'very_similar');
  assert.equal(classifyDuplicateBucket('new', 70), 'similar');
  assert.equal(classifyDuplicateBucket('new', 30), 'new');
});

test('computeScoreDistribution builds five buckets', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing]);
  const dist = computeScoreDistribution(records, 'decision_score');
  assert.equal(dist.length, 5);
  assert.equal(dist.reduce((sum, item) => sum + item.count, 0), 2);
});

test('computeQualityDistribution uses quality field', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing]);
  const dist = computeQualityDistribution(records);
  assert.equal(dist.length, 5);
});

test('computeRiskTierDistribution counts tiers', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing]);
  const dist = computeRiskTierDistribution(records);
  assert.ok(dist.some((item) => item.id === 'low'));
  assert.ok(dist.some((item) => item.id === 'high'));
});

test('computeExecutiveDistribution counts labels', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, vehicleSimilar, housing]);
  const dist = computeExecutiveDistribution(records);
  const total = dist.reduce((sum, item) => sum + item.count, 0);
  assert.equal(total, 3);
});

test('computeDuplicateDistribution includes four buckets', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, vehicleSimilar]);
  const dist = computeDuplicateDistribution(records);
  assert.equal(dist.length, 4);
});

test('computeSourceDistribution counts sources', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing, vacation]);
  const dist = computeSourceDistribution(records);
  assert.ok(dist.find((item) => item.id === 'manual')?.count >= 1);
  assert.ok(dist.find((item) => item.id === 'csv')?.count >= 1);
});

test('computeCategoryDistribution counts categories', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing, vacation]);
  const dist = computeCategoryDistribution(records);
  assert.equal(dist.find((item) => item.id === 'vehicle')?.count, 1);
  assert.equal(dist.find((item) => item.id === 'housing')?.count, 1);
  assert.equal(dist.find((item) => item.id === 'vacation')?.count, 1);
});

test('computeTopCounts returns top brands', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, vehicleSimilar, housing]);
  const top = computeTopCounts(records, 'brand', 10);
  assert.equal(top[0].label, 'BMW');
  assert.equal(top[0].count, 2);
});

test('computeTopCounts returns top models', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, vehicleSimilar]);
  const top = computeTopCounts(records, 'model', 10);
  assert.equal(top[0].label, '320i');
});

test('countRecordsToday counts today listings', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing]);
  assert.equal(countRecordsToday(records, now), 1);
});

test('countRecordsInDays counts window listings', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, vehicleSimilar, housing, vacation]);
  assert.equal(countRecordsInDays(records, 7, now), 3);
});

test('computeTrendSeries returns buckets for 7d', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, vehicleSimilar, housing]);
  const trend = computeTrendSeries(records, '7d', now);
  assert.equal(trend.window, '7d');
  assert.equal(trend.buckets.length, 7);
});

test('computeAllTrends returns 24h 7d 30d', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing]);
  const trends = computeAllTrends(records, now);
  assert.ok(trends['24h']);
  assert.ok(trends['7d']);
  assert.ok(trends['30d']);
});

test('computeAnalyticsKpi aggregates dashboard metrics', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, vehicleSimilar, housing]);
  const kpi = computeAnalyticsKpi(records, now);
  assert.equal(kpi.total, 3);
  assert.ok(kpi.average_ai !== null);
  assert.ok(kpi.average_quality !== null);
});

test('computeRepositoryAnalytics builds full snapshot', () => {
  const analytics = computeRepositoryAnalytics([vehicle, vehicleSimilar, housing], { nowMs: now });
  assert.ok(analytics.kpi);
  assert.ok(analytics.distributions);
  assert.ok(analytics.trends);
  assert.ok(analytics.top_brands);
  assert.ok(analytics.summary);
});

test('buildDeterministicExecutiveSummary is deterministic text', () => {
  const analytics = computeRepositoryAnalytics([vehicle, vehicleSimilar, housing], { nowMs: now });
  const summary = buildDeterministicExecutiveSummary(analytics, { windowDays: 7 });
  assert.match(summary, /ilan işlendi/);
  assert.match(summary, /Ortalama AI skoru/);
  assert.doesNotMatch(summary, /GPT|OpenAI|hallucin/i);
});

test('memoization returns cached analytics', () => {
  const listings = [vehicle, housing];
  const first = computeRepositoryAnalytics(listings, { nowMs: now });
  const second = computeRepositoryAnalytics(listings, { nowMs: now });
  assert.equal(first, second);
});

test('force option bypasses memo cache', () => {
  const listings = [vehicle];
  const first = computeRepositoryAnalytics(listings, { nowMs: now });
  const second = computeRepositoryAnalytics(listings, { nowMs: now, force: true });
  assert.notEqual(first, second);
});

test('buildAnalyticsCacheKey handles bulk listings', () => {
  const bulk = Array.from({ length: 600 }, (_, index) => ({
    id: `id-${index}`,
    updated_at: '2026-06-07T10:00:00.000Z'
  }));
  const key = buildAnalyticsCacheKey(bulk);
  assert.match(key, /^bulk:600:/);
});

test('runAnalyticsEngine adds derived fields', () => {
  const result = runAnalyticsEngine([vehicle, housing], { nowMs: now });
  assert.ok(Array.isArray(result.quality_distribution));
  assert.ok(typeof result.high_risk_count === 'number');
  assert.ok(typeof result.duplicate_count === 'number');
});

test('countHighRiskRecords counts high risk', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing]);
  assert.equal(countHighRiskRecords(records), 1);
});

test('countNonNewDuplicates counts duplicates', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, vehicleSimilar]);
  assert.ok(countNonNewDuplicates(records) >= 1);
});

test('countExecutiveBucket counts buyable', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing]);
  assert.equal(countExecutiveBucket(records, 'buyable'), 1);
});

test('buildBarChartSvg renders svg chart', () => {
  const html = buildBarChartSvg(
    [
      { label: '0-20', count: 1 },
      { label: '80-100', count: 3 }
    ],
    { title: 'Test' }
  );
  assert.match(html, /<svg/);
  assert.match(html, /Test/);
});

test('buildBarChartSvg shows fallback when no chart data', () => {
  const html = buildBarChartSvg([], { title: 'Boş' });
  assert.match(html, /Yeterli veri yok/);
  assert.equal(CHART_FALLBACK_MESSAGE, 'Yeterli veri yok');
  assert.match(buildChartFallbackHtml(), /Yeterli veri yok/);
});

test('buildTopListHtml renders ranked list', () => {
  const html = buildTopListHtml([{ label: 'BMW', count: 5 }], { title: 'Marka' });
  assert.match(html, /BMW/);
  assert.match(html, /Marka/);
});

test('buildAnalyticsKpiCardsHtml renders six kpi cards', () => {
  const listings = [vehicle, housing];
  const kpi = computeAnalyticsKpi(enrichRecordsWithDuplicateSimilarity(listings), now);
  const html = buildAnalyticsKpiCardsHtml(kpi, listings);
  assert.match(html, /Toplam İlan/);
  assert.match(html, /Duplicate Oranı/);
  assert.match(html, /Yüksek Risk/);
  assert.match(html, /data-kpi-counter/);
  assert.equal((html.match(/<article class="ai-listings-admin__kpi-card/g) ?? []).length, 6);
});

test('buildAnalyticsSummaryHtml renders summary block', () => {
  const html = buildAnalyticsSummaryHtml('Test summary text.');
  assert.match(html, /Yönetici Özeti/);
  assert.match(html, /Test summary text/);
});

test('buildAnalyticsDashboardHtml builds full dashboard', () => {
  const { html, analytics, chartBuilders } = buildAnalyticsDashboardHtml([vehicle, vehicleSimilar, housing]);
  assert.match(html, /Analitik/);
  assert.match(html, /data-lazy-chart/);
  assert.ok(Object.keys(chartBuilders).length >= 10);
  assert.ok(analytics.summary);
});

test('admin html includes Analytics tab', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /data-admin-view="analytics"/);
  assert.match(html, /Analitik/);
});

test('no endpoint URL changes in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.doesNotMatch(router, /\/analytics/i);
});

test('no auth changes', () => {
  const auth = fs.readFileSync(authPath, 'utf8');
  assert.match(auth, /x-ai-listings-secret/);
  const handler = fs.readFileSync(handlerPath, 'utf8');
  assert.doesNotMatch(handler, /\/analytics/i);
});

test('no DB schema changes', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /ai_listing_analytics/i);
});

test('enrichRecordsWithDuplicateSimilarity adds similarity', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, vehicleSimilar]);
  const withSim = records.find((record) => record.duplicate_similarity !== undefined);
  assert.ok(withSim);
});

test('computeRepositoryAnalytics handles empty listings', () => {
  const analytics = computeRepositoryAnalytics([], { nowMs: now });
  assert.equal(analytics.kpi.total, 0);
  assert.match(String(analytics.summary), /0 ilan/);
});

test('large listing set completes under performance target', () => {
  const bulk = Array.from({ length: 200 }, (_, index) => ({
    ...vehicle,
    id: `bulk-${index}`,
    title: `Listing ${index}`,
    attributes: { brand: index % 2 === 0 ? 'BMW' : 'Audi', model: `M${index % 10}` },
    created_at: new Date(now - index * 3600000).toISOString()
  }));
  const start = performance.now();
  const analytics = computeRepositoryAnalytics(bulk, { nowMs: now, force: true });
  const elapsed = performance.now() - start;
  assert.equal(analytics.kpi.total, 200);
  assert.ok(elapsed < 15000, `analytics took ${elapsed}ms`);
});

test('duplicate distribution detects similar pair', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, vehicleSimilar]);
  const dist = computeDuplicateDistribution(records);
  const nonNew = dist.filter((item) => item.id !== 'new').reduce((sum, item) => sum + item.count, 0);
  assert.ok(nonNew >= 1);
});

test('source distribution includes partner and future partner buckets', () => {
  const partner = { ...vehicle, id: 'p1', source_type: 'partner_api' };
  const future = { ...vehicle, id: 'p2', source_type: 'future_partner' };
  const records = enrichRecordsWithDuplicateSimilarity([partner, future]);
  const dist = computeSourceDistribution(records);
  assert.equal(dist.find((item) => item.id === 'partner_api')?.count, 1);
  assert.equal(dist.find((item) => item.id === 'future_partner')?.count, 1);
});

test('trend 24h window counts recent records', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing]);
  const trend = computeTrendSeries(records, '24h', now);
  assert.equal(trend.total, 1);
});

test('executive summary mentions top brand when available', () => {
  const analytics = computeRepositoryAnalytics([vehicle, vehicleSimilar], { nowMs: now });
  assert.match(String(analytics.summary), /BMW/);
});

test('risk engine high risk aligns with kpi', () => {
  const records = enrichRecordsWithDuplicateSimilarity([vehicle, housing]);
  const kpi = computeAnalyticsKpi(records, now);
  assert.equal(kpi.high_risk, countHighRiskRecords(records));
});
