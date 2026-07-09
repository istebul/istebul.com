/**
 * GarsonAI WhatsApp intent detection for inbound customer messages.
 */

/** @type {readonly string[]} */
export const WHATSAPP_INTENTS = [
  'new_order',
  'cancel_order',
  'reservation',
  'menu_question',
  'price_question',
  'working_hours_question',
  'unknown'
];

/** @type {Record<string, RegExp>} */
const INTENT_PATTERNS = {
  cancel_order: /\b(iptal|iptal\s+et|vazgeç|cancel|siparişimi\s+iptal)\b/i,
  reservation: /\b(rezervasyon|masa\s+ayır|yer\s+ayır|kişilik\s+masa|table\s+for)\b/i,
  menu_question: /\b(menü|menu|ne\s+var|çeşit|çeşitler|yemek\s+listesi)\b/i,
  price_question: /\b(fiyat|fiyatı|ne\s+kadar|kaç\s+lira|kaç\s+tl|ücreti)\b/i,
  working_hours_question:
    /\b(çalışma\s+saat|açılış|kapanış|kaça\s+kadar|ne\s+zaman\s+açık|açık\s+mısınız|açıksınız)\b/i
};

const ORDER_ACTION_PATTERN = /\b(gönder|sipariş|istiyorum|isterim|gelsin|hazırla)\b/i;
const ORDER_QUANTITY_PATTERN = /\b\d+\s+[a-zçğıöşü]/i;

/**
 * @param {string} message
 * @returns {string}
 */
export function detectIntent(message) {
  const text = String(message || '').trim();
  if (!text) return 'unknown';

  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(text)) return intent;
  }

  if (ORDER_QUANTITY_PATTERN.test(text) || ORDER_ACTION_PATTERN.test(text)) {
    return 'new_order';
  }

  return 'unknown';
}

/**
 * @param {string} [intent]
 * @returns {boolean}
 */
export function isOrderIntent(intent) {
  return intent === 'new_order';
}
