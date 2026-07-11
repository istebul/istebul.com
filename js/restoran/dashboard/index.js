/**
 * GarsonAI dashboard module exports.
 */
export {
  RestaurantDashboardError,
  loadRestaurantDashboard,
  loadRestaurantDashboardLive,
  loadProductionDashboardDataset,
  buildDemoDashboardDataset,
  enrichOrdersForIntelligence,
  flattenProductsFromMenu,
  resolveDailySalesMetrics,
  resolveKitchenStatusLabel
} from './ai-dashboard-service.js';

export {
  formatCurrencyTry,
  renderSalesInsight,
  renderKitchenInsight,
  renderCustomerInsight,
  renderAIAdvice,
  renderAdminAiStatCardsHtml,
  renderAiDashboardPageHtml
} from './restaurant-ai-widgets.js';
