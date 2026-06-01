import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSiteAnalyticsMetrics,
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

test('filterRowsByPreset keeps today only', () => {
  const old = {
    event_name: 'homepage_view',
    session_id: 'old',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  };
  const filtered = filterRowsByPreset([...sampleRows, old], 'today');
  assert.equal(filtered.length, sampleRows.length);
});
