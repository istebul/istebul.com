/**
 * GarsonAI Supabase realtime subscriptions.
 */
import { getSupabaseClient } from '../../core/supabase.js';
import { RestaurantDatabaseError, requireRestaurantId } from './tenant-utils.js';

/** @type {Map<string, { channel: unknown, restaurantId: string }>} */
const activeChannels = new Map();

/**
 * @typedef {Object} RealtimeCallbacks
 * @property {(payload: unknown) => void} [onInsert]
 * @property {(payload: unknown) => void} [onUpdate]
 * @property {(payload: unknown) => void} [onDelete]
 * @property {(status: string) => void} [onStatus]
 */

/**
 * @typedef {Object} RealtimeSubscription
 * @property {string} channelName
 * @property {string} restaurantId
 * @property {string} table
 * @property {() => Promise<void>} unsubscribe
 */

/**
 * @param {unknown} client
 * @returns {boolean}
 */
function isRealtimeClientAvailable(client) {
  return Boolean(
    client &&
      typeof client.channel === 'function' &&
      typeof client.removeChannel === 'function'
  );
}

/**
 * @param {string} restaurantId
 * @param {string} suffix
 * @returns {string}
 */
export function buildRealtimeChannelName(restaurantId, suffix) {
  return `garson:${requireRestaurantId(restaurantId)}:${suffix}`;
}

/**
 * @param {{ restaurantId: string, table: string, suffix: string, client?: import('@supabase/supabase-js').SupabaseClient, callbacks?: RealtimeCallbacks }} options
 * @returns {RealtimeSubscription}
 */
export function subscribeRestaurantTable(options) {
  const restaurantId = requireRestaurantId(options.restaurantId);
  const table = String(options.table || '').trim();
  const suffix = String(options.suffix || table).trim();
  const callbacks = options.callbacks || {};

  if (!table) {
    throw new RestaurantDatabaseError('Realtime tablo adı gerekli.');
  }

  const client = options.client || getSupabaseClient();

  if (!isRealtimeClientAvailable(client)) {
    throw new RestaurantDatabaseError('Realtime bağlantısı kullanılamıyor.');
  }

  const channelName = buildRealtimeChannelName(restaurantId, suffix);
  const filter = `restaurant_id=eq.${restaurantId}`;

  const channel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table, filter },
      (payload) => callbacks.onInsert?.(payload)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table, filter },
      (payload) => callbacks.onUpdate?.(payload)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table, filter },
      (payload) => callbacks.onDelete?.(payload)
    )
    .subscribe((status) => {
      callbacks.onStatus?.(String(status));
    });

  activeChannels.set(channelName, { channel, restaurantId });

  return {
    channelName,
    restaurantId,
    table,
    unsubscribe: async () => {
      activeChannels.delete(channelName);
      await client.removeChannel(channel);
    }
  };
}

/**
 * @param {string} restaurantId
 * @param {RealtimeCallbacks} [callbacks]
 * @param {{ client?: import('@supabase/supabase-js').SupabaseClient }} [options]
 * @returns {RealtimeSubscription}
 */
export function subscribeKitchenOrders(restaurantId, callbacks = {}, options = {}) {
  return subscribeRestaurantTable({
    restaurantId,
    table: 'orders',
    suffix: 'kitchen-orders',
    client: options.client,
    callbacks
  });
}

/**
 * @param {string} restaurantId
 * @param {RealtimeCallbacks} [callbacks]
 * @param {{ client?: import('@supabase/supabase-js').SupabaseClient }} [options]
 * @returns {RealtimeSubscription}
 */
export function subscribeAIInsights(restaurantId, callbacks = {}, options = {}) {
  return subscribeRestaurantTable({
    restaurantId,
    table: 'ai_insights',
    suffix: 'ai-insights',
    client: options.client,
    callbacks
  });
}

/**
 * @returns {string[]}
 */
export function listActiveRealtimeChannels() {
  return [...activeChannels.keys()];
}

/**
 * @param {string} channelName
 * @returns {Promise<void>}
 */
export async function unsubscribeRealtimeChannel(channelName) {
  const entry = activeChannels.get(channelName);
  if (!entry) return;

  const client = getSupabaseClient();
  activeChannels.delete(channelName);

  if (isRealtimeClientAvailable(client)) {
    await client.removeChannel(entry.channel);
  }
}
