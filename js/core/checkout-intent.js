import { STORAGE_KEYS } from './storage-keys.js';

/**
 * @typedef {{ billing?: 'monthly' | 'annual', useTrial?: boolean }} CheckoutIntent
 */

/**
 * @param {Storage} [storage]
 * @returns {CheckoutIntent | null}
 */
export function peekCheckoutIntent(storage = sessionStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEYS.CHECKOUT_INTENT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      billing: parsed.billing === 'annual' ? 'annual' : 'monthly',
      useTrial: parsed.useTrial !== false
    };
  } catch {
    return null;
  }
}

/**
 * @param {CheckoutIntent} intent
 * @param {Storage} [storage]
 */
export function storeCheckoutIntentPayload(intent, storage = sessionStorage) {
  try {
    storage.setItem(STORAGE_KEYS.CHECKOUT_INTENT, JSON.stringify({
      billing: intent.billing === 'annual' ? 'annual' : 'monthly',
      useTrial: intent.useTrial !== false
    }));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * @param {Storage} [storage]
 */
export function clearCheckoutIntent(storage = sessionStorage) {
  try {
    storage.removeItem(STORAGE_KEYS.CHECKOUT_INTENT);
  } catch {
    // ignore
  }
}

/**
 * @param {CheckoutIntent} intent
 * @returns {{ target: { closest: () => { dataset: Record<string, string> } } }}
 */
export function buildCheckoutTriggerEvent(intent) {
  return {
    target: {
      closest: () => ({
        dataset: {
          billing: intent.billing || 'monthly',
          trial: intent.useTrial === false ? '0' : '1'
        }
      })
    }
  };
}

/**
 * @param {number} status
 * @param {{ error?: string, message?: string }} [data]
 * @returns {string}
 */
export function mapCheckoutApiError(status, data = {}) {
  const errField = data.error;
  const code = (
    typeof errField === 'object' && errField !== null
      ? errField.message || errField.code
      : errField || data.message || ''
  ).toString();

  if (status === 401 || /invalid token|authorization/i.test(code)) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen tekrar giriş yapıp ödemeye devam edin.';
  }
  if (status === 409 || /active subscription/i.test(code)) {
    return 'Zaten aktif bir Pro aboneliğiniz var. Aboneliği profil sayfasından yönetebilirsiniz.';
  }
  if (status === 403) {
    return 'Ödeme başlatılamadı. Lütfen sayfayı yenileyip tekrar deneyin.';
  }
  if (status === 500 || /not configured|unavailable/i.test(code)) {
    return 'Ödeme sistemi geçici olarak kullanılamıyor. Birkaç dakika sonra tekrar deneyin.';
  }
  if (code && code !== 'Checkout başlatılamadı') {
    return code;
  }
  return 'Ödeme sayfası açılamadı. Bağlantınızı kontrol edip tekrar deneyin.';
}

export const CHECKOUT_REASSURANCE_HTML = `
  <p class="revenue-risk-reversal checkout-reassurance" role="note">
    <span>7 gün ücretsiz deneme</span>
    <span>iyzico / PayTR ile güvenli ödeme</span>
    <span>İstediğiniz zaman iptal</span>
  </p>`;
