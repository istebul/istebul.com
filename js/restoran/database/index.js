/**
 * GarsonAI live database layer exports.
 */
export {
  RestaurantDatabaseError,
  requireRestaurantId,
  isDatabaseClientAvailable,
  getDatabaseErrorMessage,
  normalizeRestaurantRow,
  normalizeCustomerRow,
  normalizeMenuItemRow,
  normalizeOrderRow
} from './tenant-utils.js';

export { getRestaurant, updateRestaurant, getRestaurantBySlug } from './restaurant-repository.js';
export { createOrder, updateOrderStatus, getRestaurantOrders } from './order-repository.js';
export { upsertCustomer, getCustomerHistory, getRestaurantCustomers } from './customer-repository.js';
export { getActiveMenu } from './menu-repository.js';

export {
  buildRealtimeChannelName,
  subscribeRestaurantTable,
  subscribeKitchenOrders,
  subscribeAIInsights,
  listActiveRealtimeChannels,
  unsubscribeRealtimeChannel
} from './realtime-service.js';
