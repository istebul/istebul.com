/**
 * GarsonAI restaurant growth intelligence orchestrator.
 */
import { analyzeCustomers } from './customer-analyzer.js';
import { generateCampaignSuggestions } from './campaign-engine.js';
import { predictRevenue } from './revenue-predictor.js';
import { generateSmartDiscounts } from './smart-discount.js';

export class RestaurantGrowthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RestaurantGrowthError';
  }
}

/**
 * @typedef {Object} RestaurantGrowthReport
 * @property {string} restaurantId
 * @property {import('./customer-analyzer.js').CustomerAnalysis} customers
 * @property {import('./campaign-engine.js').CampaignSuggestion[]} campaigns
 * @property {import('./revenue-predictor.js').RevenuePrediction} revenue
 * @property {string[]} discounts
 */

/**
 * @param {{ restaurantId?: string, customers?: unknown[], orders?: unknown[], now?: Date, peakHours?: { quietHours?: Array<{ hour: number, orderCount?: number, revenue?: number }> } }} input
 * @returns {RestaurantGrowthReport}
 */
export function analyzeRestaurantGrowth(input = {}) {
  const restaurantId = String(input.restaurantId || '').trim();
  if (!restaurantId) {
    throw new RestaurantGrowthError('Restoran kimliği gerekli.');
  }

  const now = input.now instanceof Date ? input.now : new Date();
  const customers = analyzeCustomers(input.customers || [], input.orders || [], {
    restaurantId,
    now
  });
  const revenue = predictRevenue(input.orders || [], { restaurantId, now });
  const campaigns = generateCampaignSuggestions({
    customers,
    revenue,
    peakHours: input.peakHours
  });
  const discounts = generateSmartDiscounts({
    customers,
    revenue,
    peakHours: input.peakHours,
    orders: input.orders,
    now
  });

  return {
    restaurantId,
    customers,
    campaigns,
    revenue,
    discounts
  };
}

export { analyzeCustomers } from './customer-analyzer.js';
export { generateCampaignSuggestions } from './campaign-engine.js';
export { predictRevenue, resolveRevenueTrend, resolveRevenueRisk } from './revenue-predictor.js';
export { generateSmartDiscounts } from './smart-discount.js';
export { generateCustomerMessage, formatCustomerGreeting } from './customer-message-ai.js';
