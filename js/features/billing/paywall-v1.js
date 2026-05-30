/**
 * Paywall V1 — guest / free / pro UX; checkout via TR payment providers (iyzico / PayTR).
 */
import { escapeHtml } from '../../core/security.js';
import { startPaymentCheckout } from '../../payments/payment-client.js';
import {
  canAccessProFeature,
  PRO_FEATURE,
  PRO_FEATURE_COPY,
  resolveIsPro,
  resolvePlanTier
} from './pro-features.js';
import { revenueManager } from '../monetization/revenue-manager.js';
import { PLANS } from '../monetization/plans.js';

export const PAYWALL_STATE = Object.freeze({
  GUEST: 'guest',
  FREE: 'free',
  PRO: 'pro',
  ERROR: 'error'
});

/**
 * @param {object} ctx
 * @param {boolean} [ctx.isAuthenticated]
 * @param {boolean} [ctx.isPro]
 * @param {object} [ctx.profile]
 * @param {object} [ctx.subscription]
 */
export function resolvePaywallState(ctx = {}) {
  if (!ctx.isAuthenticated) return PAYWALL_STATE.GUEST;
  if (resolveIsPro(ctx)) return PAYWALL_STATE.PRO;
  return PAYWALL_STATE.FREE;
}

/**
 * @param {string} feature
 * @param {object} ctx
 */
export function shouldShowPaywall(feature, ctx = {}) {
  return !canAccessProFeature(feature, ctx);
}

/**
 * @param {object} [opts]
 */
export function renderProBadge(opts = {}) {
  const active = opts.active !== false;
  return `<span class="paywall-v1-badge ${active ? 'paywall-v1-badge--active' : ''}" aria-label="Pro üyelik">${active ? 'Pro' : 'Pro özellik'}</span>`;
}

/**
 * @param {object} opts
 * @param {string} opts.feature
 * @param {string} [opts.state] guest|free|pro|error
 * @param {boolean} [opts.compact]
 * @param {string} [opts.errorMessage]
 * @param {boolean} [opts.stripeReady]
 */
export function renderPaywallV1(opts = {}) {
  const feature = opts.feature || PRO_FEATURE.PREMIUM_PDF_REPORT;
  const state = opts.state || PAYWALL_STATE.FREE;
  const compact = Boolean(opts.compact);
  const esc = escapeHtml;
  const title = PRO_FEATURE_COPY[feature] || 'Pro özellik';
  const stripeReady = opts.stripeReady !== false;

  if (state === PAYWALL_STATE.PRO) {
    return '';
  }

  if (state === PAYWALL_STATE.ERROR) {
    return `
      <aside class="paywall-v1 ${compact ? 'paywall-v1--compact' : ''}" data-paywall-v1 data-paywall-state="error" role="alert">
        <p class="paywall-v1-kicker">Ödeme geçici olarak kullanılamıyor</p>
        <p>${esc(opts.errorMessage || 'Lütfen daha sonra tekrar deneyin veya destek ile iletişime geçin.')}</p>
        <a href="/planlar" class="btn btn-outline btn-sm" data-native-route>Planları görüntüle</a>
      </aside>`;
  }

  if (state === PAYWALL_STATE.GUEST) {
    return `
      <aside class="paywall-v1 ${compact ? 'paywall-v1--compact' : ''}" data-paywall-v1 data-paywall-state="guest">
        <div class="paywall-v1-lock" aria-hidden="true"><i data-lucide="lock"></i></div>
        <h4 class="paywall-v1-title">${esc(title)}</h4>
        <p class="paywall-v1-body">Bu özelliği kullanmak için hesabınıza giriş yapın.</p>
        <div class="paywall-v1-actions">
          <button type="button" class="btn btn-primary btn-sm" data-auth-open="login" data-paywall-v1-login>Giriş yap</button>
          <button type="button" class="btn btn-outline btn-sm" data-auth-open="register">Kayıt ol</button>
        </div>
      </aside>`;
  }

  const ctaLabel = stripeReady
    ? PLANS.pro.trialLabel || "Pro'ya geç"
    : 'Erken erişim — Planlar';

  return `
    <aside class="paywall-v1 ${compact ? 'paywall-v1--compact' : ''}" data-paywall-v1 data-paywall-state="free">
      <div class="paywall-v1-lock" aria-hidden="true"><i data-lucide="sparkles"></i></div>
      <h4 class="paywall-v1-title">${esc(title)}</h4>
      <p class="paywall-v1-body">Pro ile sınırsız analiz, gelişmiş PDF rapor, PDF geçmişi ve AI karşılaştırma senaryoları.</p>
      <ul class="paywall-v1-list">
        <li>Sınırsız analiz</li>
        <li>Gelişmiş PDF &amp; geçmiş</li>
        <li>Senaryo analizi</li>
      </ul>
      <div class="paywall-v1-actions">
        ${
          stripeReady
            ? `<button type="button" class="btn btn-primary btn-sm" data-paywall-v1-checkout data-payment-product="pro_monthly">${esc(ctaLabel)}</button>`
            : `<a href="/planlar" class="btn btn-primary btn-sm" data-native-route>Planları incele</a>`
        }
        <button type="button" class="btn btn-ghost btn-sm" data-paywall-v1-dismiss>Ücretsiz devam et</button>
      </div>
    </aside>`;
}

