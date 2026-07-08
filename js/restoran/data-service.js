/**
 * GarsonAI restaurant admin data service (Supabase → normalized admin models, mock fallback).
 */
import { getSupabaseClient, isSupabaseConfigured } from '../core/supabase.js';
import { DEMO_RESTAURANT_SLUG } from './tenant.js';
import {
  DEMO_RESTAURANT_ID,
  filterRestaurantData,
  getMockDemoManagementModel,
  normalizeAdminMenu,
  normalizeAdminOrders,
  normalizeAdminReservations
} from './admin-management.js';

export const GARSON_DATA_PERMISSION_ERROR =
  'Bu işlem için yetkiniz bulunmuyor. Lütfen yönetici hesabınızla tekrar deneyin.';

export const GARSON_DATA_NETWORK_ERROR =
  'Veri servisine bağlanılamadı. Demo verileri gösteriliyor.';

/**
 * @typedef {'supabase'|'mock'|'fallback'} GarsonDataSource
 */

/**
 * @typedef {Object} GarsonDataResult
 * @property {GarsonDataSource} source
 * @property {unknown} data
 * @property {string|null} error
 * @property {boolean} isEmpty
 */

/**
 * @typedef {Object} GarsonDataOptions
 * @property {string} [restaurantId]
 * @property {string} [slug]
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 * @property {boolean} [useSupabase] Test hook: force Supabase or mock path.
 */

/**
 * @param {unknown} client
 * @param {GarsonDataOptions} [options]
 * @returns {boolean}
 */
export function isGarsonSupabaseClientAvailable(client, options = {}) {
  if (options.useSupabase === true) {
    return Boolean(client && typeof client.from === 'function');
  }
  if (options.useSupabase === false) {
    return false;
  }
  return Boolean(isSupabaseConfigured() && client && typeof client.from === 'function');
}

/**
 * @param {string} [restaurantId]
 * @returns {string}
 */
export function resolveGarsonRestaurantId(restaurantId) {
  const value = String(restaurantId || '').trim();
  return value || DEMO_RESTAURANT_ID;
}

/**
 * @param {unknown} error
 * @returns {'network'|'permission'|'other'}
 */
export function classifyGarsonDataError(error) {
  const message = String(
    error && typeof error === 'object' && 'message' in error
      ? /** @type {{ message?: string }} */ (error).message
      : error ?? ''
  ).toLowerCase();

  const code = String(
    error && typeof error === 'object' && 'code' in error
      ? /** @type {{ code?: string }} */ (error).code
      : ''
  ).toLowerCase();

  if (
    code === '42501' ||
    code === 'pgrst301' ||
    /permission|forbidden|unauthorized|jwt|row-level security|rls/i.test(message)
  ) {
    return 'permission';
  }

  if (
    /network|fetch failed|failed to fetch|econnrefused|enotfound|timeout|abort/i.test(message) ||
    (error instanceof TypeError && /fetch/i.test(message))
  ) {
    return 'network';
  }

  return 'other';
}

/**
 * @param {unknown} error
 * @returns {string|null}
 */
export function getGarsonDataUserMessage(error) {
  const kind = classifyGarsonDataError(error);
  if (kind === 'permission') return GARSON_DATA_PERMISSION_ERROR;
  if (kind === 'network') return GARSON_DATA_NETWORK_ERROR;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(/** @type {{ message?: string }} */ (error).message || '').trim();
    return message || null;
  }
  return null;
}

/**
 * @param {GarsonDataOptions} [options]
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getGarsonDataClient(options = {}) {
  return options.client || getSupabaseClient();
}

/**
 * @param {unknown[]} records
 * @param {string} restaurantId
 * @returns {unknown[]}
 */
export function applyRestaurantFilter(records, restaurantId) {
  return filterRestaurantData(records, restaurantId);
}

/**
 * @param {unknown} payload
 * @param {string} restaurantId
 * @param {GarsonDataSource} source
 * @param {{ error?: unknown, slug?: string }} [meta]
 * @returns {GarsonDataResult}
 */
