import {
  getRestaurantOrderData,
  updateRestaurantOrderStatus
} from '../../data-service.js';
import { KITCHEN_STATUS_LABELS, ORDER_STATUS_LABELS } from '../shared/constants.js';
import { escapeHtml, formatCurrencyTry, formatDateTr } from '../shared/format.js';
import { renderPageHeader, renderPanelSection } from '../shared/shell.js';
import { bindTableSearch, filterTableRows, renderDataTable, sortTableRows } from '../shared/table.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @param {import('../../admin-management.js').NormalizedAdminOrder} order
 * @returns {Record<string, unknown>}
 */
export function mapOrderToTableRow(order) {
  const statusKey = String(order.kitchenStatus || 'pending').toLowerCase();
  const statusLabel = KITCHEN_STATUS_LABELS[statusKey] || ORDER_STATUS_LABELS[statusKey] || statusKey;
  const itemsLabel = order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ');

  return {
    id: order.id,
    orderNo: order.orderNo,
    items: itemsLabel,
    total: order.totalLabel,
    status: statusLabel,
    statusKey,
    kitchenHref: order.kitchenHref,
    _order: order
  };
}

/**
 * @param {AdminPanelContext} context
 * @param {{ status?: string, search?: string, sort?: string }} [filters]
 * @returns {Promise<{ rows: Record<string, unknown>[], source: string, error: string|null }>}
 */
export async function loadOrdersModuleData(context, filters = {}) {
  const result = await getRestaurantOrderData({
    restaurantId: context.restaurantId,
    slug: context.slug
  });

  let rows = (result.data?.orders || []).map(mapOrderToTableRow);

  if (filters.status) {
    rows = rows.filter((row) => row.statusKey === filters.status);
  }

  if (filters.search) {
    rows = filterTableRows(rows, filters.search, ['orderNo', 'items', 'status']);
  }

  if (filters.sort === 'total-desc') {
    rows = sortTableRows(rows, 'total', 'desc');
  } else if (filters.sort === 'orderNo') {
    rows = sortTableRows(rows, 'orderNo', 'asc');
  }

  return { rows, source: result.source, error: result.error };
}

/**
 * @param {AdminPanelContext} context
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
export function renderOrderDetailPanel(context, row) {
  const order = /** @type {import('../../admin-management.js').NormalizedAdminOrder} */ (
    row._order
  );
  const items = order.items
    .map((item) => `<li>${escapeHtml(String(item.quantity))}× ${escapeHtml(item.name)}</li>`)
    .join('');

  return `
    <aside class="gai-admin-detail" id="gai-admin-order-detail">
      <header class="gai-admin-detail__header">
        <h2 class="gai-admin-detail__title">${escapeHtml(order.orderNo)}</h2>
        <button type="button" class="gai-btn gai-btn--ghost gai-btn--sm" data-close-detail>×</button>
      </header>
      <dl class="gai-admin-detail__meta">
        <div><dt>Durum</dt><dd>${escapeHtml(String(row.status))}</dd></div>
        <div><dt>Toplam</dt><dd>${escapeHtml(order.totalLabel)}</dd></div>
      </dl>
      <h3 class="gai-admin-detail__subtitle">Kalemler</h3>
      <ul class="gai-admin-detail__list">${items}</ul>
      <div class="gai-admin-detail__actions">
        <button type="button" class="gai-btn gai-btn--secondary gai-btn--sm" data-order-status="preparing">Hazırlanıyor</button>
        <button type="button" class="gai-btn gai-btn--primary gai-btn--sm" data-order-status="ready">Hazır</button>
        <button type="button" class="gai-btn gai-btn--accent gai-btn--sm" data-order-status="served">Teslim edildi</button>
        <a class="gai-btn gai-btn--ghost gai-btn--sm" href="${escapeHtml(order.kitchenHref)}">Mutfak ekranı</a>
      </div>
      <p class="gai-admin-detail__hint" hidden data-order-feedback role="status"></p>
    </aside>
  `.trim();
}

/**
 * @param {AdminPanelContext} context
 * @param {{ rows: Record<string, unknown>[], source: string, error: string|null }} data
 * @returns {string}
 */
