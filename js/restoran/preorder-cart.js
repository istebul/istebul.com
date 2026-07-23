/**
 * GarsonAI in-memory preorder cart (client-only, no persistence).
 */

/**
 * @typedef {Object} CartProduct
 * @property {string} id
 * @property {string} name
 * @property {number|null} [price]
 * @property {string} [priceLabel]
 * @property {string} [currency]
 */

/**
 * @typedef {Object} CartLine
 * @property {string} id
 * @property {string} name
 * @property {number|null} price
 * @property {string} priceLabel
 * @property {string} currency
 * @property {number} qty
 * @property {string} note
 * @property {number|null} lineTotal
 * @property {string} lineTotalLabel
 */

/**
 * @typedef {Object} CartLineSummary
 * @property {string} id
 * @property {string} name
 * @property {number} qty
 * @property {number|null} unitPrice
 * @property {string} unitPriceLabel
 * @property {number|null} lineTotal
 * @property {string} lineTotalLabel
 * @property {string} note
 */

/**
 * @typedef {Object} CartSummary
 * @property {CartLineSummary[]} lines
 * @property {number} totalQty
 * @property {number} lineCount
 * @property {number|null} grandTotal
 * @property {string} grandTotalLabel
 */

/**
 * @param {number|null} price
 * @param {string} [currency]
 * @returns {string}
 */
function formatPriceLabel(price, currency = 'TRY') {
  if (price == null || !Number.isFinite(price)) return '';
  const symbol = currency === 'TRY' ? 'TL' : currency;
  const formatted = Number.isInteger(price) ? String(price) : String(price);
  return `${formatted} ${symbol}`;
}

/**
 * @param {CartProduct|Record<string, unknown>} product
 * @returns {CartProduct|null}
 */
function normalizeProduct(product) {
  const row = product && typeof product === 'object' ? product : {};
  const id = String(row.id ?? '').trim();
  const name = String(row.name ?? '').trim();
  if (!id || !name) return null;

  const priceRaw = row.price;
  const price =
    priceRaw != null && priceRaw !== '' && Number.isFinite(Number(priceRaw))
      ? Number(priceRaw)
      : null;
  const currency = String(row.currency ?? 'TRY').trim() || 'TRY';
  let priceLabel = String(row.priceLabel ?? row.price_label ?? '').trim();
  if (!priceLabel && price != null) {
    priceLabel = formatPriceLabel(price, currency);
  }

  return { id, name, price, priceLabel, currency };
}

/**
 * @param {CartProduct} product
 * @param {number} qty
 * @param {string} [note]
 * @returns {CartLine}
 */
function toLine(product, qty, note = '') {
  const lineTotal = product.price != null ? product.price * qty : null;
  return {
    id: product.id,
    name: product.name,
    price: product.price ?? null,
    priceLabel: product.priceLabel ?? '',
    currency: product.currency ?? 'TRY',
    qty,
    note,
    lineTotal,
    lineTotalLabel: lineTotal != null ? formatPriceLabel(lineTotal, product.currency ?? 'TRY') : ''
  };
}

/**
 * @returns {{
 *   addItem: (product: CartProduct, qty?: number) => boolean,
 *   removeItem: (id: string) => boolean,
 *   increaseQty: (id: string) => boolean,
 *   decreaseQty: (id: string) => boolean,
 *   updateItemNote: (id: string, note: string) => boolean,
 *   clearCart: () => void,
 *   getItems: () => CartLine[],
 *   getSummary: () => CartSummary,
 *   serialize: () => { version: number, items: Array<Record<string, unknown>> },
 *   deserialize: (payload: unknown) => boolean
 * }}
 */
