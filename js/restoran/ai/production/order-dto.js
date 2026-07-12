/**
 * GarsonAI production sipariş DTO normalizasyonu.
 */

/**
 * @typedef {Object} GarsonOrderDto
 * @property {string} restaurantId
 * @property {string} intent
 * @property {string} status
 * @property {string} source
 * @property {number|null} total
 * @property {{ phone?: string, name?: string, whatsappId?: string }} customer
 * @property {Array<{ menuItemId: string, name: string, quantity: number, unitPrice: number|null, note?: string }>} items
 */

/**
 * @param {import('../../whatsapp/index.js').ProcessWhatsAppMessageResult} pipeline
 * @returns {GarsonOrderDto|null}
 */
export function buildOrderDtoFromPipeline(pipeline) {
  if (!pipeline?.order) return null;

  const order = pipeline.order;
  return {
    restaurantId: String(order.restaurantId || ''),
    intent: String(pipeline.intent || 'new_order'),
    status: String(order.status || 'pending'),
    source: String(order.source || 'whatsapp'),
    total: order.total != null ? Number(order.total) : null,
    customer: order.customer || {},
    items: (order.items || []).map((item) => ({
      menuItemId: String(item.menuItemId || ''),
      name: String(item.name || ''),
      quantity: Number(item.quantity || 1),
      unitPrice: item.unitPrice != null ? Number(item.unitPrice) : null,
      note: item.note ? String(item.note) : undefined
    }))
  };
}

/**
 * @param {GarsonOrderDto|null} orderDto
 * @param {string} restaurantId
 */
export function buildKitchenHandoff(orderDto, restaurantId) {
  if (!orderDto) {
    return { queue: [], notification: null };
  }

  const orderRecord = {
    id: `wa-${Date.now()}`,
    restaurantId: orderDto.restaurantId || restaurantId,
    status: orderDto.status,
    source: orderDto.source,
    total: orderDto.total,
    customer: orderDto.customer,
    items: orderDto.items
  };

  return {
    orderRecord,
    queueSize: orderDto.items.length,
    channel: orderDto.source === 'whatsapp' ? 'whatsapp' : 'sms'
  };
}
