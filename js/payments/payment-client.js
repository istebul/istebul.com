/**
 * TR payment client — iyzico primary, PayTR fallback (Supabase Edge Functions).
 */
import { supabase } from '../core/supabase.js';
import { getPaymentProduct } from './payment-products.js';
import {
  PAYMENT_NOT_CONFIGURED_MESSAGE,
  PAYMENT_PROVIDER_PENDING_MESSAGE
} from './payment-providers.js';
import { resolvePlanTier } from '../features/billing/pro-features.js';
import API from '../core/api.js';

const PAYMENT_PENDING_CODE = 'PAYMENT_PROVIDER_NOT_CONFIGURED';

/**
 * @param {string} productCode
 * @param {object} [options]
 */
export async function createPaymentSession(productCode, options = {}) {
  const product = getPaymentProduct(productCode);
  if (!product) {
    throw new Error('Geçersiz ürün kodu.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    if (typeof window !== 'undefined' && window.app?.auth) {
      window.app.auth.showCheckoutAuthGate?.();
      return { ok: false, needsAuth: true };
    }
    if (typeof window !== 'undefined') {
      window.location.assign('/?auth=login');
    }
    return { ok: false, needsAuth: true };
  }

  if (!supabase.functions?.invoke) {
    return {
      ok: false,
      code: PAYMENT_PENDING_CODE,
      message: PAYMENT_PROVIDER_PENDING_MESSAGE
    };
  }

  const provider = options.provider || 'iyzico';
  const fnName = provider === 'paytr' ? 'paytr-create-payment-session' : 'create-payment-session';

  const { data, error } = await supabase.functions.invoke(fnName, {
    body: {
      product_code: productCode,
      provider,
      metadata: options.metadata || {}
    }
  });

  const body = data && typeof data === 'object' ? data : {};

  if (error && !body.code) {
    const status = error.context?.status;
    if (status === 503) {
      return {
        ok: false,
        code: PAYMENT_PENDING_CODE,
        message: PAYMENT_PROVIDER_PENDING_MESSAGE,
        fallbackAvailable: true
      };
    }
    return {
      ok: false,
      code: PAYMENT_PENDING_CODE,
      message: error.message || PAYMENT_PROVIDER_PENDING_MESSAGE,
      fallbackAvailable: true
    };
  }
  if (body.ok === false && body.code === PAYMENT_PENDING_CODE) {
    return {
      ok: false,
      code: PAYMENT_PENDING_CODE,
      message: body.message || PAYMENT_PROVIDER_PENDING_MESSAGE,
      fallbackAvailable: Boolean(body.fallbackAvailable)
    };
  }

  if (!body.ok) {
    return {
      ok: false,
      message: body.message || 'Ödeme başlatılamadı.',
      fallbackAvailable: Boolean(body.fallbackAvailable)
    };
  }

  return body;
}

/**
 * @param {string} productCode
 * @param {object} [options]
 */
export async function createPaytrPaymentSession(productCode, options = {}) {
  return createPaymentSession(productCode, { ...options, provider: 'paytr' });
}

/**
 * @param {object} paymentResponse
 */
export function redirectToPayment(paymentResponse = {}) {
  if (typeof window === 'undefined') {
    return Boolean(paymentResponse.paymentPageUrl || paymentResponse.iframeUrl);
  }
  if (paymentResponse.paymentPageUrl) {
    window.location.assign(paymentResponse.paymentPageUrl);
    return true;
  }
  if (paymentResponse.iframeUrl) {
    const existing = document.getElementById('paytr-iframe-container');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'paytr-iframe-container';
    overlay.className = 'paytr-iframe-overlay';
    overlay.innerHTML = `
      <div class="paytr-iframe-card" role="dialog" aria-modal="true" aria-label="PayTR ödeme">
        <button type="button" class="paytr-iframe-close" aria-label="Kapat">×</button>
        <iframe src="${paymentResponse.iframeUrl}" title="PayTR ödeme" allow="payment *"></iframe>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.paytr-iframe-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    return true;
  }
  return false;
}

/**
 * @param {string} [userId]
 */
export async function getCurrentUserSubscription(userId) {
  const uid = userId || (typeof window !== 'undefined' ? window.app?.currentUser?.id : null);
  if (!uid) return null;
  try {
    return await API.getSubscription(uid);
  } catch {
    return null;
  }
}

/**
 * @param {string} [userId]
 */
export async function getUserEntitlements(userId) {
  const uid = userId || (typeof window !== 'undefined' ? window.app?.currentUser?.id : null);
  if (!uid) return [];
  try {
    return await API.getUserEntitlements(uid);
  } catch {
    return [];
  }
}

/**
 * @param {object} [ctx]
 */
export async function resolveIsPro(ctx = {}) {
  const user = ctx.user || (typeof window !== 'undefined' ? window.app?.currentUser : null);
  const profile = ctx.profile || user?.profile || null;
  let subscription = ctx.subscription || null;

  if (!subscription && user?.id) {
    subscription = await getCurrentUserSubscription(user.id);
  }

  const entitlements = ctx.entitlements || (user?.id ? await getUserEntitlements(user.id) : []);
  const hasPremiumReport = entitlements.some(
    (e) => e.entitlement_code === 'premium_report' && e.status === 'active'
  );

  const tier = resolvePlanTier(user, { profile, subscription, isAuthenticated: Boolean(user?.id) });
  return tier.isPro || hasPremiumReport;
}

/**
 * @param {string} productCode
 * @param {object} [options]
 */
export async function startPaymentCheckout(productCode, options = {}) {
  const ui = typeof window !== 'undefined' ? window.app?.ui : null;

  let response = await createPaymentSession(productCode, options);

  if (
    !response.ok &&
    response.code === PAYMENT_PENDING_CODE &&
    response.fallbackAvailable &&
    options.provider !== 'paytr'
  ) {
    response = await createPaytrPaymentSession(productCode, options);
  }

  if (!response.ok) {
    const msg =
      response.code === PAYMENT_PENDING_CODE
        ? PAYMENT_NOT_CONFIGURED_MESSAGE
        : response.message || PAYMENT_NOT_CONFIGURED_MESSAGE;
    ui?.showError?.(msg);
    return response;
  }

  if (!redirectToPayment(response)) {
    ui?.showError?.('Ödeme sayfasına yönlendirilemedi.');
  }
  return response;
}

/**
 * Bind [data-payment-product] buttons (idempotent).
 * @param {ParentNode} [root]
 */
export function bindPaymentProductButtons(root = document) {
  root.querySelectorAll('[data-payment-product]').forEach((btn) => {
    if (btn.dataset.paymentBound === '1') return;
    btn.dataset.paymentBound = '1';
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      const code = btn.getAttribute('data-payment-product');
      if (!code) return;
      btn.disabled = true;
      try {
        await startPaymentCheckout(code, {
          metadata: {
            placement: btn.getAttribute('data-payment-placement') || null
          }
        });
      } finally {
        btn.disabled = false;
      }
    });
  });
}
