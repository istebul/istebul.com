import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const adminHtmlPath = path.join(process.cwd(), 'admin/ai-listings.html');
const adminJsPath = path.join(process.cwd(), 'js/admin/ai-listings-admin.js');
const cssPath = path.join(process.cwd(), 'css/admin-ai-listings.css');
const routerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/router.js');
const authPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/auth.js');
const handlerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/handler.js');
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260701_ai_listings_engine_v1.sql');

const {
  normalizeAdminDataset,
  formatAdminCountValue,
  formatAdminAverageValue,
  formatDuplicateRateValue,
  deriveSharedAdminCounts,
  isAdminDatasetEmpty
} = await import('../../js/admin/ai-listings-dataset.js');

const { buildKpiCardsHtml } = await import('../../js/admin/ai-listings-admin-core.js');

const {
  buildRepositoryDashboardHtml,
  buildRepositoryKpiCardsHtml
} = await import('../../js/admin/ai-listings-repository-admin.js');

const {
  buildAnalyticsDashboardHtml,
  buildAnalyticsKpiCardsHtml
} = await import('../../js/admin/ai-listings-analytics-admin.js');

const {
  buildBarChartSvg,
  buildTopListHtml,
  buildChartFallbackHtml,
  hasChartData,
  CHART_FALLBACK_MESSAGE
} = await import('../../js/ai-listings-analytics/chart-builder.js');

const { runRepositoryQuery } = await import('../../js/ai-listings-repository/index.js');
const { runAnalyticsEngine } = await import('../../js/ai-listings-analytics/index.js');

const vehicle = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2021 BMW 320i',
  status: 'approved',
  source_type: 'manual',
  created_at: '2026-06-07T10:00:00.000Z',
  updated_at: '2026-06-07T10:00:00.000Z',
  attributes: { brand: 'BMW', model: '320i' },
  latest_analysis: {
    ai_score: 85,
    risk_score: 25,
    quality_score: 88,
    decision_score: 85,
    created_at: '2026-06-07T10:00:00.000Z',
    tags: ['executive_label:Satın Alınabilir']
  }
};

const housing = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'housing',
  title: 'Kadıköy Daire',
  status: 'pending_review',
  source_type: 'csv',
  created_at: '2026-06-06T10:00:00.000Z',
  updated_at: '2026-06-06T10:00:00.000Z',
  attributes: { brand: 'Audi', model: 'A3' },
  latest_analysis: {
    ai_score: 45,
    risk_score: 72,
    quality_score: 42,
    decision_score: 45,
    created_at: '2026-06-06T10:00:00.000Z',
    tags: ['executive_label:Riskli']
  }
};

const sampleListings = [vehicle, housing];

function countKpiCards(html) {
  return (html.match(/<article class="ai-listings-admin__kpi-card/g) ?? []).length;
}

function countDataAdminPanels(html) {
  return (html.match(/data-admin-panel="/g) ?? []).length;
}

test('admin html defines isolated view panels for each tab', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.equal(countDataAdminPanels(html), 4);
  assert.match(html, /data-admin-panel="decision"/);
  assert.match(html, /data-admin-panel="repository"/);
  assert.match(html, /data-admin-panel="analytics"/);
  assert.match(html, /data-admin-panel="collector"/);
});

test('decision panel is visible by default', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /id="ai-listings-decision-panel"[^>]*data-admin-panel="decision"/);
  assert.doesNotMatch(html, /id="ai-listings-decision-panel"[^>]*hidden/);
});

test('repository panel is hidden by default', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /id="ai-listings-repository-panel"[^>]*hidden/);
});

test('analytics panel is hidden by default', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /id="ai-listings-analytics-panel"[^>]*hidden/);
});

test('collector panel is hidden by default', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /id="ai-listings-collector-panel"[^>]*hidden/);
});

test('decision tab content uses dedicated detail host', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /id="ai-listings-detail"/);
  assert.match(html, /id="ai-listings-sidebar"/);
});

