/**
 * Client helpers for Stripe Customer Portal (no secrets).
 */

/**
 * @param {number} status
 * @param {{ error?: string, message?: string }} [data]
 * @returns {string}
 */
export function mapBillingPortalError(status, data = {}) {
  const code = (data.error || data.message || '').toString();

  if (status === 401 || /invalid token|authorization/i.test(code)) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen tekrar giriş yapın.';
  }
  if (status === 404 && code === 'no_billing_customer') {
    return 'Henüz faturalandırılmış bir abonelik yok. Pro planına abone olduktan sonra buradan yönetebilirsiniz.';
  }
  if (status === 403) {
    return 'Bu işlem için yetkiniz yok.';
  }
  if (status === 502 || status === 500) {
    return 'Abonelik paneli geçici olarak kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.';
  }
  if (data.message) return data.message;
  return 'Abonelik paneli açılamadı. Lütfen tekrar deneyin veya destek ile iletişime geçin.';
}

/**
 * @param {boolean} loading
 * @param {Event} [sourceEvent]
 */
export function setBillingPortalButtonsLoading(loading, sourceEvent) {
  const triggers = new Set();
  const fromClick = sourceEvent?.target?.closest?.('[data-billing-portal]');
  if (fromClick) triggers.add(fromClick);

  document.querySelectorAll('[data-billing-portal]').forEach((el) => triggers.add(el));

  triggers.forEach((btn) => {
    if (!btn || btn.tagName !== 'BUTTON') return;
    if (loading) {
      if (!btn.dataset.portalLabel) {
        btn.dataset.portalLabel = btn.textContent.trim();
      }
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.textContent = 'Stripe paneli açılıyor…';
    } else {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      if (btn.dataset.portalLabel) {
        btn.textContent = btn.dataset.portalLabel;
      }
    }
  });
}

/**
 * @param {{ status?: string } | null | undefined} subscription
 * @returns {boolean}
 */
export function canOpenBillingPortal(subscription) {
  if (!subscription?.status) return false;
  return ['active', 'trialing', 'past_due', 'canceled'].includes(subscription.status);
}
