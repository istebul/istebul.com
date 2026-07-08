import {
  DEMO_RESTAURANT_SLUG,
  normalizeRestaurantTenant
} from './tenant.js';
import {
  GARSON_ADMIN_DEMO_SESSION_KEY,
  GARSON_ADMIN_LOGIN_PATH
} from './admin-portal.js';
import { formatPreorderStatusLabel } from './restoran-api.js';

export const DEMO_RESTAURANT_ID = 'a0000000-0000-4000-8000-00000000cafe';
export const GARSON_MANAGEMENT_MENU_PATH = '/garson/panel/menu/';
export const GARSON_MANAGEMENT_RESERVATIONS_PATH = '/garson/panel/rezervasyonlar/';
export const GARSON_MANAGEMENT_ORDERS_PATH = '/garson/panel/siparisler/';

/** @type {Record<string, string>} */
export const RESERVATION_STATUS_LABELS = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  seated: 'Masada',
  completed: 'Tamamlandı',
  cancelled: 'İptal'
};

/** @type {Record<string, string>} */
export const STOCK_STATUS_LABELS = {
  in_stock: 'Stokta',
  low_stock: 'Az stok',
  out_of_stock: 'Tükendi'
};

/**
 * @typedef {Object} NormalizedAdminMenuItem
 * @property {string} id
 * @property {string} restaurantId
 * @property {string} name
 * @property {number|null} price
 * @property {string} priceLabel
 * @property {boolean} active
 * @property {string} stockStatus
 * @property {string} stockLabel
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedAdminMenuCategory
 * @property {string} id
 * @property {string} restaurantId
 * @property {string} name
 * @property {NormalizedAdminMenuItem[]} items
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedAdminMenu
 * @property {string} restaurantId
 * @property {NormalizedAdminMenuCategory[]} categories
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedAdminReservation
 * @property {string} id
 * @property {string} restaurantId
 * @property {string} customerName
 * @property {string} date
 * @property {string} time
 * @property {number} guestCount
 * @property {string} status
 * @property {string} statusLabel
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedAdminReservations
 * @property {string} restaurantId
 * @property {NormalizedAdminReservation[]} reservations
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedAdminOrderItem
 * @property {string} name
 * @property {number} quantity
 */

/**
 * @typedef {Object} NormalizedAdminOrder
 * @property {string} id
 * @property {string} restaurantId
 * @property {string} orderNo
 * @property {NormalizedAdminOrderItem[]} items
 * @property {number|null} total
 * @property {string} totalLabel
 * @property {string} kitchenStatus
 * @property {string} kitchenStatusLabel
 * @property {string} kitchenHref
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedAdminOrders
 * @property {string} restaurantId
 * @property {NormalizedAdminOrder[]} orders
 * @property {unknown} raw
 */

/**
 * @param {unknown} value
 * @param {boolean} [fallback=true]
 * @returns {boolean}
 */
function normalizeActiveFlag(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === '0' || value === 'false') return false;
  if (value === 1 || value === '1' || value === 'true') return true;
  return fallback;
}

/**
 * @param {string} [status]
 * @returns {string}
 */
export function normalizeStockStatus(status) {
  const key = String(status || 'in_stock').trim().toLowerCase();
  return STOCK_STATUS_LABELS[key] ? key : 'in_stock';
}

/**
 * @param {string} [status]
 * @returns {string}
 */
export function normalizeReservationStatus(status) {
  const key = String(status || 'pending').trim().toLowerCase();
  return RESERVATION_STATUS_LABELS[key] ? key : 'pending';
}

/**
 * @param {unknown} item
 * @param {string} restaurantId
 * @returns {NormalizedAdminMenuItem|null}
 */
function normalizeAdminMenuItem(item, restaurantId) {
  const row = /** @type {Record<string, unknown>} */ (
    item && typeof item === 'object' ? item : {}
  );

  const id = String(row.id ?? row.menu_item_id ?? '').trim();
  const name = String(row.name ?? row.product_name ?? '').trim();
  if (!id || !name) return null;

  const itemRestaurantId = String(
    row.restaurant_id ?? row.restaurantId ?? restaurantId ?? ''
  ).trim();

  const priceRaw = row.price ?? row.unit_price;
  const priceNum = priceRaw != null && priceRaw !== '' ? Number(priceRaw) : null;
  const price = priceNum != null && Number.isFinite(priceNum) ? priceNum : null;
  const priceLabel =
    String(row.price_label ?? row.priceLabel ?? '').trim() ||
    (price != null ? `${price} TL` : '—');

  const stockStatus = normalizeStockStatus(String(row.stock_status ?? row.stockStatus ?? ''));

  return {
    id,
    restaurantId: itemRestaurantId,
    name,
    price,
    priceLabel,
    active: normalizeActiveFlag(row.active ?? row.is_active, true),
    stockStatus,
    stockLabel: STOCK_STATUS_LABELS[stockStatus],
    raw: item
  };
}

