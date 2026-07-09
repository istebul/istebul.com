/**
 * GarsonAI Zeka Merkezi page bootstrap.
 */
import {
  GARSON_ADMIN_LOGIN_PATH,
  GARSON_ADMIN_PANEL_PATH
} from '../admin-portal.js';
import { resolveGarsonPanelAccess } from '../auth-service.js';
import {
  buildDemoDashboardDataset,
  enrichOrdersForIntelligence,
  flattenProductsFromMenu,
  loadRestaurantDashboard
} from './ai-dashboard-service.js';
import { renderAiDashboardPageHtml } from './restaurant-ai-widgets.js';

export const GARSON_AI_DASHBOARD_PATH = '/garson/zeka/';

async function bootAiDashboardPage() {
  const access = await resolveGarsonPanelAccess();

  if (access.mode === 'none') {
    window.location.assign(GARSON_ADMIN_LOGIN_PATH);
    return;
  }

  const context = access.context;
  const restaurantId = context?.restaurantId || '';
  const restaurantName = context?.restaurantName || 'Demo Cafe';

  const title = document.getElementById('garson-ai-dashboard-title');
  const subtitle = document.getElementById('garson-ai-dashboard-subtitle');
  const content = document.getElementById('garson-ai-dashboard-content');
  const badge = document.getElementById('garson-ai-dashboard-demo-badge');

  if (title) title.textContent = 'GarsonAI Zeka Merkezi';
  if (subtitle) subtitle.textContent = `${restaurantName} · ${restaurantId}`;
  if (badge) badge.hidden = access.mode === 'live';

  let orders = [];
  let products = [];
  let customers = [];

  if (access.mode === 'live' && restaurantId) {
    const { loadRestaurantManagementData } = await import('../data-service.js');
    const data = await loadRestaurantManagementData({
      restaurantId,
      slug: context?.slug
    });
    orders = enrichOrdersForIntelligence(data.orders.data.orders || [], restaurantId);
    products = flattenProductsFromMenu(data.menu.data);
  } else {
    const demo = buildDemoDashboardDataset(restaurantId);
    orders = demo.orders;
    products = demo.products;
    customers = demo.customers;
  }

  const dashboard = loadRestaurantDashboard({
    restaurantId,
    orders,
    products,
    customers
  });

  if (content) {
    content.innerHTML = renderAiDashboardPageHtml(dashboard);
  }

  document.body.classList.add('ib-ready');
}

function boot() {
  if (document.getElementById('garson-ai-dashboard-root')) {
    bootAiDashboardPage();
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
