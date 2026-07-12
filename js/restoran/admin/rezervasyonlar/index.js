import { getRestaurantReservationData } from '../../data-service.js';
import { escapeHtml, formatDateTr, formatTimeTr } from '../shared/format.js';
import { renderPageHeader, renderPanelSection } from '../shared/shell.js';
import { bindTableSearch, renderDataTable } from '../shared/table.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @param {import('../../admin-management.js').NormalizedAdminReservation} item
 * @returns {Record<string, unknown>}
 */
export function mapReservationToRow(item) {
  return {
    id: item.id,
    customerName: item.customerName,
    date: formatDateTr(item.date),
    time: formatTimeTr(item.time),
    guestCount: String(item.guestCount),
    status: item.statusLabel,
    statusKey: item.status,
    table: '—',
    _item: item
  };
}

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<{ upcoming: Record<string, unknown>[], all: Record<string, unknown>[], error: string|null }>}
 */
export async function loadReservationsModuleData(context) {
  const result = await getRestaurantReservationData({
    restaurantId: context.restaurantId
  });

  const rows = (result.data?.reservations || []).map(mapReservationToRow);
  const upcoming = rows.filter((row) => {
    const key = String(row.statusKey || '').toLowerCase();
    return key === 'pending' || key === 'confirmed';
  });

  return { upcoming, all: rows, error: result.error };
}

/**
 * @param {Record<string, unknown>[]} rows
 * @returns {string}
 */
export function renderReservationCalendar(rows) {
  if (!rows.length) {
    return '<p class="gai-admin-empty">Takvimde gösterilecek rezervasyon yok.</p>';
  }

  const cells = rows
    .slice(0, 14)
    .map(
      (row) => `
      <article class="gai-admin-calendar-cell gai-card">
        <p class="gai-admin-calendar-cell__date">${escapeHtml(String(row.date))}</p>
        <p class="gai-admin-calendar-cell__time">${escapeHtml(String(row.time))}</p>
        <p class="gai-admin-calendar-cell__name">${escapeHtml(String(row.customerName))}</p>
        <p class="gai-admin-calendar-cell__meta">${escapeHtml(String(row.guestCount))} kişi · ${escapeHtml(String(row.status))}</p>
        <button type="button" class="gai-btn gai-btn--ghost gai-btn--sm" data-assign-table="${escapeHtml(String(row.id))}">Masa ata</button>
      </article>
    `.trim()
    )
    .join('');

  return `<div class="gai-admin-calendar">${cells}</div>`;
}

/**
 * @param {AdminPanelContext} context
 * @param {{ upcoming: Record<string, unknown>[], all: Record<string, unknown>[], error: string|null }} data
 * @returns {string}
 */
export function renderReservationsPage(context, data) {
  const table = renderDataTable({
    id: 'gai-admin-reservations-table',
    searchPlaceholder: 'Müşteri veya tarih ara…',
    emptyMessage: 'Rezervasyon kaydı bulunamadı.',
    columns: [
      { key: 'customerName', label: 'Müşteri', sortable: true },
      { key: 'date', label: 'Tarih', sortable: true },
      { key: 'time', label: 'Saat' },
      { key: 'guestCount', label: 'Kişi' },
      { key: 'status', label: 'Durum' },
      { key: 'table', label: 'Masa' }
    ],
    rows: data.all
  });

  return `
    ${renderPageHeader({
      title: 'Rezervasyonlar',
      subtitle: `${data.upcoming.length} yaklaşan rezervasyon`,
      demo: context.mode === 'demo'
    })}
    <section class="gai-admin-section">
      <h2 class="gai-section-title">Yaklaşan rezervasyonlar</h2>
      ${renderReservationCalendar(data.upcoming)}
    </section>
    ${data.error ? `<p class="gai-admin-notice gai-admin-notice--error">${escapeHtml(data.error)}</p>` : ''}
    ${renderPanelSection(`<h2 class="gai-section-title">Liste görünümü</h2>${table}`)}
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountReservationsPage(root, context) {
  root.innerHTML = '<p class="gai-admin-empty">Rezervasyonlar yükleniyor…</p>';
  const data = await loadReservationsModuleData(context);
  root.innerHTML = renderReservationsPage(context, data);
  bindTableSearch(root, 'gai-admin-reservations-table');

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches('[data-assign-table]')) {
      const id = target.getAttribute('data-assign-table');
      window.alert(`Masa atama akışı rezervasyon ${id} için panelde hazırlanıyor.`);
    }
  });
}
