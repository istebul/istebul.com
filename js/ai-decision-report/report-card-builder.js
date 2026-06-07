/**
 * AI Decision Report — admin panel HTML builder (Sprint-19).
 */

import { escapeHtml } from '../core/dom-safe.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {string} title
 * @param {string} bodyHtml
 * @param {number} step
 * @returns {string}
 */
function timelineSection(title, bodyHtml, step) {
  return `
    <section class="ai-report__section">
      <div class="ai-report__section-head">
        <span class="ai-report__step">${step}</span>
        <h4>${safe(title)}</h4>
      </div>
      <div class="ai-report__section-body">${bodyHtml}</div>
    </section>
    <div class="ai-report__arrow">↓</div>`;
}

/**
 * @param {string[]} items
 * @param {string} listClass
 * @returns {string}
 */
function renderList(items, listClass = 'ai-report__list') {
  if (!Array.isArray(items) || !items.length) {
    return '<p class="ai-report__empty">Bilgi yok</p>';
  }
  return `<ul class="${listClass}">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {string} label
 * @returns {string}
 */
function labelClass(label) {
  const lower = String(label).toLowerCase();
  if (lower.includes('çok uygun')) return 'ai-report__label--excellent';
  if (lower.includes('uygun') && !lower.includes('uygun görünmüyor')) return 'ai-report__label--good';
  if (lower.includes('incelenebilir')) return 'ai-report__label--review';
  if (lower.includes('dikkatli')) return 'ai-report__label--caution';
  return 'ai-report__label--avoid';
}

/**
 * @param {ReturnType<import('./report-engine.js').runDecisionReport>} report
 * @param {{ title?: string, recordId?: string }} [meta]
 * @returns {string}
 */
export function buildDecisionReportPanelHtml(report, meta = {}) {
  const title = safe(meta.title ?? 'AI Decision Report');
  const rec = report.recommendation ?? {};
  const coach = report.decision_coach ?? {};
  const sim = report.decision_simulator ?? {};
  const risk = report.risk_analysis ?? {};
  const checklist = report.verification_checklist ?? { items: [] };
  const alternatives = report.alternatives ?? [];
  const final = report.final_decision ?? {};

  const checklistHtml = (checklist.items ?? [])
    .map((item) => `<li>${safe(item.symbol ?? '□')} ${safe(item.label)}</li>`)
    .join('');

  const altHtml = alternatives.length
    ? alternatives
        .map(
          (alt) => `
        <div class="ai-report__alt-card">
          <p class="ai-report__alt-title">Alternatif ${safe(alt.rank)} — ${safe(alt.title)}</p>
          <p class="ai-report__alt-reason"><strong>Neden?</strong> ${safe(alt.reason)}</p>
        </div>`
        )
        .join('')
    : '<p class="ai-report__empty">Alternatif bulunamadı</p>';

  const simBody = sim.available
    ? `<p class="ai-report__sim-flow">
        <span class="${labelClass(sim.old_label)}">${safe(sim.old_label)}</span>
        <span class="ai-report__sim-arrow">↓</span>
        <span class="${labelClass(sim.new_label)}">${safe(sim.new_label)}</span>
        <span class="ai-report__sim-delta">(${sim.delta > 0 ? '+' : ''}${safe(sim.delta)})</span>
      </p>
      ${renderList(sim.positive_reasons, 'ai-report__list ai-report__list--positive')}
      ${renderList(sim.negative_reasons, 'ai-report__list ai-report__list--negative')}`
    : `<p class="ai-report__muted">${safe(sim.summary)}</p>`;

  const sections = [
    timelineSection(
      'Executive',
      `<p class="ai-report__summary">${safe(report.executive_summary)}</p>`,
      1
    ),
    timelineSection(
      'Recommendation',
      `<p><span class="ai-report__label ${labelClass(rec.label)}">${safe(rec.label)}</span> · Fit ${safe(rec.fit_score)}</p>
       <p class="ai-report__muted">${safe(rec.summary)}</p>
       ${renderList(rec.reasons)}`,
      2
    ),
    timelineSection(
      'Coach',
      `<p><span class="ai-report__coach-label">${safe(coach.label)}</span> · ${safe(coach.confidence)}% güven</p>
       <p class="ai-report__muted">${safe(coach.summary)}</p>
       ${renderList(coach.should_consider, 'ai-report__list ai-report__list--positive')}`,
      3
    ),
    timelineSection('Simulator', simBody, 4),
    timelineSection('Strengths', renderList(report.strengths, 'ai-report__list ai-report__list--positive'), 5),
    timelineSection('Weaknesses', renderList(report.weaknesses, 'ai-report__list ai-report__list--negative'), 6),
    timelineSection('Risk', `<p><strong>${safe(risk.level)}</strong> risk · ${safe(risk.summary)}</p>${renderList(risk.reasons)}`, 7),
    timelineSection(
      'Checklist',
      `<ul class="ai-report__checklist">${checklistHtml || '<li>□ doğrulama maddesi yok</li>'}</ul>`,
      8
    ),
    timelineSection('Alternatives', altHtml, 9),
    `<section class="ai-report__section ai-report__section--final">
      <div class="ai-report__section-head">
        <span class="ai-report__step">10</span>
        <h4>Final Decision</h4>
      </div>
      <div class="ai-report__section-body">
        <p><span class="ai-report__label ${labelClass(final.label)}">${safe(final.label)}</span> · ${safe(final.confidence)}% güven</p>
        <p class="ai-report__summary">${safe(final.explanation)}</p>
      </div>
    </section>`
  ].join('');

  return `
    <aside class="ai-report-panel" data-report-panel${meta.recordId ? ` data-report-record-id="${safe(meta.recordId)}"` : ''} role="dialog" aria-label="AI Decision Report">
      <header class="ai-report-panel__head">
        <div>
          <p class="ai-report-panel__eyebrow">Karar Raporu</p>
          <h3 class="ai-report-panel__title">${title}</h3>
        </div>
        <button type="button" class="ai-report-panel__close" data-report-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-report-panel__body ai-report">
        ${sections}
      </div>
    </aside>
    <div class="ai-report-panel__backdrop" data-report-backdrop></div>`;
}

/**
 * @returns {string}
 */
export function buildDecisionReportShellHtml() {
  return '<div id="ai-report-panel-host" class="ai-report-panel-host" hidden></div>';
}
