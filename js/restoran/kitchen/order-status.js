/**
 * GarsonAI kitchen order status lifecycle rules.
 */

/** @type {readonly string[]} */
export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'delivering',
  'completed',
  'cancelled'
];

/** @type {Set<string>} */
const TERMINAL_STATUSES = new Set(['completed', 'cancelled']);

/** @type {Record<string, string[]>} */
const ALLOWED_TRANSITIONS = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivering', 'cancelled'],
  delivering: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

/**
 * @param {string} [status]
 * @returns {string}
 */
export function normalizeOrderStatus(status) {
  const key = String(status || 'pending').trim().toLowerCase();
  return ORDER_STATUSES.includes(key) ? key : 'pending';
}

/**
 * @param {string} [status]
 * @returns {boolean}
 */
export function canCancelOrderStatus(status) {
  const key = normalizeOrderStatus(status);
  return !TERMINAL_STATUSES.has(key);
}

/**
 * @param {string} [fromStatus]
 * @param {string} [toStatus]
 * @returns {{ ok: boolean, error?: string, from: string, to: string }}
 */
export function validateOrderTransition(fromStatus, toStatus) {
  const from = normalizeOrderStatus(fromStatus);
  const to = normalizeOrderStatus(toStatus);

  if (from === to) {
    return { ok: true, from, to };
  }

  if (to === 'cancelled') {
    if (!canCancelOrderStatus(from)) {
      return {
        ok: false,
        from,
        to,
        error: 'Tamamlanmış veya iptal edilmiş sipariş iptal edilemez.'
      };
    }
    return { ok: true, from, to };
  }

  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return {
      ok: false,
      from,
      to,
      error: `Geçersiz sipariş durumu geçişi: ${from} → ${to}`
    };
  }

  return { ok: true, from, to };
}

/**
 * @param {string} [status]
 * @returns {string[]}
 */
export function getNextOrderStatuses(status) {
  return [...(ALLOWED_TRANSITIONS[normalizeOrderStatus(status)] || [])];
}
