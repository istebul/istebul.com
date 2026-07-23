import { resolveGarsonPanelAccess } from '../../auth-service.js';
import { DEMO_RESTAURANT_ID } from '../../admin-management.js';
import { DEMO_RESTAURANT_SLUG } from '../../tenant.js';
import { GARSON_ADMIN_LOGIN_PATH } from './constants.js';

/**
 * @typedef {Object} AdminPanelContext
 * @property {'demo'|'live'} mode
 * @property {string} restaurantId
 * @property {string} slug
 * @property {string} restaurantName
 * @property {string} role
 */

/**
 * @returns {Promise<AdminPanelContext|null>}
 */
export async function resolveAdminPanelContext() {
  const access = await resolveGarsonPanelAccess();

  if (access.mode === 'none') {
    return null;
  }

  if (access.mode === 'live' && access.context) {
    return {
      mode: 'live',
      restaurantId: access.context.restaurantId,
      slug: access.context.slug || DEMO_RESTAURANT_SLUG,
      restaurantName: access.context.restaurantName || 'Restoran',
      role: access.context.role || 'owner'
    };
  }

  return {
    mode: 'demo',
    restaurantId: DEMO_RESTAURANT_ID,
    slug: DEMO_RESTAURANT_SLUG,
    restaurantName: 'Demo Cafe',
    role: 'owner'
  };
}

/**
 * @returns {Promise<AdminPanelContext>}
 */
export async function requireAdminPanelContext() {
  const context = await resolveAdminPanelContext();
  if (!context) {
    window.location.assign(GARSON_ADMIN_LOGIN_PATH);
    throw new Error('Yetkisiz erişim');
  }
  return context;
}
