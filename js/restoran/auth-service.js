/**
 * GarsonAI restaurant auth + tenant session layer (Supabase Auth + restaurant_users).
 */
import { isSupabaseConfigured, getSupabaseClient } from '../core/supabase.js';
import { mapAuthError } from '../features/auth/auth-errors.js';
import {
  DEMO_RESTAURANT_SLUG,
  normalizeRestaurantRole,
  normalizeRestaurantTenant,
  normalizeRestaurantUser
} from './tenant.js';

const DEMO_RESTAURANT_ID = 'a0000000-0000-4000-8000-00000000cafe';

export const GARSON_ADMIN_DEMO_SESSION_KEY = 'garsonai_admin_demo_session';
export const GARSON_RESTAURANT_CONTEXT_KEY = 'garsonai_restaurant_context';
export const GARSON_AUTH_STORAGE_KEY = 'istebul-auth-garson-v1';

export const GARSON_AUTH_UNAVAILABLE_ERROR =
  'Kimlik doğrulama servisi şu anda kullanılamıyor. Demo giriş ile devam edebilirsiniz.';

export const GARSON_AUTH_NO_RESTAURANT_ERROR =
  'Bu hesap için tanımlı bir restoran bulunamadı. Yöneticinizle iletişime geçin.';

/**
 * @typedef {Object} RestaurantSessionContext
 * @property {'live'|'demo'} mode
 * @property {string} restaurantId
 * @property {string} userId
 * @property {string} role
 * @property {string} roleLabel
 * @property {string} slug
 * @property {string} restaurantName
 */

/**
 * @typedef {Object} RestaurantAccessResult
 * @property {boolean} ok
 * @property {'supabase'|'demo'|'fallback'} [source]
 * @property {RestaurantSessionContext|null} [data]
 * @property {string|null} [error]
 * @property {unknown} [raw]
 */

/**
 * @typedef {Object} GarsonAuthOptions
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 * @property {boolean} [useSupabase]
 */

/** @type {import('@supabase/supabase-js').SupabaseClient|null} */
let garsonSupabaseSingleton = null;

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function createGarsonFallbackClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({
        data: null,
        error: new Error(GARSON_AUTH_UNAVAILABLE_ERROR)
      }),
      signOut: async () => ({ error: null })
    },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        limit: () => query,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
        then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
        catch: () => query
      };
      return query;
    }
  };
}

/**
 * @param {GarsonAuthOptions} [options]
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getGarsonAuthClient(options = {}) {
  if (options.client) return options.client;
  if (garsonSupabaseSingleton) return garsonSupabaseSingleton;

  if (!isSupabaseConfigured()) {
    garsonSupabaseSingleton = createGarsonFallbackClient();
    return garsonSupabaseSingleton;
  }

  garsonSupabaseSingleton = getSupabaseClient();

  return garsonSupabaseSingleton;
}

/**
 * @param {unknown} client
 * @param {GarsonAuthOptions} [options]
 * @returns {boolean}
 */
export function isGarsonAuthAvailable(client, options = {}) {
  if (options.useSupabase === true) {
    return Boolean(client && typeof client.auth?.signInWithPassword === 'function');
  }
  if (options.useSupabase === false) {
    return false;
  }
  return Boolean(isSupabaseConfigured() && client && typeof client.auth?.signInWithPassword === 'function');
}

/**
 * @returns {boolean}
 */
export function isDemoAdminSessionActive() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(GARSON_ADMIN_DEMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * @returns {void}
 */
export function activateDemoAdminSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GARSON_ADMIN_DEMO_SESSION_KEY, '1');
    window.localStorage.removeItem(GARSON_RESTAURANT_CONTEXT_KEY);
  } catch {
    // ignore storage failures in demo mode
  }
}

/**
 * @returns {void}
 */
export function clearDemoAdminSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GARSON_ADMIN_DEMO_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * @param {RestaurantSessionContext} context
 * @returns {void}
 */
export function writeRestaurantSessionContext(context) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GARSON_RESTAURANT_CONTEXT_KEY, JSON.stringify(context));
    window.localStorage.removeItem(GARSON_ADMIN_DEMO_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * @returns {RestaurantSessionContext|null}
 */
export function readRestaurantSessionContext() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GARSON_RESTAURANT_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const row = /** @type {Record<string, unknown>} */ (parsed);
    const restaurantId = String(row.restaurantId ?? row.restaurant_id ?? '').trim();
    if (!restaurantId) return null;
    return {
      mode: row.mode === 'demo' ? 'demo' : 'live',
      restaurantId,
      userId: String(row.userId ?? row.user_id ?? '').trim(),
      role: normalizeRestaurantRole(String(row.role ?? '')),
      roleLabel: String(row.roleLabel ?? row.role_label ?? '').trim(),
      slug: String(row.slug ?? '').trim().toLowerCase(),
      restaurantName: String(row.restaurantName ?? row.restaurant_name ?? '').trim()
    };
  } catch {
    return null;
  }
}