function buildMenuResult(payload, restaurantId, source, meta = {}) {
  const menu = normalizeAdminMenu({
    restaurant_id: restaurantId,
    categories: payload
  });

  if (meta.error && source !== 'mock' && source !== 'fallback') {
    const userMessage = getGarsonDataUserMessage(meta.error);
    if (userMessage && classifyGarsonDataError(meta.error) === 'permission') {
      return {
        source,
        data: menu,
        error: userMessage,
        isEmpty: !menu.categories.length
      };
    }
  }

  return {
    source,
    data: menu,
    error: meta.error ? getGarsonDataUserMessage(meta.error) : null,
    isEmpty: !menu.categories.length
  };
}

/**
 * @param {unknown} payload
 * @param {string} restaurantId
 * @param {GarsonDataSource} source
 * @param {{ error?: unknown }} [meta]
 * @returns {GarsonDataResult}
 */
function buildReservationResult(payload, restaurantId, source, meta = {}) {
  const reservations = normalizeAdminReservations({
    restaurant_id: restaurantId,
    reservations: payload
  });

  return {
    source,
    data: reservations,
    error: meta.error ? getGarsonDataUserMessage(meta.error) : null,
    isEmpty: !reservations.reservations.length
  };
}

/**
 * @param {unknown} payload
 * @param {string} restaurantId
 * @param {string} slug
 * @param {GarsonDataSource} source
 * @param {{ error?: unknown }} [meta]
 * @returns {GarsonDataResult}
 */
function buildOrderResult(payload, restaurantId, slug, source, meta = {}) {
  const orders = normalizeAdminOrders(
    {
      restaurant_id: restaurantId,
      orders: payload
    },
    { slug }
  );

  return {
    source,
    data: orders,
    error: meta.error ? getGarsonDataUserMessage(meta.error) : null,
    isEmpty: !orders.orders.length
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} restaurantId
 * @returns {Promise<{ categories: unknown[]|null, error: unknown|null }>}
 */
async function fetchMenuCategoriesFromSupabase(client, restaurantId) {
  const { data, error } = await client
    .from('menu_categories')
    .select(
      'id, restaurant_id, name, sort_order, menu_items(id, restaurant_id, name, price, active, is_active, stock_status)'
    )
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true });

  if (!error && Array.isArray(data) && data.length) {
    return {
      categories: data.map((category) => {
        const row = /** @type {Record<string, unknown>} */ (category);
        const items = Array.isArray(row.menu_items) ? row.menu_items : [];
        return {
          ...row,
          items: applyRestaurantFilter(items, restaurantId)
        };
      }),
      error: null
    };
  }

  return { categories: null, error };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} restaurantId
 * @returns {Promise<{ categories: unknown[]|null, error: unknown|null }>}
 */
async function fetchProductsAsMenuFromSupabase(client, restaurantId) {
  const { data, error } = await client
    .from('products')
    .select('id, restaurant_id, category_id, name, price, active, is_active, stock_status')
    .eq('restaurant_id', restaurantId);

  if (error || !Array.isArray(data) || !data.length) {
    return { categories: null, error };
  }

  const filtered = applyRestaurantFilter(data, restaurantId);
  /** @type {Map<string, { id: string, restaurant_id: string, name: string, items: unknown[] }>} */
  const grouped = new Map();

  for (const product of filtered) {
    const row = /** @type {Record<string, unknown>} */ (product);
    const categoryId = String(row.category_id ?? 'uncategorized').trim() || 'uncategorized';
    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, {
        id: categoryId,
        restaurant_id: restaurantId,
        name: categoryId === 'uncategorized' ? 'Ürünler' : `Kategori ${categoryId}`,
        items: []
      });
    }
    grouped.get(categoryId)?.items.push(row);
  }

  return { categories: [...grouped.values()], error: null };
}

/**
 * @param {GarsonDataOptions} [options]
 * @returns {Promise<GarsonDataResult>}
 */