/**
 * @param {object} opts
 * @param {string} opts.feature
 * @param {string} opts.contentHtml — pro kullanıcıya gösterilecek içerik
 * @param {object} opts.ctx — paywall context
 */
export function renderPaywallGate(opts = {}) {
  const ctx = opts.ctx || {};
  const state = resolvePaywallState(ctx);
  if (state === PAYWALL_STATE.PRO) {
    return opts.contentHtml || '';
  }
  const paywall = renderPaywallV1({
    feature: opts.feature,
    state,
    compact: opts.compact,
    stripeReady: opts.stripeReady
  });
  if (opts.compact) {
    return `${paywall}`;
  }
  return `
    <div class="paywall-v1-gate">
      ${paywall}
      <div class="paywall-v1-gate-preview" aria-hidden="true">${opts.contentHtml || ''}</div>
    </div>`;
}

/**
 * Pro checkout — iyzico birincil, PayTR yedek.
 * @param {object} [opts]
 */
export async function requestProCheckout(opts = {}) {
  const productCode =
    opts.productCode ||
    (opts.billingInterval === 'annual' || opts.billingInterval === 'yearly'
      ? 'pro_yearly'
      : 'pro_monthly');
  try {
    const result = await startPaymentCheckout(productCode, {
      metadata: { attribution: opts.attribution || {}, source: 'paywall_v1' }
    });
    if (result?.needsAuth) {
      return { ok: false, reason: 'auth_required', url: null };
    }
    if (result?.ok) {
      return {
        ok: true,
        url: result.paymentPageUrl || result.iframeUrl || null,
        trialApplied: false
      };
    }
    return {
      ok: false,
      reason: result?.code || 'checkout_failed',
      url: null,
      status: result?.code === 'PAYMENT_PROVIDER_NOT_CONFIGURED' ? 503 : undefined
    };
  } catch (err) {
    return { ok: false, reason: err?.message || 'network_error', url: null };
  }
}

/**
 * @param {HTMLElement} root
 * @param {object} [handlers]
 */
export function bindPaywallV1(root, handlers = {}) {
  if (!root || root.dataset.paywallV1Bound) return;
  root.dataset.paywallV1Bound = 'true';

  root.addEventListener('click', async (event) => {
    const checkoutBtn = event.target.closest('[data-paywall-v1-checkout]');
    if (checkoutBtn) {
      event.preventDefault();
      if (handlers.onCheckoutStart) handlers.onCheckoutStart();
      const result = await requestProCheckout({
        billingInterval: checkoutBtn.dataset.billing || 'monthly',
        useTrial: checkoutBtn.dataset.trial !== '0'
      });
      if (result.ok && result.url) {
        window.location.href = result.url;
        return;
      }
      if (handlers.onCheckoutError) {
        handlers.onCheckoutError(result);
      } else if (window.app?.ui?.showError) {
        window.app.ui.showError('Ödeme oturumu başlatılamadı. Lütfen tekrar deneyin.');
      }
      return;
    }

    if (event.target.closest('[data-paywall-v1-dismiss]')) {
      event.preventDefault();
      const panel = event.target.closest('[data-paywall-v1]');
      panel?.classList.add('is-dismissed');
    }

    if (event.target.closest('[data-paywall-v1-login]')) {
      event.preventDefault();
      window.app?.auth?.showLoginModal?.();
    }
  });
}

/**
 * @param {object} ctx
 */
export function buildPaywallContextFromApp(ctx = {}) {
  const app = typeof window !== 'undefined' ? window.app : null;
  const user = ctx.user || app?.currentUser || null;
  const subscription =
    ctx.subscription ||
    app?.accountManager?.subscription ||
    revenueManager.subscription ||
    null;
  const profile = ctx.profile || user?.profile || null;
  const isAuthenticated = Boolean(user?.id);
  const plan = resolvePlanTier(user, {
    isPro: ctx.isPro ?? revenueManager.isPremium,
    profile,
    subscription,
    isAuthenticated
  });

  return {
    isAuthenticated,
    isPro: plan.isPro,
    planTier: plan.planTier,
    subscriptionState: plan.subscriptionState,
    profile,
    subscription,
    user
  };
}

/**
 * Plan tier for results / PDF surfaces (guest | free | pro).
 */
export function getResultsPlanContext(ctx = {}) {
  return buildPaywallContextFromApp(ctx);
}
