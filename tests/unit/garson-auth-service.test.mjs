import test from 'node:test';
import assert from 'node:assert/strict';

const {
  GARSON_AUTH_NO_RESTAURANT_ERROR,
  GARSON_AUTH_UNAVAILABLE_ERROR,
  GARSON_RESTAURANT_CONTEXT_KEY,
  activateDemoAdminSession,
  buildDemoRestaurantSessionContext,
  clearDemoAdminSession,
  clearRestaurantSessionContext,
  getCurrentRestaurantSession,
  isGarsonAuthAvailable,
  isDemoAdminSessionActive,
  loginRestaurantUser,
  logoutRestaurantUser,
  normalizeRestaurantAccess,
  pickPrimaryRestaurantMembership,
  readRestaurantSessionContext,
  resolveGarsonPanelAccess,
  resolveRestaurantAccess,
  writeRestaurantSessionContext
} = await import('../../js/restoran/auth-service.js');

const { DEMO_RESTAURANT_SLUG } = await import('../../js/restoran/tenant.js');

const DEMO_RESTAURANT_ID = 'a0000000-0000-4000-8000-00000000cafe';
const OTHER_RESTAURANT_ID = 'b0000000-0000-4000-8000-00000000bistro';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const SUPABASE_OPTS = { useSupabase: true };

/** @type {Storage|null} */
let memoryStorage = null;

function installMemoryStorage() {
  /** @type {Record<string, string>} */
  const store = {};
  memoryStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      for (const key of Object.keys(store)) delete store[key];
    }
  };
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: memoryStorage },
    configurable: true
  });
}

function resetStorage() {
  memoryStorage?.clear();
}

/**
 * @param {{ auth?: Record<string, Function>, tables?: Record<string, unknown[]> }} config
 */
function createMockAuthClient(config = {}) {
  const tables = config.tables || {};
  const auth = config.auth || {};

  return {
    auth: {
      signInWithPassword:
        auth.signInWithPassword ||
        (async () => ({
          data: {
            session: {
              user: { id: USER_ID, email: 'owner@demo-cafe.test' }
            }
          },
          error: null
        })),
      signOut: auth.signOut || (async () => ({ error: null })),
      getSession:
        auth.getSession ||
        (async () => ({
          data: {
            session: {
              user: { id: USER_ID, email: 'owner@demo-cafe.test' },
              access_token: 'token'
            }
          },
          error: null
        })),
      getUser:
        auth.getUser ||
        (async () => ({
          data: { user: { id: USER_ID, email: 'owner@demo-cafe.test' } },
          error: null
        }))
    },
    from(table) {
      const rows = tables[table] || [];
      const state = { filters: /** @type {Array<[string, string]>} */ ([]) };
      const query = {
        select() {
          return query;
        },
        eq(column, value) {
          state.filters.push([column, String(value)]);
          return query;
        },
        limit() {
          return query;
        },
        then(resolve) {
          const data = rows.filter((row) => {
            const record = /** @type {Record<string, unknown>} */ (row);
            return state.filters.every(([column, expected]) => {
              return String(record[column] ?? '') === expected;
            });
          });
          return Promise.resolve({ data, error: null }).then(resolve);
        },
        catch() {
          return query;
        }
      };
      return query;
    }
  };
}

test.beforeEach(() => {
  installMemoryStorage();
  resetStorage();
});

