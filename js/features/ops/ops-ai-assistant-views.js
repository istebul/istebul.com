/**
 * P15 — Admin HTML for ops AI decision assistant.
 */

const DOMAIN_LABELS = {
  growth: 'Growth',
  funnel: 'Funnel',
  churn: 'Churn',
  partner: 'Partner',
  pricing: 'Pricing',
  conversion: 'Conversion'
};

/**
 * @param {ReturnType<import('./ops-decision-assistant.js').buildOpsDecisionBrief>} brief
 * @param {function} escapeHtml
 * @param {{ aiText?: string, aiError?: string }} [ui]
 */
export function renderOpsAiAssistantPage(brief, escapeHtml, ui = {}) {
  const sevClass =
    brief.overallSeverity === 'critical'
      ? 'ib-dash-health--crit'
      : brief.overallSeverity === 'warning'
        ? 'ib-dash-health--warn'
        : 'ib-dash-health--ok';

  const cards = (brief.insights || [])
    .map((ins) => {
      const badge =
        ins.severity === 'critical'
          ? 'badge-red'
          : ins.severity === 'warning'
            ? 'badge-yellow'
            : 'badge-blue';
      return `
      <article class="ib-ops-insight-card ib-ops-insight--${escapeHtml(ins.severity)}">
        <header class="ib-ops-insight-head">
          <span class="badge ${badge}">${escapeHtml(ins.severity)}</span>
          <span class="text-muted-sm">${escapeHtml(DOMAIN_LABELS[ins.domain] || ins.domain)}</span>
        </header>
        <h4>${escapeHtml(ins.title)}</h4>
        <p class="ib-ops-insight-summary">${escapeHtml(ins.summary)}</p>
        <ul class="ib-ops-insight-recs">
          ${(ins.recommendations || []).map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </article>`;
    })
    .join('');

  const aiBlock = ui.aiText
    ? `<div class="ib-ops-ai-narration"><p class="ib-dash-kicker">AI executive summary (bounded)</p><div class="ib-ops-ai-text">${escapeHtml(ui.aiText).replace(/\n/g, '<br>')}</div></div>`
    : ui.aiError
      ? `<p class="text-muted-sm">${escapeHtml(ui.aiError)}</p>`
      : '';

  return `
    <p class="ib-dash-muted">P15 Ops Decision Assistant · ${brief.insightCount} deterministic insights · Son ${brief.windowDays} gün verisi</p>

    <div class="ib-dash-health ${sevClass}">
      <p class="ib-dash-kicker">Operational posture</p>
      <strong>${escapeHtml(brief.overallSeverity)}</strong>
      <span class="text-muted-sm"> · Ops center: ${escapeHtml(brief.opsHealth)} · CEO alerts: ${brief.triggeredCeoAlerts}</span>
    </div>

    <div class="ib-ops-ai-toolbar">
      <button type="button" class="btn btn-primary btn-sm" id="ops-ai-request-narration">AI özet üret (Groq)</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="ops-command-center">Ops Command Center</button>
      <button type="button" class="btn btn-ghost btn-sm" data-page-target="dashboard-ceo">CEO Dashboard</button>
    </div>

    ${aiBlock}

    <div class="ib-ops-insight-grid">${cards || '<p class="empty">No insights in current window.</p>'}</div>
  `;
}