/**
 * @param {unknown} category
 * @param {string} restaurantId
 * @returns {NormalizedAdminMenuCategory|null}
 */
function normalizeAdminMenuCategory(category, restaurantId) {
  const row = /** @type {Record<string, unknown>} */ (
    category && typeof category === 'object' ? category : {}
  );

  const id = String(row.id ?? row.category_id ?? '').trim();
  const name = String(row.name ?? row.title ?? '').trim();
  if (!id || !name) return null;

  const categoryRestaurantId = String(
    row.restaurant_id ?? row.restaurantId ?? restaurantId ?? ''
  ).trim();

  const itemSource = row.items ?? row.products ?? row.menu_items ?? [];
  const items = Array.isArray(itemSource)
    ? itemSource
        .map((item) => normalizeAdminMenuItem(item, categoryRestaurantId))
        .filter((item) => item != null)
    : [];

  return {
    id,
    restaurantId: categoryRestaurantId,
    name,
    items,
    raw: category
  };
}

/**
 * @param {unknown} payload
 * @returns {NormalizedAdminMenu}
 */
export function normalizeAdminMenu(payload) {
  let row = payload;
  let restaurantId = '';

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    restaurantId = String(root.restaurant_id ?? root.restaurantId ?? '').trim();
    if (Array.isArray(root.categories)) {
      row = root.categories;
    } else if (Array.isArray(root.menu)) {
      row = root.menu;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      restaurantId =
        restaurantId || String(data.restaurant_id ?? data.restaurantId ?? '').trim();
      row = data.categories ?? data.menu ?? data;
    }
  }

  if (!restaurantId && Array.isArray(row) && row[0] && typeof row[0] === 'object') {
    const first = /** @type {Record<string, unknown>} */ (row[0]);
    restaurantId = String(first.restaurant_id ?? first.restaurantId ?? '').trim();
  }

  const source = Array.isArray(row) ? row : [];
  const categories = source
    .map((category) => normalizeAdminMenuCategory(category, restaurantId))
    .filter((category) => category != null);

  if (!restaurantId && categories.length) {
    restaurantId = categories[0].restaurantId;
  }

  return {
    restaurantId,
    categories,
    raw: payload
  };
}

/**
 * @param {unknown} reservation
 * @param {string} restaurantId
 * @returns {NormalizedAdminReservation|null}
 */
function normalizeAdminReservationRow(reservation, restaurantId) {
  const row = /** @type {Record<string, unknown>} */ (
    reservation && typeof reservation === 'object' ? reservation : {}
  );

  const id = String(row.id ?? row.reservation_id ?? '').trim();
  const customerName = String(row.customer_name ?? row.customerName ?? '').trim();
  if (!id || !customerName) return null;

  const rowRestaurantId = String(
    row.restaurant_id ?? row.restaurantId ?? restaurantId ?? ''
  ).trim();

  const guestRaw = Number.parseInt(String(row.guest_count ?? row.guestCount ?? '1'), 10);
  const guestCount = Number.isFinite(guestRaw) && guestRaw > 0 ? guestRaw : 1;
  const status = normalizeReservationStatus(String(row.status ?? ''));

  return {
    id,
    restaurantId: rowRestaurantId,
    customerName,
    date: String(row.date ?? '').trim(),
    time: String(row.time ?? '').trim(),
    guestCount,
    status,
    statusLabel: RESERVATION_STATUS_LABELS[status],
    raw: reservation
  };
}

/**
 * @param {unknown} payload
 * @returns {NormalizedAdminReservations}
 */
export function normalizeAdminReservations(payload) {
  let row = payload;
  let restaurantId = '';

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    restaurantId = String(root.restaurant_id ?? root.restaurantId ?? '').trim();
    if (Array.isArray(root.reservations)) {
      row = root.reservations;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      restaurantId =
        restaurantId || String(data.restaurant_id ?? data.restaurantId ?? '').trim();
      row = data.reservations ?? data;
    }
  }

  const source = Array.isArray(row) ? row : [];
  const reservations = source
    .map((item) => normalizeAdminReservationRow(item, restaurantId))
    .filter((item) => item != null);

  if (!restaurantId && reservations.length) {
    restaurantId = reservations[0].restaurantId;
  }

  return {
    restaurantId,
    reservations,
    raw: payload
  };
}

