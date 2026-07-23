import { getRestaurantOrderData } from '../../data-service.js';
import { countOrdersByKitchenStatus } from '../dashboard/metrics.js';
import { KITCHEN_STATUS_LABELS } from '../shared/constants.js';
import { escapeHtml } from '../shared/format.js';
import { renderPageHeader } from '../shared/shell.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<{ columns: { id: string, label: string, orders: { id: string, title: string, meta: string }[] }[] }>}
 */
export async function loadKitchenModuleData(context) {
  const result = await getRestaurantOrderData({
    restaurantId: context.restaurantId,
    slug: context.slug
  });

  const orders = result.data?.orders || [];
  const counts = countOrdersByKitchenStatus(orders);

  const buckets = [
    { id: 'active', label: 'Aktif siparişler', keys: ['pending', 'submitted'] },
    { id: 'preparing', label: KITCHEN_STATUS_LABELS.preparing, keys: ['preparing'] },
    { id: 'ready', label: KITCHEN_STATUS_LABELS.ready, keys: ['ready'] },
    { id: 'served', label: KITCHEN_STATUS_LABELS.served, keys: ['served', 'completed'] }
  ];

  const columns = buckets.map((bucket) => ({
    id: bucket.id,
    label: bucket.label,
    orders: orders
      .filter((order) => bucket.keys.includes(String(order.kitchenStatus).toLowerCase()))
      .map((order) => ({
        id: order.id,
        title: order.orderNo,
        meta: order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')
      }))
  }));

  return { columns, counts };
}

/**
 * @param {AdminPanelContext} context
 * @param {{ columns: { id: string, label: string, orders: { id: string, title: string, meta: string }[] }[], counts: ReturnType<typeof countOrdersByKitchenStatus> }} data
 * @returns {string}
 */
export function renderKitchenPage(context, data) {
  const kitchenHref = `/garson/mutfak/?businessId=${encodeURIComponent(context.slug)}`;
  const columns = data.columns
    .map((column) => {
      const cards = column.orders.length
        ? column.orders
            .map(
              (order) => `
            <article class="gai-admin-kitchen-card gai-card">
              <h3>${escapeHtml(order.title)}</h3>
              <p>${escapeHtml(order.meta)}</p>
            </article>
          `.trim()
            )
            .join('')
        : '<p class="gai-admin-empty">Sipariş yok</p>';

      return `
        <section class="gai-admin-kitchen-column gai-card">
          <header class="gai-admin-kitchen-column__head">
            <h2>${escapeHtml(column.label)}</h2>
            <span class="gai-badge gai-badge--primary">${column.orders.length}</span>
          </header>
          <div class="gai-admin-kitchen-column__body">${cards}</div>
        </section>
      `.trim();
    })
    .join('');

  return `
    ${renderPageHeader({
      title: 'Mutfak',
      subtitle: `${data.counts.preparing} hazırlanıyor · ${data.counts.ready} hazır`,
      demo: context.mode === 'demo'
    })}
    <div class="gai-admin-kitchen-actions">
      <a class="gai-btn gai-btn--primary" href="${escapeHtml(kitchenHref)}">KDS ekranını aç</a>
    </div>
    <div class="gai-admin-kitchen-board">${columns}</div>
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountKitchenPage(root, context) {
  root.innerHTML = '<p class="gai-admin-empty">Mutfak verileri yükleniyor…</p>';
  const data = await loadKitchenModuleData(context);
  root.innerHTML = renderKitchenPage(context, data);
}