export function createCart() {
  /** @type {CartLine[]} */
  let items = [];

  /**
   * @param {string} id
   * @returns {number}
   */
  function findIndex(id) {
    return items.findIndex((item) => item.id === String(id).trim());
  }

  return {
    /**
     * @param {CartProduct} product
     * @param {number} [qty]
     * @returns {boolean}
     */
    addItem(product, qty = 1) {
      const normalized = normalizeProduct(product);
      if (!normalized) return false;

      const amount = Number.parseInt(String(qty), 10);
      const addQty = Number.isFinite(amount) && amount > 0 ? amount : 1;
      const index = findIndex(normalized.id);

      if (index >= 0) {
        const existing = items[index];
        items[index] = toLine(
          {
            id: existing.id,
            name: existing.name,
            price: existing.price,
            priceLabel: existing.priceLabel,
            currency: existing.currency
          },
          existing.qty + addQty,
          existing.note
        );
      } else {
        items.push(toLine(normalized, addQty, ''));
      }

      return true;
    },

    /**
     * @param {string} id
     * @returns {boolean}
     */
    removeItem(id) {
      const index = findIndex(id);
      if (index < 0) return false;
      items.splice(index, 1);
      return true;
    },

    /**
     * @param {string} id
     * @returns {boolean}
     */
    increaseQty(id) {
      const index = findIndex(id);
      if (index < 0) return false;
      const existing = items[index];
      items[index] = toLine(
        {
          id: existing.id,
          name: existing.name,
          price: existing.price,
          priceLabel: existing.priceLabel,
          currency: existing.currency
        },
        existing.qty + 1,
        existing.note
      );
      return true;
    },

    /**
     * @param {string} id
     * @returns {boolean}
     */
    decreaseQty(id) {
      const index = findIndex(id);
      if (index < 0) return false;
      const existing = items[index];
      if (existing.qty <= 1) {
        items.splice(index, 1);
      } else {
        items[index] = toLine(
          {
            id: existing.id,
            name: existing.name,
            price: existing.price,
            priceLabel: existing.priceLabel,
            currency: existing.currency
          },
          existing.qty - 1,
          existing.note
        );
      }
      return true;
    },

    /**
     * @param {string} id
     * @param {string} note
     * @returns {boolean}
     */
    updateItemNote(id, note) {
      const index = findIndex(id);
      if (index < 0) return false;
      const existing = items[index];
      items[index] = toLine(
        {
          id: existing.id,
          name: existing.name,
          price: existing.price,
          priceLabel: existing.priceLabel,
          currency: existing.currency
        },
        existing.qty,
        String(note ?? '').trim()
      );
      return true;
    },

    clearCart() {
      items = [];
    },

    getItems() {
      return items.map((item) => ({ ...item }));
    },

    getSummary() {
      const lines = items.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        unitPrice: item.price,
        unitPriceLabel: item.priceLabel,
        lineTotal: item.lineTotal,
        lineTotalLabel: item.lineTotalLabel,
        note: item.note
      }));

      const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
      const lineCount = items.length;
      const hasAllPrices = items.length > 0 && items.every((item) => item.price != null);
      const grandTotal = hasAllPrices
        ? items.reduce((sum, item) => sum + (item.price ?? 0) * item.qty, 0)
        : null;
      const currency = items[0]?.currency ?? 'TRY';

      return {
        lines,
        totalQty,
        lineCount,
        grandTotal,
        grandTotalLabel: grandTotal != null ? formatPriceLabel(grandTotal, currency) : ''
      };
    },

    serialize() {
      return {
        version: 1,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          priceLabel: item.priceLabel,
          currency: item.currency,
          qty: item.qty,
          note: item.note
        }))
      };
    },

    /**
     * @param {unknown} payload
     * @returns {boolean}
     */
    deserialize(payload) {
      items = [];
      if (payload == null) return false;

      const rawItems = Array.isArray(payload)
        ? payload
        : payload && typeof payload === 'object' && Array.isArray(/** @type {{ items?: unknown[] }} */ (payload).items)
          ? /** @type {{ items: unknown[] }} */ (payload).items
          : [];

      for (const entry of rawItems) {
        if (!entry || typeof entry !== 'object') continue;
        const row = /** @type {Record<string, unknown>} */ (entry);
        const product = normalizeProduct({
          id: row.id,
          name: row.name,
          price: row.price,
          priceLabel: row.priceLabel,
          currency: row.currency
        });
        if (!product) continue;

        const qty = Number.parseInt(String(row.qty ?? 1), 10);
        const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
        items.push(toLine(product, safeQty, String(row.note ?? '').trim()));
      }

      return true;
    }
  };
}