/**
 * @param {unknown} order
 * @param {string} restaurantId
 * @param {string} [slug]
 * @returns {NormalizedAdminOrder|null}
 */
function normalizeAdminOrderRow(order, restaurantId, slug = DEMO_RESTAURANT_SLUG) {
  const row = /** @type {Record<string, unknown>} */ (
    order && typeof order === 'object' ? order : {}
  );

  const id = String(row.id ?? row.order_id ?? row.preorder_id ?? '').trim();
  if (!id) return null;

  const rowRestaurantId = String(
    row.restaurant_id ?? row.restaurantId ?? restaurantId ?? ''
  ).trim();

  const orderNo = String(row.order_no ?? row.orderNo ?? row.code ?? `PO-${id}`).trim();
  const itemSource = row.items ?? row.line_items ?? [];
  const items = Array.isArray(itemSource)
    ? itemSource
        .map((item) => {
          const record = /** @type {Record<string, unknown>} */ (
            item && typeof item === 'object' ? item : {}
          );
          const name = String(record.name ?? record.product_name ?? '').trim();
          if (!name) return null;
          const qtyRaw = Number.parseInt(String(record.quantity ?? record.qty ?? '1'), 10);
          return {
            name,
            quantity: Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1
          };
        })
        .filter((item) => item != null)
    : [];

  const totalRaw = row.total ?? row.total_amount ?? row.totalAmount;
  const totalNum = totalRaw != null && totalRaw !== '' ? Number(totalRaw) : null;
  const total = totalNum != null && Number.isFinite(totalNum) ? totalNum : null;
  const totalLabel =
    String(row.total_label ?? row.totalLabel ?? '').trim() ||
    (total != null ? `${total} TL` : '—');

  const kitchenStatus = String(row.kitchen_status ?? row.kitchenStatus ?? row.status ?? 'submitted')
    .trim()
    .toLowerCase();

  const tenant = normalizeRestaurantTenant({ slug });
  const businessSlug = tenant.slug || slug;

  return {
    id,
    restaurantId: rowRestaurantId,
    orderNo,
    items,
    total,
    totalLabel,
    kitchenStatus,
    kitchenStatusLabel: formatPreorderStatusLabel(kitchenStatus),
    kitchenHref: `/garson/mutfak/?businessId=${encodeURIComponent(businessSlug)}`,
    raw: order
  };
}

/**
 * @param {unknown} payload
 * @param {{ slug?: string }} [options]
 * @returns {NormalizedAdminOrders}
 */
export function normalizeAdminOrders(payload, options = {}) {
  let row = payload;
  let restaurantId = '';

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    restaurantId = String(root.restaurant_id ?? root.restaurantId ?? '').trim();
    if (Array.isArray(root.orders)) {
      row = root.orders;
    } else if (Array.isArray(root.preorders)) {
      row = root.preorders;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      restaurantId =
        restaurantId || String(data.restaurant_id ?? data.restaurantId ?? '').trim();
      row = data.orders ?? data.preorders ?? data;
    }
  }

  const slug = String(options.slug ?? DEMO_RESTAURANT_SLUG).trim().toLowerCase();
  const source = Array.isArray(row) ? row : [];
  const orders = source
    .map((item) => normalizeAdminOrderRow(item, restaurantId, slug))
    .filter((item) => item != null);

  if (!restaurantId && orders.length) {
    restaurantId = orders[0].restaurantId;
  }

  return {
    restaurantId,
    orders,
    raw: payload
  };
}

/**
 * @param {unknown} record
 * @returns {string}
 */
function resolveRestaurantIdFromRecord(record) {
  if (!record || typeof record !== 'object') return '';
  const row = /** @type {Record<string, unknown>} */ (record);
  return String(row.restaurant_id ?? row.restaurantId ?? row.tenant_id ?? row.tenantId ?? '').trim();
}

/**
 * @param {unknown[]} records
 * @param {string} restaurantId
 * @returns {unknown[]}
 */
export function filterRestaurantData(records, restaurantId) {
  const targetId = String(restaurantId || '').trim();
  if (!targetId || !Array.isArray(records)) return [];

  return records.filter((record) => resolveRestaurantIdFromRecord(record) === targetId);
}

/**
 * @returns {{ restaurantId: string, slug: string, menu: NormalizedAdminMenu, reservations: NormalizedAdminReservations, orders: NormalizedAdminOrders }}
 */
