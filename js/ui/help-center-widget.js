/**
 * P11 — Floating help center with FAQ automation + support routing.
 */
import {
  handleSupportQuery,
  submitSupportTicket,
  enrollBillingHelp,
  enrollOnboardingHelp
} from '../features/customer/customer-ops-client.js';
import { analytics } from '../core/analytics.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} [options]
 * @param {() => object} [options.getUserContext]
 */
export function mountHelpCenterWidget(options = {}) {
  if (typeof document === 'undefined') return;
  if (document.querySelector('[data-help-center-root]')) return;

  const root = document.createElement('div');
  root.setAttribute('data-help-center-root', '1');
  root.innerHTML = `
    <button type="button" class="ib-help-fab" data-help-toggle aria-expanded="false" aria-controls="ib-help-panel">
      Yardım
    </button>
    <div id="ib-help-panel" class="ib-help-panel" data-help-panel hidden role="dialog" aria-label="Yardım merkezi">
      <h3>Yardım merkezi</h3>
      <p class="text-muted-sm" style="margin:0;font-size:12px">SSS ve yönlendirme — çoğu soru burada çözülür. <a href="/yardim.html">Tüm yardım merkezi →</a></p>
      <input type="search" class="ib-help-search" data-help-search placeholder="Örn: ödeme, analiz, Pro plan…" aria-label="Yardım ara" />
      <div data-help-results></div>
      <p class="ib-help-status" data-help-status hidden></p>
      <div class="ib-help-actions" data-help-actions></div>
    </div>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector('[data-help-panel]');
  const toggle = root.querySelector('[data-help-toggle]');
  const search = root.querySelector('[data-help-search]');
  const resultsEl = root.querySelector('[data-help-results]');
  const statusEl = root.querySelector('[data-help-status]');
  const actionsEl = root.querySelector('[data-help-actions]');

  const getCtx = () => (typeof options.getUserContext === 'function' ? options.getUserContext() : {});

  const renderRoute = async (message) => {
    const route = await handleSupportQuery({
      message,
      context: getCtx()
    });

    const articles = route.articles?.length ? route.articles : route.topArticle ? [route.topArticle] : [];
    resultsEl.innerHTML = articles.length
      ? `<ul class="ib-help-articles">${articles
          .map(
            (a) => `<li><strong>${escapeHtml(a.question)}</strong><p>${escapeHtml(a.answer)}</p></li>`
          )
          .join('')}</ul>`
      : '<p class="text-muted-sm">Eşleşen makale bulunamadı. Aşağıdaki kanalları deneyin.</p>';

    statusEl.hidden = false;
    statusEl.textContent = route.deflected
      ? `Öneri: ${route.intent} (${Math.round(route.confidence * 100)}% eşleşme)`
      : 'Canlı destek öneriliyor.';

    actionsEl.innerHTML = (route.actions || [])
      .map((action) => {
        if (action.type === 'whatsapp') {
          return `<a class="btn btn-success btn-sm" href="${escapeHtml(action.href)}" target="_blank" rel="noopener">${escapeHtml(action.label)}</a>`;
        }
        return `<a class="btn btn-outline btn-sm" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`;
      })
      .join('');

    return route;
  };

  let debounce;
  search?.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderRoute(search.value), 280);
  });

  toggle?.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      analytics.track('support_help_opened', { path: location.pathname }, { category: 'support' });
      renderRoute(search?.value || '');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  return {
    open: () => {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      analytics.track('support_help_opened', { path: location.pathname }, { category: 'support' });
    },
    route: renderRoute,
    enrollBillingHelp: (meta) => enrollBillingHelp({ ...getCtx(), ...meta }),
    enrollOnboardingHelp: (meta) => enrollOnboardingHelp({ ...getCtx(), ...meta }),
    submitTicket: (payload) => submitSupportTicket({ ...getCtx(), ...payload })
  };
}
