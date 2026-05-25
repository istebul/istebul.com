/**
 * P15 — Admin loader for AI operational decision assistant.
 */
import { fetchInternalDashboardContext, invalidateInternalDashboardCache } from './internal-dashboards.js';
import { buildOpsDecisionBrief } from '../features/ops/ops-decision-assistant.js';
import { renderOpsAiAssistantPage } from '../features/ops/ops-ai-assistant-views.js';
import { requestOpsAiNarration } from '../features/ops/ops-ai-narration.js';

let lastBrief = null;

/**
 * @param {object} deps
 * @param {function} escapeHtml
 * @param {function} renderAdminWarningBanner
 */
export async function loadOpsAiAssistant(deps, escapeHtml, renderAdminWarningBanner) {
  const root = document.getElementById('ops-ai-assistant-root');
  if (!root) return;

  root.innerHTML = '<div class="empty">Metrikler analiz ediliyor…</div>';

  let pricingReference = { proMonthlyTry: 299, proAnnualTry: 2870, trialDays: 7 };
  try {
    const cfgRes = await fetch('/data/ops/ops-decision-assistant.json');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      pricingReference = cfg.pricingReference || pricingReference;
    }
  } catch {
    /* optional */
  }

  try {
    const { ctx, warnings } = await fetchInternalDashboardContext(deps);
    const events = await deps.getAnalyticsEvents48h?.() || [];

    lastBrief = buildOpsDecisionBrief(ctx, {
      pricingReference,
      analyticsEvents: events
    });

    root.innerHTML =
      renderAdminWarningBanner(warnings) +
      renderOpsAiAssistantPage(lastBrief, escapeHtml, {});

    bindOpsAiAssistantUi(root, escapeHtml);
  } catch (err) {
    root.innerHTML = `<p class="empty">Hata: ${escapeHtml(err?.message || String(err))}</p>`;
  }
}

/**
 * @param {HTMLElement} root
 * @param {function} escapeHtml
 */
function bindOpsAiAssistantUi(root, escapeHtml) {
  root.querySelector('#ops-ai-request-narration')?.addEventListener('click', async () => {
    const btn = root.querySelector('#ops-ai-request-narration');
    if (!lastBrief || !btn) return;
    btn.disabled = true;
    btn.textContent = 'AI özet üretiliyor…';

    const result = await requestOpsAiNarration(lastBrief);
    const toolbar = root.querySelector('.ib-ops-ai-toolbar');
    const oldNarration = root.querySelector('.ib-ops-ai-narration');
    oldNarration?.remove();

    const narrationEl = document.createElement('div');
    if (result.ok && result.text) {
      narrationEl.className = 'ib-ops-ai-narration';
      narrationEl.innerHTML = `<p class="ib-dash-kicker">AI executive summary (bounded)</p><div class="ib-ops-ai-text">${escapeHtml(result.text).replace(/\n/g, '<br>')}</div>`;
    } else {
      narrationEl.className = 'text-muted-sm';
      narrationEl.style.margin = '0 0 16px';
      narrationEl.textContent = result.message || 'AI özeti kullanılamıyor.';
    }
    toolbar?.insertAdjacentElement('afterend', narrationEl);

    btn.disabled = false;
    btn.textContent = 'AI özet üret (Groq)';
  });
}

export function refreshOpsAiAssistantCache() {
  invalidateInternalDashboardCache();
  lastBrief = null;
}