/**
 * @returns {void}
 */
export function clearRestaurantSessionContext() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GARSON_RESTAURANT_CONTEXT_KEY);
  } catch {
    // ignore
  }
}

/**
 * @returns {boolean}
 */
export function hasGarsonPanelSession() {
  return Boolean(readRestaurantSessionContext()?.restaurantId) || isDemoAdminSessionActive();
}

/**
 * @param {unknown[]} memberships
 * @param {string} userId
 * @returns {unknown|null}
 */
export function pickPrimaryRestaurantMembership(memberships, userId) {
  const targetUserId = String(userId || '').trim();
  const rolePriority = { owner: 0, admin: 1, kitchen: 2 };

  const rows = (Array.isArray(memberships) ? memberships : [])
    .filter((row) => {
      const record = /** @type {Record<string, unknown>} */ (
        row && typeof row === 'object' ? row : {}
      );
      return String(record.user_id ?? record.userId ?? '').trim() === targetUserId;
    })
    .sort((left, right) => {
      const leftRole = normalizeRestaurantRole(
        String(/** @type {Record<string, unknown>} */ (left).role ?? '')
      );
      const rightRole = normalizeRestaurantRole(
        String(/** @type {Record<string, unknown>} */ (right).role ?? '')
      );
      return (rolePriority[leftRole] ?? 9) - (rolePriority[rightRole] ?? 9);
    });

  return rows[0] ?? null;
}

/**
 * @param {unknown} membership
 * @param {string} userId
 * @returns {RestaurantSessionContext|null}
 */
export function normalizeRestaurantAccess(membership, userId) {
  if (!membership || typeof membership !== 'object') return null;

  const row = /** @type {Record<string, unknown>} */ (membership);
  const member = normalizeRestaurantUser(row);
  const targetUserId = String(userId || member.userId || '').trim();

  if (targetUserId && member.userId && member.userId !== targetUserId) {
    return null;
  }

  const restaurantPayload =
    row.restaurants && typeof row.restaurants === 'object' ? row.restaurants : row.restaurant;
  const restaurant = normalizeRestaurantTenant(restaurantPayload || {
    id: member.restaurantId,
    name: row.restaurant_name ?? row.restaurantName
  });

  if (!member.restaurantId || !restaurant.id || member.restaurantId !== restaurant.id) {
    return null;
  }

  return {
    mode: 'live',
    restaurantId: restaurant.id,
    userId: member.userId || targetUserId,
    role: member.role,
    roleLabel: member.roleLabel,
    slug: restaurant.slug || DEMO_RESTAURANT_SLUG,
    restaurantName: restaurant.name || 'Restoran'
  };
}

/**
 * @returns {RestaurantSessionContext}
 */
export function buildDemoRestaurantSessionContext() {
  return {
    mode: 'demo',
    restaurantId: DEMO_RESTAURANT_ID,
    userId: 'demo-owner',
    role: 'owner',
    roleLabel: 'Sahip',
    slug: DEMO_RESTAURANT_SLUG,
    restaurantName: 'Demo Cafe'
  };
}

/**
 * @param {GarsonAuthOptions} [options]
 * @returns {Promise<RestaurantAccessResult>}
 */
