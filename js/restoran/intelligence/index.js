/**
 * GarsonAI restaurant intelligence orchestrator.
 */
import { analyzeSales } from './sales-analyzer.js';
import { analyzePeakHours } from './peak-hours.js';
import { generateMenuInsights } from './menu-insights.js';
import { analyzePerformance } from './performance-engine.js';
import { generateRestaurantAdvice } from './ai-advisor.js';
import { filterByRestaurantId, flattenRestaurantProducts } from './tenant-utils.js';

export class RestaurantIntelligenceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RestaurantIntelligenceError';
  }
}

/**
 * @typedef {Object} RestaurantPerformanceReport
 * @property {string} restaurantId
 * @property {import('./sales-analyzer.js').SalesAnalysis} sales
 * @property {import('./peak-hours.js').PeakHoursAnalysis} peakHours
 * @property {import('./menu-insights.js').MenuInsights} menuInsights
 * @property {import('./performance-engine.js').PerformanceAnalysis} performance
 * @property {string[]} advice
 */

/**
 * @param {{ restaurantId?: string, orders?: unknown[], products?: unknown[] }} input
 * @returns {RestaurantPerformanceReport}
 */
export function analyzeRestaurantPerformance(input = {}) {
  const restaurantId = String(input.restaurantId || '').trim();
  if (!restaurantId) {
    throw new RestaurantIntelligenceError('Restoran kimliği gerekli.');
  }

  const orders = filterByRestaurantId(input.orders || [], restaurantId);
  const products = flattenRestaurantProducts(input.products || [], restaurantId);

  const sales = analyzeSales(orders, { restaurantId });
  const peakHours = analyzePeakHours(orders, { restaurantId });
  const menuInsights = generateMenuInsights(products, orders, { restaurantId });
  const performance = analyzePerformance(orders, { restaurantId });
  const advice = generateRestaurantAdvice({
    sales,
    peakHours,
    menuInsights,
    performance
  });

  return {
    restaurantId,
    sales,
    peakHours,
    menuInsights,
    performance,
    advice
  };
}

export { analyzeSales } from './sales-analyzer.js';
export { analyzePeakHours } from './peak-hours.js';
export { generateMenuInsights } from './menu-insights.js';
export { analyzePerformance, calculatePerformanceScore } from './performance-engine.js';
export { generateRestaurantAdvice } from './ai-advisor.js';
