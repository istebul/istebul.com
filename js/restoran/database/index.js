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

export { getRestaurant, updateRestaurant } from './restaurant-repository.js';
export { createOrder, updateOrderStatus, getRestaurantOrders } from './order-repository.js';
export { upsertCustomer, getCustomerHistory } from './customer-repository.js';
export { getActiveMenu } from './menu-repository.js';

export {
  buildRealtimeChannelName,
  subscribeRestaurantTable,
  subscribeKitchenOrders,
  subscribeAIInsights,
  listActiveRealtimeChannels,
  unsubscribeRealtimeChannel
} from './realtime-service.js';
