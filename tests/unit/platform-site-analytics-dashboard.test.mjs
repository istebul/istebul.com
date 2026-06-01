import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSiteAnalyticsMetrics,
  buildPagePathRows,
  buildPagePathDetail,
  buildTopEventRows,
  renderPagePathDetailPanel,
  exportPlatformAnalyticsCsv,
  renderPlatformAnalyticsEmptyGuide,
  filterRowsByPreset
} from '../../js/admin/platform-site-analytics-dashboard.js';

const sampleRows = [
  {
    event_name: 'homepage_view',
    session_id: 's1',
    created_at: new Date().toISOString(),
    properties: { category: 'home' },
    attribution: { utm_source: 'google' }
  },
  {
    event_name: 'category_card_click',
    session_id: 's1',
    created_at: new Date().toISOString(),
    properties: { category: 'auto' }
  },
  {
    event_name: 'auto_page_view',
    session_id: 's2',
    created_at: new Date().toISOString(),
    page_path: '/auto/',
    properties: { category: 'auto' }
  },
  {
    event_name: 'auto_form_started',
    session_id: 's2',
    created_at: new Date().toISOString(),
    properties: { category: 'auto' }
  },
  {
    event_name: 'auto_results_rendered',
    session_id: 's2',
    created_at: new Date().toISOString(),
    properties: { category: 'auto' }
  },
  {
    event_name: 'auto_lead_submit',
    session_id: 's2',
    created_at: new Date().toISOString(),
    properties: { category: 'auto' }
  }
];

test('buildSiteAnalyticsMetrics aggregates site funnel KPIs', () => {
  const metrics = buildSiteAnalyticsMetrics(sampleRows);
  assert.ok(metrics.homepageVisits >= 1);
  assert.ok(metrics.categoryClicks >= 1);
  assert.ok(metrics.analysisStarted >= 1);
  assert.ok(metrics.resultsViewed >= 1);
  assert.ok(metrics.leads >= 1);
  const autoRow = metrics.categoryRows.find((r) => r.id === 'auto');
  assert.ok(autoRow);
  assert.ok(autoRow.analysis >= 1);
});

test('buildPagePathDetail filters events for one path', () => {
  const detail = buildPagePathDetail(sampleRows, '/auto/');
  assert.equal(detail.path, '/auto/');
  assert.ok(detail.totalEvents >= 1);
  assert.ok(detail.eventRows.length >= 1);
  assert.ok(detail.recent.length >= 1);
});

test('renderPagePathDetailPanel includes path and event table', () => {
  const detail = buildPagePathDetail(sampleRows, '/auto/');
  const html = renderPagePathDetailPanel(detail);
  assert.match(html, /\/auto\//);
  assert.match(html, /platform-path-detail-panel/);
  assert.match(html, /auto_page_view/);
});

test('buildPagePathRows groups by path with sessions', () => {
  const rows = buildPagePathRows(sampleRows);
  assert.ok(rows.length >= 1);
  const autoPath = rows.find((r) => r.path.includes('/auto'));
  assert.ok(autoPath);
  assert.ok(autoPath.sessions >= 1);
});

test('buildTopEventRows ranks events by count', () => {
  const rows = buildTopEventRows(sampleRows);
  assert.ok(rows.length >= 1);
  assert.ok(rows[0].count >= rows[rows.length - 1].count);
});

test('buildSiteAnalyticsMetrics includes page and event tables', () => {
  const metrics = buildSiteAnalyticsMetrics(sampleRows);
  assert.ok(Array.isArray(metrics.pagePathRows));
  assert.ok(Array.isArray(metrics.topEventRows));
  assert.ok(metrics.pagePathRows.length >= 1);
});

test('renderPlatformAnalyticsEmptyGuide includes deploy checklist', () => {
  const html = renderPlatformAnalyticsEmptyGuide({ rawRowCount: 0 });
  assert.match(html, /analytics-ingest/);
  assert.match(html, /çerez onayı/i);
});

test('exportPlatformAnalyticsCsv returns empty when no rows', () => {
  const metrics = buildSiteAnalyticsMetrics([]);
  assert.equal(exportPlatformAnalyticsCsv(metrics, 'page_paths').error, 'empty');
});

test('filterRowsByPreset keeps today only', () => {
  const old = {
    event_name: 'homepage_view',
    session_id: 'old',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  };
  const filtered = filterRowsByPreset([...sampleRows, old], 'today');
  assert.equal(filtered.length, sampleRows.length);
});