export async function resolveRestaurantAccess(options = {}) {
  const client = getGarsonAuthClient(options);

  if (!isGarsonAuthAvailable(client, options)) {
    if (isDemoAdminSessionActive()) {
      return {
        ok: true,
        source: 'demo',
        data: buildDemoRestaurantSessionContext(),
        error: null
      };
    }

    return {
      ok: false,
      source: 'fallback',
      data: null,
      error: GARSON_AUTH_UNAVAILABLE_ERROR
    };
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  const user = userData?.user;

  if (userError || !user?.id) {
    if (isDemoAdminSessionActive()) {
      return {
        ok: true,
        source: 'demo',
        data: buildDemoRestaurantSessionContext(),
        error: null
      };
    }

    return {
      ok: false,
      source: 'supabase',
      data: null,
      error: userError ? mapAuthError(userError, 'Oturum doğrulanamadı.') : 'Oturum bulunamadı.'
    };
  }

  const { data, error } = await client
    .from('restaurant_users')
    .select(
      'id, restaurant_id, user_id, role, created_at, restaurants(id, name, slug, status, plan, onboarding_status, created_at)'
    )
    .eq('user_id', user.id)
    .limit(20);

  if (error) {
    return {
      ok: false,
      source: 'supabase',
      data: null,
      error: mapAuthError(error, 'Restoran erişimi alınamadı.')
    };
  }

  const membership = pickPrimaryRestaurantMembership(data || [], user.id);
  const access = normalizeRestaurantAccess(membership, user.id);

  if (!access) {
    return {
      ok: false,
      source: 'supabase',
      data: null,
      error: GARSON_AUTH_NO_RESTAURANT_ERROR,
      raw: data
    };
  }

  return {
    ok: true,
    source: 'supabase',
    data: access,
    error: null,
    raw: membership
  };
}

/**
 * @param {GarsonAuthOptions} [options]
 * @returns {Promise<{ session: import('@supabase/supabase-js').Session|null, user: import('@supabase/supabase-js').User|null, context: RestaurantSessionContext|null, mode: 'live'|'demo'|null, error: string|null }>}
 */
export async function getCurrentRestaurantSession(options = {}) {
  const client = getGarsonAuthClient(options);
  const storedContext = readRestaurantSessionContext();

  if (!isGarsonAuthAvailable(client, options)) {
    if (isDemoAdminSessionActive()) {
      return {
        session: null,
        user: null,
        context: buildDemoRestaurantSessionContext(),
        mode: 'demo',
        error: null
      };
    }

    return {
      session: null,
      user: null,
      context: storedContext,
      mode: storedContext?.mode ?? null,
      error: storedContext ? null : GARSON_AUTH_UNAVAILABLE_ERROR
    };
  }

  const { data, error } = await client.auth.getSession();
  const session = data?.session ?? null;
  const user = session?.user ?? null;

  if (!session || !user) {
    if (isDemoAdminSessionActive()) {
      return {
        session: null,
        user: null,
        context: buildDemoRestaurantSessionContext(),
        mode: 'demo',
        error: null
      };
    }

    return {
      session: null,
      user: null,
      context: null,
      mode: null,
      error: error ? mapAuthError(error, 'Oturum alınamadı.') : null
    };
  }

  if (storedContext?.userId && storedContext.userId !== user.id) {
    clearRestaurantSessionContext();
  }

  const access = await resolveRestaurantAccess({ ...options, client });
  if (!access.ok || !access.data) {
    return {
      session,
      user,
      context: storedContext,
      mode: storedContext?.mode ?? null,
      error: access.error
    };
  }

  writeRestaurantSessionContext(access.data);

  return {
    session,
    user,
    context: access.data,
    mode: 'live',
    error: null
  };
}

/**
 * @param {string} email
 * @param {string} password
 * @param {GarsonAuthOptions} [options]
 * @returns {Promise<{ ok: boolean, error?: string|null, session?: import('@supabase/supabase-js').Session|null, context?: RestaurantSessionContext|null, source?: string }>}
 */
export async function loginRestaurantUser(email, password, options = {}) {
  const trimmedEmail = String(email || '').trim();
  const trimmedPassword = String(password || '');
  const client = getGarsonAuthClient(options);

  if (!trimmedEmail || !trimmedPassword) {
    return { ok: false, error: 'E-posta ve şifre alanlarını doldurun.' };
  }

  if (!isGarsonAuthAvailable(client, options)) {
    return { ok: false, error: GARSON_AUTH_UNAVAILABLE_ERROR, source: 'fallback' };
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: trimmedEmail,
    password: trimmedPassword
  });

  if (error) {
    return { ok: false, error: mapAuthError(error, 'Giriş yapılamadı.') };
  }

  const access = await resolveRestaurantAccess({ ...options, client });
  if (!access.ok || !access.data) {
    await client.auth.signOut();
    return { ok: false, error: access.error || GARSON_AUTH_NO_RESTAURANT_ERROR };
  }

  writeRestaurantSessionContext(access.data);

  return {
    ok: true,
    session: data.session,
    context: access.data,
    source: access.source
  };
}

/**
 * @param {GarsonAuthOptions} [options]
 * @returns {Promise<{ ok: boolean }>}
 */
export async function logoutRestaurantUser(options = {}) {
  const client = getGarsonAuthClient(options);
  clearRestaurantSessionContext();
  clearDemoAdminSession();

  if (isGarsonAuthAvailable(client, options)) {
    await client.auth.signOut();
  }

  return { ok: true };
}

/**
 * @param {GarsonAuthOptions} [options]
 * @returns {Promise<{ mode: 'live'|'demo'|'none', context: RestaurantSessionContext|null, error: string|null }>}
 */
export async function resolveGarsonPanelAccess(options = {}) {
  const current = await getCurrentRestaurantSession(options);

  if (current.mode === 'live' && current.context) {
    return { mode: 'live', context: current.context, error: null };
  }

  if (current.mode === 'demo' || isDemoAdminSessionActive()) {
    return {
      mode: 'demo',
      context: buildDemoRestaurantSessionContext(),
      error: null
    };
  }

  return {
    mode: 'none',
    context: null,
    error: current.error
  };
}
