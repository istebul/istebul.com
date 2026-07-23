/**
 * GarsonAI WhatsApp-compatible personalized customer message generator.
 */

/**
 * @param {string} fullName
 * @returns {string}
 */
export function formatCustomerGreeting(fullName) {
  const trimmed = String(fullName || '').trim();
  if (!trimmed) return 'Merhaba';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Müşterimiz';
  const honorific = /[aeıioöuü]$/i.test(firstName) ? 'Bey' : 'Hanım';
  return `Merhaba ${firstName} ${honorific}`;
}

/**
 * @param {{ name?: string, phone?: string, favoriteProduct?: string|null }} customer
 * @param {{ favoriteProduct?: string, offer?: string, restaurantName?: string }} [context]
 * @returns {string}
 */
export function generateCustomerMessage(customer, context = {}) {
  const row = /** @type {Record<string, unknown>} */ (
    customer && typeof customer === 'object' ? customer : {}
  );

  const name = String(row.name ?? row.customer_name ?? '').trim();
  const favoriteProduct =
    String(context.favoriteProduct ?? row.favoriteProduct ?? '').trim() || 'favori ürününüz';
  const offer = String(context.offer ?? 'bugün özel fırsat').trim();
  const restaurantName = String(context.restaurantName ?? '').trim();

  const greeting = formatCustomerGreeting(name);
  const restaurantSuffix = restaurantName ? ` ${restaurantName} olarak` : '';

  return `${greeting} 👋${restaurantSuffix} ${favoriteProduct} için ${offer} var.`.replace(
    /\s+/g,
    ' '
  );
}