export async function getRestaurantMenuData(options = {}) {
  const restaurantId = resolveGarsonRestaurantId(options.restaurantId);
  const client = getGarsonDataClient(options);

  if (!isGarsonSupabaseClientAvailable(client, options)) {
    const mock = getMockDemoManagementModel();
    return {
      source: 'mock',
      data: mock.menu,
      error: null,
      isEmpty: !mock.menu.categories.length
    };
  }

  try {
    const categoryResult = await fetchMenuCategoriesFromSupabase(client, restaurantId);
    let categories = categoryResult.categories;
    let error = categoryResult.error;

    if (!categories?.length) {
      const productResult = await fetchProductsAsMenuFromSupabase(client, restaurantId);
      categories = productResult.categories;
      error = productResult.error || error;
    }

    if (error && classifyGarsonDataError(error) === 'permission') {
      return buildMenuResult([], restaurantId, 'supabase', { error });
    }

    if (error && classifyGarsonDataError(error) === 'network') {
      const mock = getMockDemoManagementModel();
      return {
        source: 'fallback',
        data: mock.menu,
        error: GARSON_DATA_NETWORK_ERROR,
        isEmpty: !mock.menu.categories.length
      };
    }

    const filtered = applyRestaurantFilter(categories || [], restaurantId);
    return buildMenuResult(filtered, restaurantId, 'supabase', { error });
  } catch (error) {
    if (classifyGarsonDataError(error) === 'permission') {
      return buildMenuResult([], restaurantId, 'supabase', { error });
    }

    const mock = getMockDemoManagementModel();
    return {
      source: 'fallback',
      data: mock.menu,
      error: GARSON_DATA_NETWORK_ERROR,
      isEmpty: !mock.menu.categories.length
    };
  }
}

/**
 * @param {GarsonDataOptions} [options]
 * @returns {Promise<GarsonDataResult>}
 */
export async function getRestaurantReservationData(options = {}) {
  const restaurantId = resolveGarsonRestaurantId(options.restaurantId);
  const client = getGarsonDataClient(options);

  if (!isGarsonSupabaseClientAvailable(client, options)) {
    const mock = getMockDemoManagementModel();
    return {
      source: 'mock',
      data: mock.reservations,
      error: null,
      isEmpty: !mock.reservations.reservations.length
    };
  }

  try {
    const { data, error } = await client
      .from('reservations')
      .select(
        'id, restaurant_id, customer_name, date, time, guest_count, status, created_at'
      )
      .eq('restaurant_id', restaurantId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error && classifyGarsonDataError(error) === 'permission') {
      return buildReservationResult([], restaurantId, 'supabase', { error });
    }

    if (error && classifyGarsonDataError(error) === 'network') {
      const mock = getMockDemoManagementModel();
      return {
        source: 'fallback',
        data: mock.reservations,
        error: GARSON_DATA_NETWORK_ERROR,
        isEmpty: !mock.reservations.reservations.length
      };
    }

    const filtered = applyRestaurantFilter(data || [], restaurantId);
    return buildReservationResult(filtered, restaurantId, 'supabase', { error });
  } catch (error) {
    if (classifyGarsonDataError(error) === 'permission') {
      return buildReservationResult([], restaurantId, 'supabase', { error });
    }

    const mock = getMockDemoManagementModel();
    return {
      source: 'fallback',
      data: mock.reservations,
      error: GARSON_DATA_NETWORK_ERROR,
      isEmpty: !mock.reservations.reservations.length
    };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} restaurantId
 * @returns {Promise<{ rows: unknown[]|null, error: unknown|null }>}
 */
async function fetchOrdersFromSupabase(client, restaurantId) {
  const [ordersRes, preordersRes] = await Promise.all([
    client
      .from('orders')
      .select(
        'id, restaurant_id, order_no, items, line_items, total, total_amount, kitchen_status, status, created_at'
      )
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false }),
    client
      .from('preorders')
      .select(
        'id, restaurant_id, order_no, items, line_items, total, total_amount, kitchen_status, status, created_at, preorder_id'
      )
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
  ]);

  const error = ordersRes.error || preordersRes.error;
  const rows = [
    ...applyRestaurantFilter(ordersRes.data || [], restaurantId),
    ...applyRestaurantFilter(preordersRes.data || [], restaurantId)
  ];

  if (!rows.length && error) {
    return { rows: null, error };
  }

  return { rows, error };
}

/**
 * @param {GarsonDataOptions} [options]
 * @returns {Promise<GarsonDataResult>}
 */
