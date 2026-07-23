/**
 * GarsonAI kitchen KDS realtime bridge (live order updates).
 */
import { subscribeKitchenOrders } from './database/realtime-service.js';
import { resolveGarsonRestaurantIdBySlug } from './data-service.js';

/**
 * @typedef {Object} KitchenRealtimeBinding
 * @property {string} restaurantId
 * @property {string} channelName
 * @property {() => Promise<void>} unsubscribe
 */

/**
 * @param {{ slug?: string, restaurantId?: string, onRefresh?: () => void|Promise<void>, client?: import('@supabase/supabase-js').SupabaseClient }} options
 * @returns {Promise<KitchenRealtimeBinding|null>}
 */
export async function bindKitchenOrderRealtime(options = {}) {
  const onRefresh = options.onRefresh;
  const client = options.client;

  let restaurantId = String(options.restaurantId || '').trim();
  if (!restaurantId && options.slug) {
    restaurantId = await resolveGarsonRestaurantIdBySlug(String(options.slug), { client });
  }

  if (!restaurantId) return null;

  const subscription = subscribeKitchenOrders(
    restaurantId,
    {
      onInsert: () => {
        void onRefresh?.();
      },
      onUpdate: () => {
        void onRefresh?.();
      }
    },
    { client }
  );

  return {
    restaurantId,
    channelName: subscription.channelName,
    unsubscribe: subscription.unsubscribe
  };
}