export function renderOrdersPage(context, data) {
  const table = renderDataTable({
    id: 'gai-admin-orders-table',
    searchPlaceholder: 'Sipariş no veya ürün ara…',
    emptyMessage: 'Sipariş kaydı bulunamadı.',
    columns: [
      { key: 'orderNo', label: 'Sipariş', sortable: true },
      { key: 'items', label: 'Kalemler' },
      { key: 'total', label: 'Tutar', sortable: true },
      { key: 'status', label: 'Durum' },
      {
        key: 'actions',
        label: '',
        sortable: false
      }
    ],
    rows: data.rows.map((row) => ({
      ...row,
      actions: { __html: `<button type="button" class="gai-btn gai-btn--ghost gai-btn--sm" data-order-detail="${escapeHtml(String(row.id))}">Detay</button>` }
    }))
  });

  return `
    ${renderPageHeader({
      title: 'Siparişler',
      subtitle: `${data.rows.length} kayıt · kaynak: ${data.source}`,
      demo: context.mode === 'demo'
    })}
    <div class="gai-admin-filters">
      <label>
        <span class="gai-admin-filter-label">Durum</span>
        <select class="gai-admin-select" data-orders-filter="status">
          <option value="">Tümü</option>
          <option value="pending">Bekliyor</option>
          <option value="preparing">Hazırlanıyor</option>
          <option value="ready">Hazır</option>
          <option value="served">Teslim edildi</option>
        </select>
      </label>
      <label>
        <span class="gai-admin-filter-label">Sıralama</span>
        <select class="gai-admin-select" data-orders-filter="sort">
          <option value="">Varsayılan</option>
          <option value="orderNo">Sipariş no</option>
          <option value="total-desc">Tutar (yüksek)</option>
        </select>
      </label>
    </div>
    ${data.error ? `<p class="gai-admin-notice gai-admin-notice--error">${escapeHtml(data.error)}</p>` : ''}
    ${renderPanelSection(table)}
    <div id="gai-admin-order-detail-root"></div>
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountOrdersPage(root, context) {
  const render = async (filters = {}) => {
    root.innerHTML = '<p class="gai-admin-empty">Siparişler yükleniyor…</p>';
    const data = await loadOrdersModuleData(context, filters);
    root.innerHTML = renderOrdersPage(context, data);
    bindTableSearch(root, 'gai-admin-orders-table');
    bindOrdersInteractions(root, context, render);
  };

  await render();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 * @param {(filters: Record<string, string>) => Promise<void>} rerender
 */
function bindOrdersInteractions(root, context, rerender) {
  root.querySelectorAll('[data-orders-filter]').forEach((element) => {
    element.addEventListener('change', async () => {
      const statusEl = root.querySelector('[data-orders-filter="status"]');
      const sortEl = root.querySelector('[data-orders-filter="sort"]');
      await rerender({
        status:
          statusEl instanceof HTMLSelectElement ? statusEl.value : '',
        sort: sortEl instanceof HTMLSelectElement ? sortEl.value : ''
      });
    });
  });

  root.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const detailId = target.getAttribute('data-order-detail');
    if (detailId) {
      const data = await loadOrdersModuleData(context);
      const row = data.rows.find((item) => String(item.id) === detailId);
      const detailRoot = root.querySelector('#gai-admin-order-detail-root');
      if (row && detailRoot) {
        detailRoot.innerHTML = renderOrderDetailPanel(context, row);
        bindOrderDetailActions(detailRoot, context, row, rerender);
      }
      return;
    }

    if (target.matches('[data-close-detail]')) {
      const detailRoot = root.querySelector('#gai-admin-order-detail-root');
      if (detailRoot) detailRoot.innerHTML = '';
    }
  });
}

/**
 * @param {HTMLElement} detailRoot
 * @param {AdminPanelContext} context
 * @param {Record<string, unknown>} row
 * @param {(filters: Record<string, string>) => Promise<void>} rerender
 */
function bindOrderDetailActions(detailRoot, context, row, rerender) {
  detailRoot.querySelectorAll('[data-order-status]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!(button instanceof HTMLButtonElement)) return;
      const status = button.getAttribute('data-order-status');
      if (!status) return;

      const feedback = detailRoot.querySelector('[data-order-feedback]');
      const result = await updateRestaurantOrderStatus({
        restaurantId: context.restaurantId,
        orderId: String(row.id),
        status
      });

      if (feedback instanceof HTMLElement) {
        feedback.hidden = false;
        feedback.textContent = result.error
          ? result.error
          : 'Sipariş durumu güncellendi.';
        feedback.className = `gai-admin-detail__hint gai-admin-notice gai-admin-notice--${result.error ? 'error' : 'success'}`;
      }

      if (!result.error) {
        await rerender();
      }
    });
  });
}