test('repository tab uses dedicated content host without sidebar coupling', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /id="ai-listings-repository-content"/);
});

test('analytics tab uses dedicated content host', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /id="ai-listings-analytics-content"/);
});

test('collector tab uses dedicated content host', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, /id="ai-listings-collector-content"/);
});

test('decision KPI row renders exactly four cards', () => {
  const html = buildKpiCardsHtml(
    { total: 2, analyzedToday: 1, pendingReview: 1, highRisk: 1, trends: {} },
    sampleListings
  );
  assert.equal(countKpiCards(html), 4);
});

test('repository KPI row renders exactly six cards', () => {
  const { query } = buildRepositoryDashboardHtml(sampleListings);
  const html = buildRepositoryKpiCardsHtml(query.stats, sampleListings);
  assert.equal(countKpiCards(html), 6);
});

test('analytics KPI row renders exactly six cards', () => {
  const { analytics } = buildAnalyticsDashboardHtml(sampleListings);
  const html = buildAnalyticsKpiCardsHtml(analytics.kpi, sampleListings);
  assert.equal(countKpiCards(html), 6);
});

test('repository KPI does not include average risk card', () => {
  const { query } = buildRepositoryDashboardHtml(sampleListings);
  const html = buildRepositoryKpiCardsHtml(query.stats, sampleListings);
  assert.doesNotMatch(html, /Ortalama Risk/);
});

test('analytics KPI uses Duplicate Oranı label', () => {
  const { analytics } = buildAnalyticsDashboardHtml(sampleListings);
  const html = buildAnalyticsKpiCardsHtml(analytics.kpi, sampleListings);
  assert.match(html, /Duplicate Oranı/);
  assert.doesNotMatch(html, /ai-listings-admin__kpi-label">Duplicate<\/span>/);
});

test('repository dashboard omits duplicate summary KPI strip', () => {
  const { html } = buildRepositoryDashboardHtml(sampleListings);
  assert.doesNotMatch(html, /ai-listings-admin__repo-summary/);
  assert.doesNotMatch(html, /Son 24 saat/);
});

test('repository total count matches normalized listing count', () => {
  const { query } = buildRepositoryDashboardHtml(sampleListings);
  const { total } = deriveSharedAdminCounts(sampleListings);
  assert.equal(query.stats.total, total);
  assert.equal(query.stats.total, 2);
});

test('analytics total count matches normalized listing count', () => {
  const analytics = runAnalyticsEngine(sampleListings);
  const { total } = deriveSharedAdminCounts(sampleListings);
  assert.equal(analytics.kpi.total, total);
});

test('empty dataset shows dash in decision KPI cards', () => {
  const html = buildKpiCardsHtml(
    { total: 0, analyzedToday: 0, pendingReview: 0, highRisk: 0, trends: {} },
    []
  );
  assert.match(html, /data-kpi-value="—"/);
  assert.doesNotMatch(html, /data-kpi-value="0"/);
});

test('empty dataset shows dash in repository KPI cards', () => {
  const { query } = buildRepositoryDashboardHtml([]);
  const html = buildRepositoryKpiCardsHtml(query.stats, []);
  assert.match(html, /data-kpi-value="—"/);
});

test('empty dataset shows dash in analytics KPI cards', () => {
  const { analytics } = buildAnalyticsDashboardHtml([]);
  const html = buildAnalyticsKpiCardsHtml(analytics.kpi, []);
  assert.match(html, /data-kpi-value="—"/);
});

test('normalizeAdminDataset filters invalid entries', () => {
  const dataset = normalizeAdminDataset([vehicle, null, undefined, 'bad']);
  assert.equal(dataset.length, 1);
});

test('formatDuplicateRateValue returns percentage for populated dataset', () => {
  assert.match(formatDuplicateRateValue(sampleListings, 1), /%$/);
});

test('formatDuplicateRateValue returns dash for empty dataset', () => {
  assert.equal(formatDuplicateRateValue([], 0), '—');
});

test('chart fallback message is Yeterli veri yok', () => {
  assert.equal(CHART_FALLBACK_MESSAGE, 'Yeterli veri yok');
  const html = buildChartFallbackHtml();
  assert.match(html, /Yeterli veri yok/);
});

test('bar chart shows fallback when data is empty', () => {
  const html = buildBarChartSvg([], { title: 'Test' });
  assert.match(html, /Yeterli veri yok/);
  assert.doesNotMatch(html, /<svg/);
});

test('bar chart renders svg when data exists', () => {
  const html = buildBarChartSvg([{ label: '0-20', count: 2 }], { title: 'AI Score' });
  assert.match(html, /<svg/);
  assert.doesNotMatch(html, /Yeterli veri yok/);
});

test('hasChartData requires positive counts', () => {
  assert.equal(hasChartData([{ label: 'a', count: 0 }]), false);
  assert.equal(hasChartData([{ label: 'a', count: 1 }]), true);
});

test('top list shows fallback when no ranked data', () => {
  const html = buildTopListHtml([], { title: 'Top 10 Marka' });
  assert.match(html, /Yeterli veri yok/);
});

test('analytics dashboard includes all required chart panels', () => {
  const { html } = buildAnalyticsDashboardHtml(sampleListings);
  for (const title of [
    'AI Score Dağılımı',
    'Risk Dağılımı',
    'Kalite Dağılımı',
    'Executive Dağılımı',
    'Duplicate Dağılımı',
    'Kaynak Dağılımı',
    'Kategori Dağılımı',
    'Top 10 Marka',
    'Top 10 Model',
    'Son 24 Saat',
    'Son 7 Gün',
    'Son 30 Gün'
  ]) {
    assert.match(html, new RegExp(title));
  }
});

test('workspace full width layout class exists for non-decision tabs', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /ai-listings-admin__workspace--full/);
  assert.match(css, /ai-listings-admin__workspace--decision/);
});

