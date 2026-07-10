/**
 * GarsonAI production WhatsApp Turkish reply engine.
 */

/** @type {Record<string, string>} */
export const ORDER_STATUS_REPLIES = {
  pending: 'Siparişiniz alındı.',
  accepted: 'Siparişiniz alındı.',
  preparing: 'Siparişiniz hazırlanıyor.',
  ready: 'Siparişiniz hazır.',
  delivering: 'Siparişiniz teslim edildi.',
  completed: 'Siparişiniz teslim edildi.',
  cancelled: 'Siparişiniz iptal edildi.',
  default: 'Mesajınız alındı. Size yardımcı olmaya hazırız.'
};

/**
 * @param {string} [status]
 * @returns {string}
 */
export function generateOrderStatusReply(status) {
  const key = String(status || '').trim().toLowerCase();
  return ORDER_STATUS_REPLIES[key] || ORDER_STATUS_REPLIES.default;
}

/**
 * @param {{ intent?: string, orderCreated?: boolean, orderStatus?: string, unmatchedProducts?: boolean }} [context]
 * @returns {string}
 */
export function generateProductionReply(context = {}) {
  if (context.unmatchedProducts) {
    return 'Ürünlerden bazıları menüde bulunamadı. Lütfen menüdeki ürün adlarıyla tekrar yazın.';
  }

  if (context.orderCreated) {
    return generateOrderStatusReply(context.orderStatus || 'pending');
  }

  if (context.intent && context.intent !== 'new_order') {
    return 'Mesajınız alındı. Sipariş vermek için ürün adı ve adet yazabilirsiniz.';
  }

  return ORDER_STATUS_REPLIES.default;
}