export async function getRestaurantOrderData(options = {}) {
  const restaurantId = resolveGarsonRestaurantId(options.restaurantId);
  const slug = String(options.slug || DEMO_RESTAURANT_SLUG).trim().toLowerCase();
  const client = getGarsonDataClient(options);

  if (!isGarsonSupabaseClientAvailable(client, options)) {
    const mock = getMockDemoManagementModel();
    return {
      source: 'mock',
      data: mock.orders,
      error: null,
      isEmpty: !mock.orders.orders.length
    };
  }

  try {
    const { rows, error } = await fetchOrdersFromSupabase(client, restaurantId);

    if (error && classifyGarsonDataError(error) === 'permission') {
      return buildOrderResult([], restaurantId, slug, 'supabase', { error });
    }

    if (error && classifyGarsonDataError(error) === 'network') {
      const mock = getMockDemoManagementModel();
      return {
        source: 'fallback',
        data: mock.orders,
        error: GARSON_DATA_NETWORK_ERROR,
        isEmpty: !mock.orders.orders.length
      };
    }

    return buildOrderResult(rows || [], restaurantId, slug, 'supabase', { error });
  } catch (error) {
    if (classifyGarsonDataError(error) === 'permission') {
      return buildOrderResult([], restaurantId, slug, 'supabase', { error });
    }

    const mock = getMockDemoManagementModel();
    return {
      source: 'fallback',
      data: mock.orders,
      error: GARSON_DATA_NETWORK_ERROR,
      isEmpty: !mock.orders.orders.length
    };
  }
}

/**
 * @typedef {Object} SaveMenuItemInput
 * @property {string} [id]
 * @property {string} [name]
 * @property {number|null} [price]
 * @property {boolean} [active]
 * @property {string} [stockStatus]
 * @property {string} [categoryId]
 */

/**
 * @param {{ restaurantId?: string, item?: SaveMenuItemInput, client?: import('@supabase/supabase-js').SupabaseClient }} [options]
 * @returns {Promise<GarsonDataResult>}
 */
export async function saveRestaurantMenuItem(options = {}) {
  const restaurantId = resolveGarsonRestaurantId(options.restaurantId);
  const item = options.item || {};
  const client = getGarsonDataClient(options);

  if (!isGarsonSupabaseClientAvailable(client, options)) {
    const mock = getMockDemoManagementModel();
    return {
      source: 'mock',
      data: mock.menu,
      error: null,
      isEmpty: !mock.menu.categories.length
    };
  }

  const row = {
    restaurant_id: restaurantId,
    name: String(item.name || '').trim(),
    price: item.price ?? null,
    active: item.active !== false,
    stock_status: String(item.stockStatus || 'in_stock').trim() || 'in_stock'
  };

  if (item.categoryId) {
    row.category_id = String(item.categoryId).trim();
  }

  try {
    const query = item.id
      ? client
          .from('menu_items')
          .update(row)
          .eq('id', String(item.id).trim())
          .eq('restaurant_id', restaurantId)
          .select('id')
          .single()
      : client.from('menu_items').insert(row).select('id').single();

    const { error } = await query;

    if (error) {
      if (classifyGarsonDataError(error) === 'network') {
        const menu = await getRestaurantMenuData({ restaurantId, client });
        return {
          ...menu,
          source: 'fallback',
          error: GARSON_DATA_NETWORK_ERROR
        };
      }

      return {
        source: 'supabase',
        data: normalizeAdminMenu({ restaurant_id: restaurantId, categories: [] }),
        error: getGarsonDataUserMessage(error),
        isEmpty: true
      };
    }

    return getRestaurantMenuData({ restaurantId, client });
  } catch (error) {
    if (classifyGarsonDataError(error) === 'permission') {
      return {
        source: 'supabase',
        data: normalizeAdminMenu({ restaurant_id: restaurantId, categories: [] }),
        error: GARSON_DATA_PERMISSION_ERROR,
        isEmpty: true
      };
    }

    const menu = await getRestaurantMenuData({ restaurantId, client });
    return {
      ...menu,
      source: 'fallback',
      error: GARSON_DATA_NETWORK_ERROR
    };
  }
}

