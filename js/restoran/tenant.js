/**
 * GarsonAI restaurant tenant normalizers (Supabase row → client shape).
 */

export const DEMO_RESTAURANT_SLUG = 'demo-cafe';

/** @type {Set<string>} */
export const RESTAURANT_ROLES = new Set(['owner', 'admin', 'kitchen']);

/** @type {Set<string>} */
export const RESTAURANT_STATUSES = new Set(['active', 'inactive', 'pending', 'suspended']);

/** @type {Set<string>} */
export const RESTAURANT_PLANS = new Set(['starter', 'growth', 'pro', 'enterprise', 'pilot']);

/** @type {Set<string>} */
export const RESTAURANT_ONBOARDING_STATUSES = new Set([
  'not_started',
  'in_progress',
  'completed'
]);

/** @type {Record<string, string>} */
export const RESTAURANT_ROLE_LABELS = {
  owner: 'Sahip',
  admin: 'Yönetici',
  kitchen: 'Mutfak'
};

/**
 * @typedef {Object} NormalizedRestaurantTenant
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {string} status
 * @property {string} plan
 * @property {string} onboardingStatus
 * @property {string} createdAt
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedRestaurantUser
 * @property {string} id
 * @property {string} restaurantId
 * @property {string} userId
 * @property {string} role
 * @property {string} roleLabel
 * @property {string} createdAt
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedRestaurantSettings
 * @property {string} id
 * @property {string} restaurantId
 * @property {boolean} whatsappEnabled
 * @property {boolean} preorderEnabled
 * @property {boolean} kitchenEnabled
 * @property {boolean} aiEnabled
 * @property {unknown} raw
 */

/**
 * @param {string} [role]
 * @returns {string}
 */
export function normalizeRestaurantRole(role) {
  const key = String(role || '').trim().toLowerCase();
  return RESTAURANT_ROLES.has(key) ? key : 'admin';
}

/**
 * @param {string} [role]
 * @returns {string}
 */
export function formatRestaurantRoleLabel(role) {
  return RESTAURANT_ROLE_LABELS[normalizeRestaurantRole(role)] || RESTAURANT_ROLE_LABELS.admin;
}

/**
 * @param {string} [slug]
 * @returns {boolean}
 */
export function isDemoRestaurantSlug(slug) {
  return String(slug || '').trim().toLowerCase() === DEMO_RESTAURANT_SLUG;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function normalizeBooleanFlag(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
}

/**
 * @param {unknown} payload
 * @returns {NormalizedRestaurantTenant}
 */
export function normalizeRestaurantTenant(payload) {
  let row = payload;

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    if (root.restaurant && typeof root.restaurant === 'object') {
      row = root.restaurant;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      row = data.restaurant && typeof data.restaurant === 'object' ? data.restaurant : data;
    }
  }

  const record = /** @type {Record<string, unknown>} */ (
    row && typeof row === 'object' ? row : {}
  );

  const id = String(record.id ?? '').trim();
  const name = String(record.name ?? record.restaurant_name ?? '').trim();
  const slug = String(record.slug ?? record.business_id ?? record.businessId ?? '').trim().toLowerCase();
  const statusRaw = String(record.status ?? 'active').trim().toLowerCase();
  const status = RESTAURANT_STATUSES.has(statusRaw) ? statusRaw : 'active';
  const planRaw = String(record.plan ?? 'starter').trim().toLowerCase();
  const plan = RESTAURANT_PLANS.has(planRaw) ? planRaw : 'starter';
  const onboardingRaw = String(
    record.onboarding_status ?? record.onboardingStatus ?? 'not_started'
  )
    .trim()
    .toLowerCase();
  const onboardingStatus = RESTAURANT_ONBOARDING_STATUSES.has(onboardingRaw)
    ? onboardingRaw
    : 'not_started';
  const createdAt = String(record.created_at ?? record.createdAt ?? '').trim();

  return {
    id,
    name,
    slug,
    status,
    plan,
    onboardingStatus,
    createdAt,
    raw: payload
  };
}

/**
 * @param {unknown} payload
 * @returns {NormalizedRestaurantUser}
 */
export function normalizeRestaurantUser(payload) {
  let row = payload;

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    if (root.restaurant_user && typeof root.restaurant_user === 'object') {
      row = root.restaurant_user;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      row =
        data.restaurant_user && typeof data.restaurant_user === 'object'
          ? data.restaurant_user
          : data;
    }
  }

  const record = /** @type {Record<string, unknown>} */ (
    row && typeof row === 'object' ? row : {}
  );

  const id = String(record.id ?? '').trim();
  const restaurantId = String(record.restaurant_id ?? record.restaurantId ?? '').trim();
  const userId = String(record.user_id ?? record.userId ?? '').trim();
  const role = normalizeRestaurantRole(String(record.role ?? ''));
  const createdAt = String(record.created_at ?? record.createdAt ?? '').trim();

  return {
    id,
    restaurantId,
    userId,
    role,
    roleLabel: formatRestaurantRoleLabel(role),
    createdAt,
    raw: payload
  };
}

/**
 * @param {unknown} payload
 * @returns {NormalizedRestaurantSettings}
 */
export function normalizeRestaurantSettings(payload) {
  let row = payload;

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    if (root.settings && typeof root.settings === 'object') {
      row = root.settings;
    } else if (root.restaurant_settings && typeof root.restaurant_settings === 'object') {
      row = root.restaurant_settings;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      row =
        data.settings && typeof data.settings === 'object'
          ? data.settings
          : data.restaurant_settings && typeof data.restaurant_settings === 'object'
            ? data.restaurant_settings
            : data;
    }
  }

  const record = /** @type {Record<string, unknown>} */ (
    row && typeof row === 'object' ? row : {}
  );

  const id = String(record.id ?? '').trim();
  const restaurantId = String(record.restaurant_id ?? record.restaurantId ?? '').trim();

  return {
    id,
    restaurantId,
    whatsappEnabled: normalizeBooleanFlag(
      record.whatsapp_enabled ?? record.whatsappEnabled,
      false
    ),
    preorderEnabled: normalizeBooleanFlag(
      record.preorder_enabled ?? record.preorderEnabled,
      false
    ),
    kitchenEnabled: normalizeBooleanFlag(
      record.kitchen_enabled ?? record.kitchenEnabled,
      false
    ),
    aiEnabled: normalizeBooleanFlag(record.ai_enabled ?? record.aiEnabled, false),
    raw: payload
  };
}