export function getMockDemoManagementModel() {
  const restaurantId = DEMO_RESTAURANT_ID;
  const slug = DEMO_RESTAURANT_SLUG;

  const rawMenu = [
    {
      id: 'cat-main',
      restaurant_id: restaurantId,
      name: 'Ana yemekler',
      items: [
        {
          id: 'item-levrek',
          restaurant_id: restaurantId,
          name: 'Izgara levrek',
          price: 420,
          active: true,
          stock_status: 'in_stock'
        },
        {
          id: 'item-kebap',
          restaurant_id: restaurantId,
          name: 'Adana kebap',
          price: 360,
          active: true,
          stock_status: 'low_stock'
        }
      ]
    },
    {
      id: 'cat-dessert',
      restaurant_id: restaurantId,
      name: 'Tatlılar',
      items: [
        {
          id: 'item-sutlac',
          restaurant_id: restaurantId,
          name: 'Sütlaç',
          price: 120,
          active: false,
          stock_status: 'out_of_stock'
        }
      ]
    },
    {
      id: 'cat-other-tenant',
      restaurant_id: 'b0000000-0000-4000-8000-00000000bistro',
      name: 'Diğer restoran menüsü',
      items: [
        {
          id: 'item-other',
          restaurant_id: 'b0000000-0000-4000-8000-00000000bistro',
          name: 'Başka restoran ürünü',
          price: 99,
          active: true,
          stock_status: 'in_stock'
        }
      ]
    }
  ];

  const rawReservations = [
    {
      id: 'res-101',
      restaurant_id: restaurantId,
      customer_name: 'Ayşe Yılmaz',
      date: '2026-07-08',
      time: '19:30',
      guest_count: 4,
      status: 'confirmed'
    },
    {
      id: 'res-102',
      restaurant_id: restaurantId,
      customer_name: 'Mehmet Kaya',
      date: '2026-07-08',
      time: '20:00',
      guest_count: 2,
      status: 'pending'
    },
    {
      id: 'res-999',
      restaurant_id: 'b0000000-0000-4000-8000-00000000bistro',
      customer_name: 'Başka Restoran Misafiri',
      date: '2026-07-08',
      time: '21:00',
      guest_count: 3,
      status: 'confirmed'
    }
  ];

  const rawOrders = [
    {
      id: 'po-501',
      restaurant_id: restaurantId,
      order_no: 'PO-501',
      items: [
        { name: 'Izgara levrek', quantity: 2 },
        { name: 'Salata', quantity: 1 }
      ],
      total: 940,
      kitchen_status: 'preparing'
    },
    {
      id: 'po-502',
      restaurant_id: restaurantId,
      order_no: 'PO-502',
      items: [{ name: 'Adana kebap', quantity: 1 }],
      total: 360,
      kitchen_status: 'ready'
    },
    {
      id: 'po-900',
      restaurant_id: 'b0000000-0000-4000-8000-00000000bistro',
      order_no: 'PO-900',
      items: [{ name: 'Başka sipariş', quantity: 1 }],
      total: 150,
      kitchen_status: 'submitted'
    }
  ];

  const menuCategories = filterRestaurantData(rawMenu, restaurantId);
  const reservations = filterRestaurantData(rawReservations, restaurantId);
  const orders = filterRestaurantData(rawOrders, restaurantId);

  return {
    restaurantId,
    slug,
    menu: normalizeAdminMenu({ restaurant_id: restaurantId, categories: menuCategories }),
    reservations: normalizeAdminReservations({
      restaurant_id: restaurantId,
      reservations
    }),
    orders: normalizeAdminOrders({ restaurant_id: restaurantId, orders }, { slug })
  };
}

/**
 * @param {NormalizedAdminMenu} menu
 * @returns {string}
 */
export function renderManagementMenuHtml(menu) {
  if (!menu.categories.length) {
    return '<p class="garson-management-empty">Menü kaydı bulunamadı.</p>';
  }

  return menu.categories
    .map((category) => {
      const itemsHtml = category.items
        .map((item) => {
          const activeLabel = item.active ? 'Aktif' : 'Pasif';
          const activeClass = item.active ? 'is-active' : 'is-inactive';
          return `
            <tr>
              <td>${item.name}</td>
              <td>${item.priceLabel}</td>
              <td><span class="garson-management-badge ${activeClass}">${activeLabel}</span></td>
              <td>${item.stockLabel}</td>
            </tr>
          `.trim();
        })
        .join('');

      return `
        <section class="garson-management-card">
          <h2 class="garson-management-card__title">${category.name}</h2>
          <div class="garson-management-table-wrap">
            <table class="garson-management-table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Fiyat</th>
                  <th>Durum</th>
                  <th>Stok</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>
        </section>
      `.trim();
    })
    .join('');
}