/**
 * @param {{ restaurantId?: string, orderId?: string, status?: string, client?: import('@supabase/supabase-js').SupabaseClient, slug?: string }} [options]
 * @returns {Promise<GarsonDataResult>}
 */
export async function updateRestaurantOrderStatus(options = {}) {
  const restaurantId = resolveGarsonRestaurantId(options.restaurantId);
  const orderId = String(options.orderId || '').trim();
  const status = String(options.status || '').trim().toLowerCase();
  const slug = String(options.slug || DEMO_RESTAURANT_SLUG).trim().toLowerCase();
  const client = getGarsonDataClient(options);

  if (!orderId || !status) {
    return {
      source: 'mock',
      data: normalizeAdminOrders({ restaurant_id: restaurantId, orders: [] }, { slug }),
      error: 'Sipariş kimliği ve durum gerekli.',
      isEmpty: true
    };
  }

  if (!isGarsonSupabaseClientAvailable(client, options)) {
    const mock = getMockDemoManagementModel();
    return {
      source: 'mock',
      data: mock.orders,
      error: null,
      isEmpty: !mock.orders.orders.length
    };
  }

  const patch = { kitchen_status: status, status };

  try {
    let error = null;

    const orderUpdate = await client
      .from('orders')
      .update(patch)
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
      .select('id')
      .maybeSingle();

    error = orderUpdate.error;

    if (!orderUpdate.data) {
      const preorderUpdate = await client
        .from('preorders')
        .update(patch)
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
        .select('id')
        .maybeSingle();

      error = preorderUpdate.error || error;
    }

    if (error) {
      if (classifyGarsonDataError(error) === 'network') {
        const orders = await getRestaurantOrderData({ restaurantId, slug, client });
        return {
          ...orders,
          source: 'fallback',
          error: GARSON_DATA_NETWORK_ERROR
        };
      }

      return {
        source: 'supabase',
        data: normalizeAdminOrders({ restaurant_id: restaurantId, orders: [] }, { slug }),
        error: getGarsonDataUserMessage(error),
        isEmpty: true
      };
    }

    return getRestaurantOrderData({ restaurantId, slug, client });
  } catch (error) {
    if (classifyGarsonDataError(error) === 'permission') {
      return {
        source: 'supabase',
        data: normalizeAdminOrders({ restaurant_id: restaurantId, orders: [] }, { slug }),
        error: GARSON_DATA_PERMISSION_ERROR,
        isEmpty: true
      };
    }

    const orders = await getRestaurantOrderData({ restaurantId, slug, client });
    return {
      ...orders,
      source: 'fallback',
      error: GARSON_DATA_NETWORK_ERROR
    };
  }
}

/**
 * @param {GarsonDataOptions} [options]
 * @returns {Promise<{ restaurantId: string, slug: string, menu: GarsonDataResult, reservations: GarsonDataResult, orders: GarsonDataResult, restaurantName: string }>}
 */
export async function loadRestaurantManagementData(options = {}) {
  const restaurantId = resolveGarsonRestaurantId(options.restaurantId);
  const slug = String(options.slug || DEMO_RESTAURANT_SLUG).trim().toLowerCase();
  const client = getGarsonDataClient(options);

  let restaurantName = 'Demo Cafe';

  if (isGarsonSupabaseClientAvailable(client, options)) {
    try {
      const { data } = await client
        .from('restaurants')
        .select('id, name, slug')
        .eq('id', restaurantId)
        .maybeSingle();

      if (data && typeof data === 'object') {
        const row = /** @type {Record<string, unknown>} */ (data);
        restaurantName = String(row.name || restaurantName).trim() || restaurantName;
      }
    } catch {
      // keep demo label on read failure
    }
  }

  const [menu, reservations, orders] = await Promise.all([
    getRestaurantMenuData({ restaurantId, client }),
    getRestaurantReservationData({ restaurantId, client }),
    getRestaurantOrderData({ restaurantId, slug, client })
  ]);

  return {
    restaurantId,
    slug,
    restaurantName,
    menu,
    reservations,
    orders
  };
}
