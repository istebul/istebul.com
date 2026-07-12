import {
  buildDemoDashboardDataset,
  enrichOrdersForIntelligence,
  loadRestaurantDashboard,
  loadRestaurantDashboardLive
} from '../../dashboard/ai-dashboard-service.js';
import { getRestaurantOrderData } from '../../data-service.js';
import { analyzePeakHours } from '../../intelligence/peak-hours.js';
import { analyzeCustomers } from '../../growth/customer-analyzer.js';
import { escapeHtml, formatCurrencyTry } from '../shared/format.js';
import { renderMetricGrid } from '../shared/cards.js';
import { renderPageHeader, renderPanelSection } from '../shared/shell.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<{ metrics: import('../shared/cards.js').MetricCard[], peakBars: { label: string, value: number }[], topProducts: string[] }>}
 */
export async function loadAnalyticsModuleData(context) {
  const ordersResult = await getRestaurantOrderData({
    restaurantId: context.restaurantId,
    slug: context.slug
  });

  const orders = enrichOrdersForIntelligence(
    ordersResult.data?.orders || [],
    context.restaurantId
  );

  const report =
    context.mode === 'live'
      ? await loadRestaurantDashboardLive({ restaurantId: context.restaurantId, now: new Date() })
      : await loadRestaurantDashboard({
          restaurantId: context.restaurantId,
          ...buildDemoDashboardDataset(context.restaurantId),
          now: new Date()
        });

  const peak = analyzePeakHours(orders, { restaurantId: context.restaurantId, topCount: 6 });
  const customerAnalysis = analyzeCustomers([], orders, {
    restaurantId: context.restaurantId
  });

  const peakBars = peak.busiestHours.map((item) => ({
    label: `${String(item.hour).padStart(2, '0')}:00`,
    value: item.orderCount
  }));

  const topProducts = (report.sales.topProducts || []).map(
    (product) => `${product.name} (${product.quantity || 0})`
  );

  return {
    metrics: [
      {
        id: 'revenue',
        label: 'Günlük ciro',
        value: formatCurrencyTry(report.sales.dailyRevenue)
      },
      {
        id: 'orders',
        label: 'Saatlik siparişler',
        value: String(report.sales.orderCount)
      },
      {
        id: 'basket',
        label: 'Ortalama sepet',
        value: formatCurrencyTry(report.sales.averageBasket)
      },
      {
        id: 'customers',
        label: 'Müşteri analizi',
        value: String(customerAnalysis.totalCustomers),
        hint: `${customerAnalysis.vipCustomers.length} VIP`
      }
    ],
    peakBars,
    topProducts
  };
}

/**
 * @param {{ label: string, value: number }[]} bars
 * @returns {string}
 */
function renderPeakChart(bars) {
  if (!bars.length) return '<p class="gai-admin-empty">Yoğunluk verisi yok.</p>';
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  return `
    <div class="gai-admin-chart">
      ${bars
        .map((bar) => {
          const height = Math.round((bar.value / max) * 100);
          return `
            <div class="gai-admin-chart__item">
              <div class="gai-admin-chart__bar" style="height:${height}%"></div>
              <span>${escapeHtml(bar.label)}</span>
            </div>
          `.trim();
        })
        .join('')}
    </div>
  `.trim();
}

/**
 * @param {AdminPanelContext} context
 * @param {Awaited<ReturnType<typeof loadAnalyticsModuleData>>} data
 * @returns {string}
 */
export function renderAnalyticsPage(context, data) {
  const products = data.topProducts.length
    ? `<ul class="gai-admin-list">${data.topProducts.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="gai-admin-empty">Ürün verisi yok.</p>';

  return `
    ${renderPageHeader({
      title: 'Analitik',
      subtitle: 'Satış ve müşteri içgörüleri',
      demo: context.mode === 'demo'
    })}
    ${renderMetricGrid(data.metrics)}
    ${renderPanelSection(`<h2 class="gai-section-title">En yoğun saatler</h2>${renderPeakChart(data.peakBars)}`)}
    ${renderPanelSection(`<h2 class="gai-section-title">En çok satan ürünler</h2>${products}`)}
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountAnalyticsPage(root, context) {
  root.innerHTML = '<p class="gai-admin-empty">Analitik yükleniyor…</p>';
  const data = await loadAnalyticsModuleData(context);
  root.innerHTML = renderAnalyticsPage(context, data);
}
