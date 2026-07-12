import { getRestaurantReservationData } from '../../data-service.js';
import { escapeHtml } from '../shared/format.js';
import { renderMetricGrid } from '../shared/cards.js';
import { renderPageHeader, renderPanelSection } from '../shared/shell.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

const TABLE_LABELS = ['Masa 1', 'Masa 2', 'Masa 3', 'Masa 4', 'Masa 5', 'Masa 6', 'Masa 7', 'Masa 8'];

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<{ tables: { name: string, status: string, guests: string, qr: string }[] }>}
 */
export async function loadTablesModuleData(context) {
  const result = await getRestaurantReservationData({
    restaurantId: context.restaurantId
  });

  const seated = new Set(
    (result.data?.reservations || [])
      .filter((item) => String(item.status).toLowerCase() === 'seated')
      .map((item) => item.customerName)
  );

  const active = (result.data?.reservations || []).filter((item) => {
    const status = String(item.status).toLowerCase();
    return status === 'confirmed' || status === 'seated';
  });

  const tables = TABLE_LABELS.map((name, index) => {
    const reservation = active[index % Math.max(active.length, 1)];
    const occupied = index < active.length;
    return {
      name,
      status: occupied ? (seated.has(reservation?.customerName || '') ? 'Dolu' : 'Rezerve') : 'Boş',
      guests: occupied ? `${reservation?.guestCount || 0} kişi` : '—',
      qr: 'Aktif'
    };
  });

  return { tables };
}

/**
 * @param {AdminPanelContext} context
 * @param {{ tables: { name: string, status: string, guests: string, qr: string }[] }} data
 * @returns {string}
 */
export function renderTablesPage(context, data) {
  const occupied = data.tables.filter((table) => table.status !== 'Boş').length;
  const metrics = renderMetricGrid([
    { id: 'total', label: 'Toplam masa', value: String(data.tables.length) },
    { id: 'occupied', label: 'Dolu / Rezerve', value: String(occupied) },
    { id: 'free', label: 'Boş masa', value: String(data.tables.length - occupied) },
    { id: 'qr', label: 'QR durumu', value: 'Aktif' }
  ]);

  const cards = data.tables
    .map(
      (table) => `
      <article class="gai-admin-table-card gai-card gai-card--interactive">
        <h3 class="gai-admin-table-card__title">${escapeHtml(table.name)}</h3>
        <p class="gai-admin-table-card__status">${escapeHtml(table.status)}</p>
        <p class="gai-admin-table-card__meta">${escapeHtml(table.guests)}</p>
        <span class="gai-badge gai-badge--success">QR ${escapeHtml(table.qr)}</span>
      </article>
    `.trim()
    )
    .join('');

  return `
    ${renderPageHeader({
      title: 'Masalar',
      subtitle: 'Doluluk ve QR durumu',
      demo: context.mode === 'demo'
    })}
    ${metrics}
    ${renderPanelSection(`<div class="gai-admin-table-grid">${cards}</div>`)}
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountTablesPage(root, context) {
  root.innerHTML = '<p class="gai-admin-empty">Masalar yükleniyor…</p>';
  const data = await loadTablesModuleData(context);
  root.innerHTML = renderTablesPage(context, data);
}
