import {
  getRestaurantMenuData,
  saveRestaurantMenuItem
} from '../../data-service.js';
import { escapeHtml } from '../shared/format.js';
import { renderPageHeader, renderPanelSection } from '../shared/shell.js';
import { bindTableSearch, renderDataTable } from '../shared/table.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @param {import('../../admin-management.js').NormalizedAdminMenuItem} item
 * @param {string} categoryName
 * @returns {Record<string, unknown>}
 */
export function mapMenuItemToRow(item, categoryName) {
  return {
    id: item.id,
    category: categoryName,
    name: item.name,
    price: item.priceLabel,
    status: item.active ? 'Aktif' : 'Pasif',
    active: item.active,
    stock: item.stockLabel,
    _item: item
  };
}

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<{ rows: Record<string, unknown>[], error: string|null }>}
 */
export async function loadMenuModuleData(context) {
  const result = await getRestaurantMenuData({
    restaurantId: context.restaurantId
  });

  const rows = [];
  for (const category of result.data?.categories || []) {
    for (const item of category.items) {
      rows.push(mapMenuItemToRow(item, category.name));
    }
  }

  return { rows, error: result.error };
}

/**
 * @param {AdminPanelContext} context
 * @param {{ rows: Record<string, unknown>[], error: string|null }} data
 * @returns {string}
 */
export function renderMenuPage(context, data) {
  const table = renderDataTable({
    id: 'gai-admin-menu-table',
    searchPlaceholder: 'Ürün veya kategori ara…',
    emptyMessage: 'Menü kaydı bulunamadı.',
    columns: [
      { key: 'category', label: 'Kategori', sortable: true },
      { key: 'name', label: 'Ürün', sortable: true },
      { key: 'price', label: 'Fiyat' },
      { key: 'status', label: 'Durum' },
      { key: 'stock', label: 'Stok' },
      {
        key: 'toggle',
        label: '',
        sortable: false
      }
    ],
    rows: data.rows.map((row) => ({
      ...row,
      toggle: {
        __html: `<button type="button" class="gai-btn gai-btn--ghost gai-btn--sm" data-menu-toggle="${escapeHtml(String(row.id))}" data-active="${row.active ? '1' : '0'}">${row.active ? 'Pasifleştir' : 'Aktifleştir'}</button>`
      }
    }))
  });

  return `
    ${renderPageHeader({
      title: 'Menü',
      subtitle: `${data.rows.length} ürün`,
      demo: context.mode === 'demo'
    })}
    ${data.error ? `<p class="gai-admin-notice gai-admin-notice--error">${escapeHtml(data.error)}</p>` : ''}
    ${renderPanelSection(table)}
    <p class="gai-admin-notice gai-admin-notice--info" id="gai-admin-menu-feedback" hidden role="status"></p>
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountMenuPage(root, context) {
  const render = async () => {
    root.innerHTML = '<p class="gai-admin-empty">Menü yükleniyor…</p>';
    const data = await loadMenuModuleData(context);
    root.innerHTML = renderMenuPage(context, data);
    bindTableSearch(root, 'gai-admin-menu-table');
    bindMenuToggle(root, context, render);
  };

  await render();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 * @param {() => Promise<void>} rerender
 */
function bindMenuToggle(root, context, rerender) {
  root.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const itemId = target.getAttribute('data-menu-toggle');
    if (!itemId) return;

    const data = await loadMenuModuleData(context);
    const row = data.rows.find((item) => String(item.id) === itemId);
    const menuItem = row?._item;
    if (!menuItem) return;

    const feedback = root.querySelector('#gai-admin-menu-feedback');
    const result = await saveRestaurantMenuItem({
      restaurantId: context.restaurantId,
      item: {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        active: !menuItem.active,
        stockStatus: menuItem.stockStatus
      }
    });

    if (feedback instanceof HTMLElement) {
      feedback.hidden = false;
      feedback.textContent = result.error || 'Ürün durumu güncellendi.';
      feedback.className = `gai-admin-notice gai-admin-notice--${result.error ? 'error' : 'success'}`;
    }

    if (!result.error) await rerender();
  });
}
