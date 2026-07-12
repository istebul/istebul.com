import { getRestaurantCustomerData } from '../../data-service.js';
import { analyzeCustomers } from '../../growth/customer-analyzer.js';
import { escapeHtml, formatCurrencyTry, formatDateTr } from '../shared/format.js';
import { renderPageHeader, renderPanelSection } from '../shared/shell.js';
import { bindTableSearch, renderDataTable } from '../shared/table.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @param {unknown} customer
 * @param {Map<string, string>} aiTags
 * @returns {Record<string, unknown>}
 */
export function mapCustomerToRow(customer, aiTags) {
  const row = /** @type {Record<string, unknown>} */ (
    customer && typeof customer === 'object' ? customer : {}
  );
  const id = String(row.id || '');
  const tag = aiTags.get(id) || 'Standart';

  return {
    id,
    name: String(row.name || '—'),
    phone: String(row.phone || '—'),
    totalOrders: String(row.totalOrders ?? 0),
    totalSpent: formatCurrencyTry(Number(row.totalSpent ?? 0)),
    lastVisit: formatDateTr(row.lastOrderAt),
    aiTag: tag
  };
}

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<{ rows: Record<string, unknown>[], error: string|null }>}
 */
export async function loadCustomersModuleData(context) {
  const result = await getRestaurantCustomerData({
    restaurantId: context.restaurantId
  });

  const customers = result.data?.customers || [];
  const analysis = analyzeCustomers(customers, [], {
    restaurantId: context.restaurantId
  });

  /** @type {Map<string, string>} */
  const aiTags = new Map();
  for (const vip of analysis.vipCustomers) aiTags.set(vip.id, 'VIP');
  for (const repeat of analysis.repeatCustomers) {
    if (!aiTags.has(repeat.id)) aiTags.set(repeat.id, 'Sadık');
  }
  for (const inactive of analysis.inactiveCustomers) {
    if (!aiTags.has(inactive.id)) aiTags.set(inactive.id, 'Pasif');
  }

  const rows = customers.map((customer) => mapCustomerToRow(customer, aiTags));
  return { rows, error: result.error };
}

/**
 * @param {AdminPanelContext} context
 * @param {{ rows: Record<string, unknown>[], error: string|null }} data
 * @returns {string}
 */
export function renderCustomersPage(context, data) {
  const table = renderDataTable({
    id: 'gai-admin-customers-table',
    searchPlaceholder: 'Müşteri adı veya telefon ara…',
    emptyMessage: 'Müşteri kaydı bulunamadı.',
    columns: [
      { key: 'name', label: 'Müşteri', sortable: true },
      { key: 'phone', label: 'Telefon' },
      { key: 'totalOrders', label: 'Sipariş' },
      { key: 'totalSpent', label: 'Toplam harcama' },
      { key: 'lastVisit', label: 'Son ziyaret' },
      { key: 'aiTag', label: 'AI etiketi' }
    ],
    rows: data.rows
  });

  return `
    ${renderPageHeader({
      title: 'Müşteriler',
      subtitle: `${data.rows.length} kayıtlı müşteri`,
      demo: context.mode === 'demo'
    })}
    ${data.error ? `<p class="gai-admin-notice gai-admin-notice--error">${escapeHtml(data.error)}</p>` : ''}
    ${renderPanelSection(table)}
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountCustomersPage(root, context) {
  root.innerHTML = '<p class="gai-admin-empty">Müşteriler yükleniyor…</p>';
  const data = await loadCustomersModuleData(context);
  root.innerHTML = renderCustomersPage(context, data);
  bindTableSearch(root, 'gai-admin-customers-table');
}
