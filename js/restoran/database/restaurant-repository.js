/**
 * GarsonAI restaurant repository.
 */
import { getSupabaseClient } from '../../core/supabase.js';
import {
  RestaurantDatabaseError,
  getDatabaseErrorMessage,
  isDatabaseClientAvailable,
  normalizeRestaurantRow,
  requireRestaurantId
} from './tenant-utils.js';

/**
 * @typedef {Object} RestaurantRepositoryOptions
 * @property {string} restaurantId
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 */

/**
 * @param {RestaurantRepositoryOptions & { id?: string }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getRestaurant(options) {
  const restaurantId = requireRestaurantId(options.restaurantId || options.id);
  const client = options.client || getSupabaseClient();

  if (!isDatabaseClientAvailable(client)) {
    throw new RestaurantDatabaseError('Veritabanı bağlantısı kullanılamıyor.');
  }

  const { data, error } = await client
    .from('restaurants')
    .select(
      'id, name, slug, phone, address, status, plan, subscription_plan, created_at'
    )
    .eq('id', restaurantId)
    .maybeSingle();

  if (error) {
    throw new RestaurantDatabaseError(getDatabaseErrorMessage(error));
  }

  if (!data) {
    throw new RestaurantDatabaseError('Restoran bulunamadı.');
  }

  return normalizeRestaurantRow(/** @type {Record<string, unknown>} */ (data));
}

/**
 * @param {RestaurantRepositoryOptions & { patch?: Record<string, unknown> }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function updateRestaurant(options) {
  const restaurantId = requireRestaurantId(options.restaurantId);
  const client = options.client || getSupabaseClient();
  const patch = options.patch && typeof options.patch === 'object' ? options.patch : {};

  if (!isDatabaseClientAvailable(client)) {
    throw new RestaurantDatabaseError('Veritabanı bağlantısı kullanılamıyor.');
  }

  /** @type {Record<string, unknown>} */
  const updateRow = {};

  if (patch.name != null) updateRow.name = String(patch.name);
  if (patch.phone != null) updateRow.phone = String(patch.phone);
  if (patch.address != null) updateRow.address = String(patch.address);
  if (patch.status != null) updateRow.status = String(patch.status);
  if (patch.subscriptionPlan != null) {
    updateRow.subscription_plan = String(patch.subscriptionPlan);
  }
  if (patch.subscription_plan != null) {
    updateRow.subscription_plan = String(patch.subscription_plan);
  }

  if (!Object.keys(updateRow).length) {
    throw new RestaurantDatabaseError('Güncellenecek alan bulunamadı.');
  }

  const { data, error } = await client
    .from('restaurants')
    .update(updateRow)
    .eq('id', restaurantId)
    .select(
      'id, name, slug, phone, address, status, plan, subscription_plan, created_at'
    )
    .maybeSingle();

  if (error) {
    throw new RestaurantDatabaseError(getDatabaseErrorMessage(error));
  }

  if (!data) {
    throw new RestaurantDatabaseError('Restoran güncellenemedi.');
  }

  return normalizeRestaurantRow(/** @type {Record<string, unknown>} */ (data));
}
