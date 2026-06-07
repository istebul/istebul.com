/**
 * AI Listings Analytics — admin UI builders (Sprint-12).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { runAnalyticsEngine } from '../ai-listings-analytics/index.js';
import { buildBarChartSvg, buildTrendChartSvg, buildTopListHtml } from '../ai-listings-analytics/chart-builder.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function safeRenderText(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {Record<string, unknown>} kpi
 * @returns {string}
 */
export function buildAnalyticsKpiCardsHtml(kpi) {
  const cards = [
    { key: 'total', label: 'Toplam İlan', value: kpi.total, hint: 'tüm kayıtlar' },
    { key: 'today', label: 'Bugün', value: kpi.today, hint: 'bugün eklenen' },
    { key: 'last_7_days', label: 'Son 7 Gün', value: kpi.last_7_days, hint: '7 gün' },
    { key: 'last_30_days', label: 'Son 30 Gün', value: kpi.last_30_days, hint: '30 gün' },
    { key: 'duplicate', label: 'Duplicate', value: kpi.duplicate, hint: 'mükerrer' },
    { key: 'high_risk', label: 'Yüksek Risk', value: kpi.high_risk, hint: 'risk ≥ 61' }
  ];

  return cards
    .map(
      (card) => `
    <article class="ai-listings-admin__kpi-card ai-listings-admin__kpi-card--analytics-${card.key}" data-kpi-value="${safeRenderText(card.value)}">
      <div class="ai-listings-admin__kpi-body">
        <span class="ai-listings-admin__kpi-label">${safeRenderText(card.label)}</span>
        <span class="ai-listings-admin__kpi-value" data-kpi-counter="0">0</span>
        <span class="ai-listings-admin__kpi-hint">${safeRenderText(card.hint)}</span>
      </div>
    </article>`
    )
    .join('');
}

/**
 * @param {string} summary
 * @returns {string}
 */
export function buildAnalyticsSummaryHtml(summary) {
  return `
    <section class="ai-analytics-summary" aria-label="Executive summary">
      <h3>Executive Summary</h3>
      <p class="ai-analytics-summary__text">${safeRenderText(summary)}</p>
    </section>`;
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @returns {{ html: string, analytics: ReturnType<typeof runAnalyticsEngine>, chartBuilders: Record<string, () => string> }}
 */
export function buildAnalyticsDashboardHtml(listings) {
  const analytics = runAnalyticsEngine(listings);
  const distributions = /** @type {Record<string, Array<{ label: string, count: number }>>} */ (
    analytics.distributions ?? {}
  );
  const trends = /** @type {Record<string, { buckets: Array<{ label: string, count: number }> }>} */ (
    analytics.trends ?? {}
  );

  const chartBuilders = {
    'ai-score': () => buildBarChartSvg(distributions.ai_score ?? [], { title: 'AI Score Dağılımı', id: 'ai-score' }),
    quality: () => buildBarChartSvg(distributions.quality ?? [], { title: 'Kalite Dağılımı', id: 'quality' }),
    risk: () => buildBarChartSvg(distributions.risk ?? [], { title: 'Risk Dağılımı', id: 'risk' }),
    executive: () => buildBarChartSvg(distributions.executive ?? [], { title: 'Executive Dağılımı', id: 'executive' }),
    duplicate: () => buildBarChartSvg(distributions.duplicate ?? [], { title: 'Duplicate Analizi', id: 'duplicate' }),
    source: () => buildBarChartSvg(distributions.source ?? [], { title: 'Kaynak Analizi', id: 'source' }),
    category: () => buildBarChartSvg(distributions.category ?? [], { title: 'Kategori Analizi', id: 'category' }),
    'trend-24h': () => buildTrendChartSvg(trends['24h']?.buckets ?? [], { title: 'Son 24 Saat', id: 'trend-24h' }),
    'trend-7d': () => buildTrendChartSvg(trends['7d']?.buckets ?? [], { title: 'Son 7 Gün', id: 'trend-7d' }),
    'trend-30d': () => buildTrendChartSvg(trends['30d']?.buckets ?? [], { title: 'Son 30 Gün', id: 'trend-30d' })
  };

  const chartPanel = (id, title) => `
    <div class="ai-analytics-panel">
      <h4>${safeRenderText(title)}</h4>
      <div class="ai-analytics-chart-lazy" data-lazy-chart="${safeRenderText(id)}"></div>
    </div>`;

  const html = `
    <div class="ai-analytics-dashboard">
      <header class="ai-analytics-dashboard__head">
        <h2>Analytics</h2>
        <p class="ai-listings-admin__muted">Mevcut ilan ve analiz verilerinden türetilmiş deterministik rapor</p>
      </header>
      ${buildAnalyticsSummaryHtml(String(analytics.summary ?? ''))}
      <div class="ai-analytics-dashboard__grid">
        ${chartPanel('ai-score', 'AI Score Dağılımı')}
        ${chartPanel('risk', 'Risk Dağılımı')}
        ${chartPanel('quality', 'Kalite Dağılımı')}
        ${chartPanel('executive', 'Executive Dağılımı')}
        ${chartPanel('duplicate', 'Duplicate Analizi')}
        ${chartPanel('source', 'Kaynak Analizi')}
        ${chartPanel('category', 'Kategori Analizi')}
      </div>
      <div class="ai-analytics-dashboard__lists">
        ${buildTopListHtml(/** @type {Array<{ label: string, count: number }>} */ (analytics.top_brands ?? []), { title: 'Top 10 Marka', limit: 10 })}
        ${buildTopListHtml(/** @type {Array<{ label: string, count: number }>} */ (analytics.top_models ?? []), { title: 'Top 10 Model', limit: 10 })}
      </div>
      <div class="ai-analytics-dashboard__trends">
        <h3>Trend</h3>
        <div class="ai-analytics-dashboard__trend-grid">
          ${chartPanel('trend-24h', 'Son 24 Saat')}
          ${chartPanel('trend-7d', 'Son 7 Gün')}
          ${chartPanel('trend-30d', 'Son 30 Gün')}
        </div>
      </div>
    </div>`;

  return { html, analytics, chartBuilders };
}
