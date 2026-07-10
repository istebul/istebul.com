/**
 * GarsonAI menu repository.
 */
import { getSupabaseClient } from '../../core/supabase.js';
import {
  RestaurantDatabaseError,
  getDatabaseErrorMessage,
  isDatabaseClientAvailable,
  normalizeMenuItemRow,
  requireRestaurantId
} from './tenant-utils.js';

/**
 * @typedef {Object} MenuRepositoryOptions
 * @property {string} restaurantId
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 */

/**
 * @param {MenuRepositoryOptions} options
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function getActiveMenu(options) {
  const restaurantId = requireRestaurantId(options.restaurantId);
  const client = options.client || getSupabaseClient();

  if (!isDatabaseClientAvailable(client)) {
    throw new RestaurantDatabaseError('Veritabanı bağlantısı kullanılamıyor.');
  }

  const { data, error } = await client
    .from('menu_items')
    .select('id, restaurant_id, name, description, price, category, active')
    .eq('restaurant_id', restaurantId)
    .eq('active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new RestaurantDatabaseError(getDatabaseErrorMessage(error));
  }

  return (data || []).map((row) =>
    normalizeMenuItemRow(/** @type {Record<string, unknown>} */ (row))
  );
}
