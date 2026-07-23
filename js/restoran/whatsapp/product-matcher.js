/**
 * GarsonAI WhatsApp product matcher (menu fuzzy match with Turkish tolerance).
 */

/**
 * @typedef {Object} MenuProduct
 * @property {string} id
 * @property {string} restaurantId
 * @property {string} name
 * @property {number|null} [price]
 * @property {boolean} [active]
 */

/**
 * @typedef {Object} ParsedOrderItem
 * @property {string} name
 * @property {number} quantity
 * @property {string} [note]
 */

/**
 * @typedef {Object} MatchedOrderItem
 * @property {boolean} matched
 * @property {string} name
 * @property {number} quantity
 * @property {string} [note]
 * @property {string} [menuItemId]
 * @property {number|null} [price]
 * @property {string} restaurantId
 * @property {number} [score]
 * @property {string} [query]
 */

const TURKISH_CHAR_MAP = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  Ç: 'c',
  Ğ: 'g',
  Ö: 'o',
  Ş: 's',
  Ü: 'u'
};

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeProductText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (char) => TURKISH_CHAR_MAP[char] || char)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
export function levenshteinDistance(left, right) {
  const a = normalizeProductText(left);
  const b = normalizeProductText(right);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  /** @type {number[][]} */
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

/**
 * @param {unknown} record
 * @returns {string}
 */
function resolveRestaurantIdFromRecord(record) {
  if (!record || typeof record !== 'object') return '';
  const row = /** @type {Record<string, unknown>} */ (record);
  return String(row.restaurant_id ?? row.restaurantId ?? '').trim();
}

/**
 * @param {unknown} item
 * @param {string} restaurantId
 * @returns {MenuProduct|null}
 */
function normalizeMenuProduct(item, restaurantId) {
  const row = /** @type {Record<string, unknown>} */ (
    item && typeof item === 'object' ? item : {}
  );

  const id = String(row.id ?? row.menu_item_id ?? '').trim();
  const name = String(row.name ?? row.product_name ?? '').trim();
  const itemRestaurantId = resolveRestaurantIdFromRecord(row) || restaurantId;

  if (!id || !name || !itemRestaurantId) return null;
  if (restaurantId && itemRestaurantId !== restaurantId) return null;

  const activeRaw = row.active ?? row.is_active;
  if (activeRaw === false || activeRaw === 0 || activeRaw === 'false') return null;

  const priceRaw = row.price ?? row.unit_price;
  const priceNum = priceRaw != null && priceRaw !== '' ? Number(priceRaw) : null;
  const price = priceNum != null && Number.isFinite(priceNum) ? priceNum : null;

  return {
    id,
    restaurantId: itemRestaurantId,
    name,
    price,
    active: true
  };
}

/**
 * @param {unknown} menu
 * @param {string} restaurantId
 * @returns {MenuProduct[]}
 */
export function flattenMenuProducts(menu, restaurantId) {
  const targetId = String(restaurantId || '').trim();
  if (!targetId) return [];

  /** @type {MenuProduct[]} */
  const products = [];

  const appendItem = (item) => {
    const normalized = normalizeMenuProduct(item, targetId);
    if (normalized) products.push(normalized);
  };

  if (Array.isArray(menu)) {
    for (const entry of menu) {
      if (!entry || typeof entry !== 'object') continue;
      const row = /** @type {Record<string, unknown>} */ (entry);

      if (row.items || row.products || row.menu_items) {
        const itemSource = row.items ?? row.products ?? row.menu_items;
        if (Array.isArray(itemSource)) {
          for (const item of itemSource) appendItem(item);
        }
        continue;
      }

      appendItem(entry);
    }
  }

  return products;
}

/**
 * @param {string} query
 * @param {MenuProduct[]} products
 * @returns {{ product: MenuProduct|null, score: number }}
 */
export function findBestMenuProductMatch(query, products) {
  const normalizedQuery = normalizeProductText(query);
  if (!normalizedQuery || !products.length) {
    return { product: null, score: Number.POSITIVE_INFINITY };
  }

  let best = /** @type {MenuProduct|null} */ (null);
  let bestScore = Number.POSITIVE_INFINITY;

  for (const product of products) {
    const normalizedName = normalizeProductText(product.name);
    if (!normalizedName) continue;

    if (normalizedName === normalizedQuery) {
      return { product, score: 0 };
    }

    if (
      normalizedName.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedName)
    ) {
      const score = Math.abs(normalizedName.length - normalizedQuery.length);
      if (score < bestScore) {
        best = product;
        bestScore = score;
      }
      continue;
    }

    const distance = levenshteinDistance(normalizedQuery, normalizedName);
    const threshold = Math.max(1, Math.floor(normalizedName.length * 0.34));
    if (distance <= threshold && distance < bestScore) {
      best = product;
      bestScore = distance;
    }
  }

  return { product: best, score: bestScore };
}

/**
 * @param {ParsedOrderItem[]} items
 * @param {MenuProduct[]} products
 * @param {{ restaurantId?: string }} [options]
 * @returns {MatchedOrderItem[]}
 */
export function matchProductsToMenu(items, products, options = {}) {
  const restaurantId = String(options.restaurantId || '').trim();
  const scopedProducts = restaurantId
    ? products.filter((product) => product.restaurantId === restaurantId)
    : products;

  return (Array.isArray(items) ? items : []).map((item) => {
    const query = String(item?.name || '').trim();
    const quantityRaw = Number.parseInt(String(item?.quantity ?? '1'), 10);
    const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
    const note = item?.note != null ? String(item.note).trim() : '';

    const { product, score } = findBestMenuProductMatch(query, scopedProducts);
    const matched = Boolean(product);

    return {
      matched,
      name: product?.name || query,
      quantity,
      note: note || undefined,
      menuItemId: product?.id,
      price: product?.price ?? null,
      restaurantId: product?.restaurantId || restaurantId,
      score: matched ? score : undefined,
      query
    };
  });
}
