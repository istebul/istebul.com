/**
 * GarsonAI WhatsApp order builder (normalized pending order payload).
 */

/**
 * @typedef {Object} WhatsAppCustomer
 * @property {string} [phone]
 * @property {string} [name]
 * @property {string} [whatsappId]
 */

/**
 * @typedef {Object} WhatsAppOrderItem
 * @property {string} menuItemId
 * @property {string} name
 * @property {number} quantity
 * @property {number|null} [unitPrice]
 * @property {number|null} [lineTotal]
 * @property {string} [note]
 */

/**
 * @typedef {Object} WhatsAppOrder
 * @property {string} restaurantId
 * @property {WhatsAppCustomer} customer
 * @property {WhatsAppOrderItem[]} items
 * @property {string} status
 * @property {string} source
 * @property {number|null} total
 * @property {string} [note]
 */

export class WhatsAppOrderBuilderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WhatsAppOrderBuilderError';
  }
}

/**
 * @param {unknown} customer
 * @returns {WhatsAppCustomer}
 */
export function normalizeWhatsAppCustomer(customer) {
  const row = /** @type {Record<string, unknown>} */ (
    customer && typeof customer === 'object' ? customer : {}
  );

  return {
    phone: String(row.phone ?? row.customer_phone ?? '').trim() || undefined,
    name: String(row.name ?? row.customer_name ?? '').trim() || undefined,
    whatsappId: String(row.whatsappId ?? row.whatsapp_id ?? row.wa_id ?? '').trim() || undefined
  };
}

/**
 * @param {Array<{ matched?: boolean, menuItemId?: string, name?: string, quantity?: number, note?: string, price?: number|null, restaurantId?: string }>} matchedItems
 * @param {string} restaurantId
 * @returns {WhatsAppOrderItem[]}
 */
export function mapMatchedItemsToOrderLines(matchedItems, restaurantId) {
  const targetId = String(restaurantId || '').trim();
  /** @type {WhatsAppOrderItem[]} */
  const lines = [];

  for (const item of matchedItems || []) {
    if (!item?.matched || !item.menuItemId) {
      throw new WhatsAppOrderBuilderError('Menüde eşleşmeyen ürün var; sipariş oluşturulamadı.');
    }

    const itemRestaurantId = String(item.restaurantId || '').trim();
    if (targetId && itemRestaurantId && itemRestaurantId !== targetId) {
      throw new WhatsAppOrderBuilderError('Tenant izolasyonu ihlali: ürün farklı restorana ait.');
    }

    const quantityRaw = Number.parseInt(String(item.quantity ?? '1'), 10);
    const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
    const unitPrice = item.price != null && Number.isFinite(item.price) ? item.price : null;
    const lineTotal = unitPrice != null ? unitPrice * quantity : null;

    lines.push({
      menuItemId: String(item.menuItemId),
      name: String(item.name || '').trim(),
      quantity,
      unitPrice,
      lineTotal,
      note: item.note ? String(item.note).trim() : undefined
    });
  }

  return lines;
}

/**
 * @param {WhatsAppOrderItem[]} items
 * @returns {number|null}
 */
export function calculateOrderTotal(items) {
  let total = 0;
  let hasPrice = false;

  for (const item of items) {
    if (item.lineTotal != null && Number.isFinite(item.lineTotal)) {
      total += item.lineTotal;
      hasPrice = true;
    }
  }

  return hasPrice ? total : null;
}

/**
 * @param {{ restaurantId?: string, customer?: WhatsAppCustomer, matchedItems?: Array<{ matched?: boolean, menuItemId?: string, name?: string, quantity?: number, note?: string, price?: number|null, restaurantId?: string }>, note?: string }} input
 * @returns {WhatsAppOrder}
 */
export function buildWhatsAppOrder(input = {}) {
  const restaurantId = String(input.restaurantId || '').trim();
  if (!restaurantId) {
    throw new WhatsAppOrderBuilderError('Restoran kimliği gerekli.');
  }

  const customer = normalizeWhatsAppCustomer(input.customer);
  const items = mapMatchedItemsToOrderLines(input.matchedItems || [], restaurantId);

  if (!items.length) {
    throw new WhatsAppOrderBuilderError('Sipariş ürün listesi boş.');
  }

  return {
    restaurantId,
    customer,
    items,
    status: 'pending',
    source: 'whatsapp',
    total: calculateOrderTotal(items),
    note: input.note ? String(input.note).trim() : undefined
  };
}