test('loginRestaurantUser succeeds and stores restaurant context', async () => {
  const client = createMockAuthClient({
    tables: {
      restaurant_users: [
        {
          id: 'ru-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          user_id: USER_ID,
          role: 'owner',
          restaurants: {
            id: DEMO_RESTAURANT_ID,
            name: 'Demo Cafe',
            slug: DEMO_RESTAURANT_SLUG,
            status: 'active',
            plan: 'pilot'
          }
        }
      ]
    }
  });

  const result = await loginRestaurantUser('owner@demo-cafe.test', 'secret', {
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.ok, true);
  assert.equal(result.context?.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(result.context?.role, 'owner');
  assert.equal(result.context?.slug, DEMO_RESTAURANT_SLUG);

  const stored = readRestaurantSessionContext();
  assert.equal(stored?.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(stored?.mode, 'live');
});

test('loginRestaurantUser maps invalid credentials to Turkish message', async () => {
  const client = createMockAuthClient({
    auth: {
      signInWithPassword: async () => ({
        data: null,
        error: { message: 'Invalid login credentials' }
      })
    }
  });

  const result = await loginRestaurantUser('wrong@demo.test', 'bad', {
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.ok, false);
  assert.match(result.error || '', /E-posta veya şifre hatalı/i);
});

test('logoutRestaurantUser clears live and demo session state', async () => {
  writeRestaurantSessionContext(buildDemoRestaurantSessionContext());
  activateDemoAdminSession();

  const client = createMockAuthClient();
  let signedOut = false;
  client.auth.signOut = async () => {
    signedOut = true;
    return { error: null };
  };

  const result = await logoutRestaurantUser({ client, ...SUPABASE_OPTS });

  assert.equal(result.ok, true);
  assert.equal(signedOut, true);
  assert.equal(readRestaurantSessionContext(), null);
  assert.equal(isDemoAdminSessionActive(), false);
});

test('resolveRestaurantAccess maps restaurant_users role and restaurant info', async () => {
  const client = createMockAuthClient({
    tables: {
      restaurant_users: [
        {
          id: 'ru-kitchen',
          restaurant_id: DEMO_RESTAURANT_ID,
          user_id: USER_ID,
          role: 'kitchen',
          restaurants: {
            id: DEMO_RESTAURANT_ID,
            name: 'Demo Cafe',
            slug: DEMO_RESTAURANT_SLUG
          }
        },
        {
          id: 'ru-owner',
          restaurant_id: DEMO_RESTAURANT_ID,
          user_id: USER_ID,
          role: 'owner',
          restaurants: {
            id: DEMO_RESTAURANT_ID,
            name: 'Demo Cafe',
            slug: DEMO_RESTAURANT_SLUG
          }
        }
      ]
    }
  });

  const result = await resolveRestaurantAccess({ client, ...SUPABASE_OPTS });

  assert.equal(result.ok, true);
  assert.equal(result.data?.role, 'owner');
  assert.equal(result.data?.roleLabel, 'Sahip');
  assert.equal(result.data?.restaurantName, 'Demo Cafe');
});

test('pickPrimaryRestaurantMembership and normalizeRestaurantAccess isolate tenant membership', () => {
  const memberships = [
    {
      id: 'ru-other',
      restaurant_id: OTHER_RESTAURANT_ID,
      user_id: 'other-user',
      role: 'owner',
      restaurants: {
        id: OTHER_RESTAURANT_ID,
        name: 'Other Bistro',
        slug: 'other-bistro'
      }
    },
    {
      id: 'ru-demo',
      restaurant_id: DEMO_RESTAURANT_ID,
      user_id: USER_ID,
      role: 'admin',
      restaurants: {
        id: DEMO_RESTAURANT_ID,
        name: 'Demo Cafe',
        slug: DEMO_RESTAURANT_SLUG
      }
    }
  ];

  const picked = pickPrimaryRestaurantMembership(memberships, USER_ID);
  const access = normalizeRestaurantAccess(picked, USER_ID);

  assert.equal(access?.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(access?.role, 'admin');
  assert.notEqual(access?.restaurantId, OTHER_RESTAURANT_ID);
});

test('resolveRestaurantAccess returns Turkish error when user has no restaurant', async () => {
  const client = createMockAuthClient({
    tables: {
      restaurant_users: []
    }
  });

  const result = await resolveRestaurantAccess({ client, ...SUPABASE_OPTS });

  assert.equal(result.ok, false);
  assert.equal(result.error, GARSON_AUTH_NO_RESTAURANT_ERROR);
});

test('getCurrentRestaurantSession returns demo context when Supabase unavailable', async () => {
  activateDemoAdminSession();

  const result = await getCurrentRestaurantSession({
    client: null,
    useSupabase: false
  });

  assert.equal(result.mode, 'demo');
  assert.equal(result.context?.restaurantId, DEMO_RESTAURANT_ID);
});

test('resolveGarsonPanelAccess uses live session when restaurant context exists', async () => {
  writeRestaurantSessionContext({
    mode: 'live',
    restaurantId: DEMO_RESTAURANT_ID,
    userId: USER_ID,
    role: 'owner',
    roleLabel: 'Sahip',
    slug: DEMO_RESTAURANT_SLUG,
    restaurantName: 'Demo Cafe'
  });

  const client = createMockAuthClient({
    tables: {
      restaurant_users: [
        {
          id: 'ru-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          user_id: USER_ID,
          role: 'owner',
          restaurants: {
            id: DEMO_RESTAURANT_ID,
            name: 'Demo Cafe',
            slug: DEMO_RESTAURANT_SLUG
          }
        }
      ]
    }
  });

  const access = await resolveGarsonPanelAccess({ client, ...SUPABASE_OPTS });

  assert.equal(access.mode, 'live');
  assert.equal(access.context?.restaurantId, DEMO_RESTAURANT_ID);
});

test('resolveGarsonPanelAccess falls back to demo mode without auth session', async () => {
  activateDemoAdminSession();

  const access = await resolveGarsonPanelAccess({
    client: null,
    useSupabase: false
  });

  assert.equal(access.mode, 'demo');
  assert.equal(access.context?.slug, DEMO_RESTAURANT_SLUG);
});

test('loginRestaurantUser returns fallback message when Supabase is unavailable', async () => {
  const result = await loginRestaurantUser('owner@demo.test', 'secret', {
    client: null,
    useSupabase: false
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, GARSON_AUTH_UNAVAILABLE_ERROR);
});

test('session context round-trips through storage key', () => {
  const context = buildDemoRestaurantSessionContext();
  writeRestaurantSessionContext(context);
  clearDemoAdminSession();

  const raw = memoryStorage?.getItem(GARSON_RESTAURANT_CONTEXT_KEY);
  assert.ok(raw);
  assert.equal(readRestaurantSessionContext()?.restaurantName, 'Demo Cafe');
  clearRestaurantSessionContext();
  assert.equal(readRestaurantSessionContext(), null);
});

test('isGarsonAuthAvailable respects useSupabase override', () => {
  const client = createMockAuthClient();
  assert.equal(isGarsonAuthAvailable(client, { useSupabase: true }), true);
  assert.equal(isGarsonAuthAvailable(client, { useSupabase: false }), false);
});
