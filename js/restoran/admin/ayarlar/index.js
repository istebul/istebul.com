import { getRestaurant } from '../../database/restaurant-repository.js';
import { getGarsonDataClient, isGarsonSupabaseClientAvailable } from '../../data-service.js';
import { getMockDemoTenantPayload } from '../../admin-portal.js';
import { normalizeRestaurantSettings, normalizeRestaurantTenant } from '../../tenant.js';
import { escapeHtml } from '../shared/format.js';
import { renderPageHeader, renderPanelSection } from '../shared/shell.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<{ restaurant: Record<string, string>, settings: Record<string, string> }>}
 */
export async function loadSettingsModuleData(context) {
  const fallback = getMockDemoTenantPayload();
  const settings = normalizeRestaurantSettings(fallback.settings);
  let restaurant = normalizeRestaurantTenant(fallback.restaurant);

  const client = getGarsonDataClient();
  if (isGarsonSupabaseClientAvailable(client) && context.mode === 'live') {
    try {
      const row = await getRestaurant({ restaurantId: context.restaurantId, client });
      if (row) {
        restaurant = normalizeRestaurantTenant(row);
      }
    } catch {
      // Keep fallback tenant display.
    }
  }

  return {
    restaurant: {
      name: restaurant.name,
      slug: restaurant.slug,
      status: restaurant.status,
      plan: restaurant.plan,
      hours: '10:00 – 23:00'
    },
    settings: {
      whatsapp: settings.whatsappEnabled ? 'Açık' : 'Kapalı',
      preorder: settings.preorderEnabled ? 'Açık' : 'Kapalı',
      kitchen: settings.kitchenEnabled ? 'Açık' : 'Kapalı',
      ai: settings.aiEnabled ? 'Açık' : 'Kapalı'
    }
  };
}

/**
 * @param {Record<string, string>} rows
 * @returns {string}
 */
function renderDefinitionList(rows) {
  return `
    <dl class="gai-admin-details">
      ${Object.entries(rows)
        .map(
          ([key, value]) => `
        <div>
          <dt>${escapeHtml(key)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `.trim()
        )
        .join('')}
    </dl>
  `.trim();
}

/**
 * @param {AdminPanelContext} context
 * @param {Awaited<ReturnType<typeof loadSettingsModuleData>>} data
 * @returns {string}
 */
export function renderSettingsPage(context, data) {
  return `
    ${renderPageHeader({
      title: 'Ayarlar',
      subtitle: 'Restoran ve entegrasyon yapılandırması',
      demo: context.mode === 'demo'
    })}
    ${renderPanelSection(`<h2 class="gai-section-title">Restoran bilgileri</h2>${renderDefinitionList({
      'Restoran adı': data.restaurant.name,
      Slug: data.restaurant.slug,
      Durum: data.restaurant.status,
      Plan: data.restaurant.plan,
      'Çalışma saatleri': data.restaurant.hours
    })}`)}
    ${renderPanelSection(`<h2 class="gai-section-title">AI ayarları</h2>${renderDefinitionList({
      'AI motoru': data.settings.ai
    })}`)}
    ${renderPanelSection(`<h2 class="gai-section-title">WhatsApp ayarları</h2>${renderDefinitionList({
      WhatsApp: data.settings.whatsapp,
      'Ön sipariş': data.settings.preorder,
      Mutfak: data.settings.kitchen
    })}`)}
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountSettingsPage(root, context) {
  root.innerHTML = '<p class="gai-admin-empty">Ayarlar yükleniyor…</p>';
  const data = await loadSettingsModuleData(context);
  root.innerHTML = renderSettingsPage(context, data);
}
