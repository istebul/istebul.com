import { getRestaurantOrderData, getRestaurantReservationData } from '../../data-service.js';
import { subscribeRestaurantTable } from '../../database/realtime-service.js';
import { escapeHtml, formatDateTr } from '../shared/format.js';
import { renderPageHeader } from '../shared/shell.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @typedef {Object} AdminNotification
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string} time
 * @property {string} tone
 */

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<AdminNotification[]>}
 */
export async function loadNotificationsModuleData(context) {
  const [ordersResult, reservationsResult] = await Promise.all([
    getRestaurantOrderData({ restaurantId: context.restaurantId, slug: context.slug }),
    getRestaurantReservationData({ restaurantId: context.restaurantId })
  ]);

  /** @type {AdminNotification[]} */
  const notifications = [];

  for (const order of (ordersResult.data?.orders || []).slice(0, 5)) {
    const raw =
      order.raw && typeof order.raw === 'object'
        ? /** @type {Record<string, unknown>} */ (order.raw)
        : {};
    notifications.push({
      id: `order-${order.id}`,
      title: `Yeni sipariş: ${order.orderNo}`,
      body: order.items.map((item) => `${item.quantity}× ${item.name}`).join(', '),
      time: formatDateTr(raw.created_at ?? raw.createdAt),
      tone: 'info'
    });
  }

  for (const reservation of (reservationsResult.data?.reservations || []).slice(0, 5)) {
    notifications.push({
      id: `res-${reservation.id}`,
      title: `Rezervasyon: ${reservation.customerName}`,
      body: `${reservation.guestCount} kişi · ${reservation.time || '—'}`,
      time: formatDateTr(reservation.date),
      tone: 'primary'
    });
  }

  return notifications;
}

/**
 * @param {AdminNotification[]} notifications
 * @returns {string}
 */
export function renderNotificationsList(notifications) {
  if (!notifications.length) {
    return '<p class="gai-admin-empty">Bildirim bulunamadı.</p>';
  }

  return `
    <ul class="gai-admin-notifications">
      ${notifications
        .map(
          (item) => `
        <li class="gai-admin-notification gai-card gai-admin-notification--${escapeHtml(item.tone)}">
          <div>
            <p class="gai-admin-notification__title">${escapeHtml(item.title)}</p>
            <p class="gai-admin-notification__body">${escapeHtml(item.body)}</p>
          </div>
          <time class="gai-admin-notification__time">${escapeHtml(item.time)}</time>
        </li>
      `.trim()
        )
        .join('')}
    </ul>
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountNotificationsPage(root, context) {
  const listRoot = () => root.querySelector('[data-notifications-list]');

  const render = async () => {
    const list = listRoot();
    if (list) list.innerHTML = '<p class="gai-admin-empty">Bildirimler yükleniyor…</p>';
    const notifications = await loadNotificationsModuleData(context);
    if (list) list.innerHTML = renderNotificationsList(notifications);
  };

  root.innerHTML = `
    ${renderPageHeader({
      title: 'Bildirimler',
      subtitle: 'Gerçek zamanlı operasyon bildirimleri',
      demo: context.mode === 'demo'
    })}
    <div data-notifications-list></div>
  `.trim();

  await render();

  if (context.mode === 'live') {
    try {
      subscribeRestaurantTable({
        restaurantId: context.restaurantId,
        table: 'orders',
        suffix: 'admin-notifications',
        callbacks: {
          onInsert: () => {
            render();
          },
          onUpdate: () => {
            render();
          }
        }
      });
    } catch {
      // Realtime optional when client unavailable.
    }
  }
}