/**
 * @param {NormalizedAdminReservations} reservations
 * @returns {string}
 */
export function renderManagementReservationsHtml(reservations) {
  if (!reservations.reservations.length) {
    return '<p class="garson-management-empty">Rezervasyon kaydı bulunamadı.</p>';
  }

  const rows = reservations.reservations
    .map(
      (item) => `
      <tr>
        <td>${item.customerName}</td>
        <td>${item.date || '—'}</td>
        <td>${item.time || '—'}</td>
        <td>${item.guestCount}</td>
        <td>${item.statusLabel}</td>
      </tr>
    `.trim()
    )
    .join('');

  return `
    <section class="garson-management-card">
      <div class="garson-management-table-wrap">
        <table class="garson-management-table">
          <thead>
            <tr>
              <th>Müşteri</th>
              <th>Tarih</th>
              <th>Saat</th>
              <th>Kişi</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `.trim();
}

/**
 * @param {NormalizedAdminOrders} orders
 * @returns {string}
 */
export function renderManagementOrdersHtml(orders) {
  if (!orders.orders.length) {
    return '<p class="garson-management-empty">Sipariş kaydı bulunamadı.</p>';
  }

  return orders.orders
    .map((order) => {
      const items = order.items
        .map((item) => `<li>${item.quantity}× ${item.name}</li>`)
        .join('');
      return `
        <article class="garson-management-card garson-management-order-card">
          <header class="garson-management-order-card__header">
            <h2 class="garson-management-card__title">${order.orderNo}</h2>
            <p class="garson-management-order-card__status">${order.kitchenStatusLabel}</p>
          </header>
          <ul class="garson-management-order-card__items">${items}</ul>
          <p class="garson-management-order-card__total">Toplam: ${order.totalLabel}</p>
          <a class="vacation-btn vacation-btn--secondary" href="${order.kitchenHref}">Mutfak ekranı</a>
        </article>
      `.trim();
    })
    .join('');
}

/**
 * @param {'menu'|'reservations'|'orders'} active
 * @returns {string}
 */
export function renderManagementSubNavHtml(active) {
  const links = [
    { id: 'menu', label: 'Menü', href: GARSON_MANAGEMENT_MENU_PATH },
    { id: 'reservations', label: 'Rezervasyonlar', href: GARSON_MANAGEMENT_RESERVATIONS_PATH },
    { id: 'orders', label: 'Siparişler', href: GARSON_MANAGEMENT_ORDERS_PATH }
  ];

  return links
    .map((link) => {
      const current = link.id === active ? ' aria-current="page"' : '';
      const activeClass = link.id === active ? ' is-active' : '';
      return `<a class="garson-management-subnav__link${activeClass}" href="${link.href}"${current}>${link.label}</a>`;
    })
    .join('');
}

/**
 * @returns {boolean}
 */
function isDemoAdminSessionActive() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(GARSON_ADMIN_DEMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * @param {'menu'|'reservations'|'orders'} page
 */
function bootManagementPage(page) {
  if (!isDemoAdminSessionActive()) {
    window.location.assign(GARSON_ADMIN_LOGIN_PATH);
    return;
  }

  const model = getMockDemoManagementModel();
  const title = document.getElementById('garson-management-title');
  const subtitle = document.getElementById('garson-management-subtitle');
  const subnav = document.getElementById('garson-management-subnav');
  const content = document.getElementById('garson-management-content');
  const badge = document.getElementById('garson-management-demo-badge');

  if (title) {
    const titles = {
      menu: 'Menü yönetimi',
      reservations: 'Rezervasyonlar',
      orders: 'Ön siparişler'
    };
    title.textContent = titles[page];
  }
  if (subtitle) subtitle.textContent = `Demo Cafe · ${model.restaurantId}`;
  if (subnav) subnav.innerHTML = renderManagementSubNavHtml(page);
  if (badge) badge.hidden = false;

  if (content) {
    if (page === 'menu') content.innerHTML = renderManagementMenuHtml(model.menu);
    if (page === 'reservations') {
      content.innerHTML = renderManagementReservationsHtml(model.reservations);
    }
    if (page === 'orders') content.innerHTML = renderManagementOrdersHtml(model.orders);
  }

  document.body.classList.add('ib-ready');
}

function boot() {
  const root = document.getElementById('garson-management-root');
  if (!root) return;

  const page = root.dataset.page;
  if (page === 'menu' || page === 'reservations' || page === 'orders') {
    bootManagementPage(page);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