test('admin js hides sidebar outside decision view', () => {
  const js = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(js, /next !== 'decision'/);
  assert.match(js, /ai-listings-repository-content/);
  assert.match(js, /ai-listings-analytics-content/);
});

test('admin js only renders listing list on decision tab', () => {
  const js = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(js, /activeAdminView !== 'decision'/);
});

test('no endpoint URL changes in router', () => {
  const router = fs.readFileSync(routerPath, 'utf8');
  assert.match(router, /resource: 'listings'/);
  assert.doesNotMatch(router, /\/repository|\/analytics|\/collector/i);
});

test('no auth header changes', () => {
  const auth = fs.readFileSync(authPath, 'utf8');
  assert.match(auth, /x-ai-listings-secret/);
});

test('no DB schema migration changes for dashboard tabs', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /ai_listing_repository|ai_listing_analytics/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_listings/i);
});

test('handler does not add repository or analytics routes', () => {
  const handler = fs.readFileSync(handlerPath, 'utf8');
  assert.doesNotMatch(handler, /\/repository|\/analytics|\/collector/i);
});

test('isAdminDatasetEmpty detects empty arrays', () => {
  assert.equal(isAdminDatasetEmpty([]), true);
  assert.equal(isAdminDatasetEmpty(sampleListings), false);
});

test('formatAdminAverageValue avoids zero placeholder on empty dataset', () => {
  assert.equal(formatAdminAverageValue([], 0), '—');
  assert.equal(formatAdminAverageValue(sampleListings, 82), 82);
});

test('formatAdminCountValue avoids zero placeholder on empty dataset', () => {
  assert.equal(formatAdminCountValue([], 0), '—');
  assert.equal(formatAdminCountValue(sampleListings, 4), 4);
});

test('repository and analytics engines share same total for identical input', () => {
  const repo = runRepositoryQuery(sampleListings);
  const analytics = runAnalyticsEngine(sampleListings);
  assert.equal(repo.stats.total, analytics.kpi.total);
});
