/**
 * Executive Decision Report v1 — admin panel HTML builder (Sprint-26).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { REPORT_LEVEL_LABELS } from './report-summary-engine.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {'positive'|'neutral'|'warning'|'negative'|string} status
 * @returns {string}
 */
function statusClass(status) {
  if (status === 'positive') return 'ai-edr-panel__status--positive';
  if (status === 'negative') return 'ai-edr-panel__status--negative';
  if (status === 'warning') return 'ai-edr-panel__status--warning';
  return 'ai-edr-panel__status--neutral';
}

/**
 * @param {'low'|'medium'|'high'|string} level
 * @returns {string}
 */
function riskBadgeClass(level) {
  if (level === 'low') return 'ai-edr-panel__badge--low';
  if (level === 'high') return 'ai-edr-panel__badge--high';
  return 'ai-edr-panel__badge--mid';
}

/**
 * @param {string[]} items
 * @param {string} listClass
 * @returns {string}
 */
function renderList(items, listClass) {
  if (!Array.isArray(items) || !items.length) {
    return '<p class="ai-edr-panel__empty">Bilgi yok</p>';
  }
  return `<ul class="${listClass}">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {Record<string, unknown>} section
 * @returns {string}
 */
function renderSection(section) {
  if (!section || typeof section !== 'object') {
    return '<p class="ai-edr-panel__empty">Bölüm üretilemedi.</p>';
  }

  const bullets = Array.isArray(section.bullets) ? section.bullets : [];
  const dataTag = section.dataAvailable
    ? '<span class="ai-edr-panel__data-tag ai-edr-panel__data-tag--ok">Veri mevcut</span>'
    : '<span class="ai-edr-panel__data-tag ai-edr-panel__data-tag--missing">Veri sınırlı</span>';

  return `
    <div class="ai-edr-panel__section-card ${statusClass(String(section.status))}">
      <div class="ai-edr-panel__section-head">
        <h5>${safe(section.title)}</h5>
        <div class="ai-edr-panel__section-meta">
          <span class="ai-edr-panel__section-score">${safe(section.score)}</span>
          ${dataTag}
        </div>
      </div>
      <p class="ai-edr-panel__section-summary">${safe(section.summary)}</p>
      ${renderList(bullets, 'ai-edr-panel__list')}
    </div>`;
}

/**
 * @param {Record<string, unknown>} snapshot
 * @returns {string}
 */
function renderDecisionSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return '<p class="ai-edr-panel__empty">Karar özeti üretilemedi.</p>';
  }

  return `
    <div class="ai-edr-panel__snapshot">
      <div class="ai-edr-panel__snapshot-row">
        <span class="ai-edr-panel__snapshot-label">Karar etiketi</span>
        <span class="ai-edr-panel__snapshot-value">${safe(snapshot.primaryDecisionLabel)}</span>
      </div>
      <div class="ai-edr-panel__snapshot-grid">
        <div class="ai-edr-panel__snapshot-metric">
          <span class="ai-edr-panel__snapshot-label">Karar skoru</span>
          <span class="ai-edr-panel__snapshot-value">${safe(snapshot.decisionScore)}</span>
        </div>
        <div class="ai-edr-panel__snapshot-metric">
          <span class="ai-edr-panel__snapshot-label">Güven skoru</span>
          <span class="ai-edr-panel__snapshot-value">${safe(snapshot.confidenceScore)}</span>
        </div>
        <div class="ai-edr-panel__snapshot-metric">
          <span class="ai-edr-panel__snapshot-label">Öneri skoru</span>
          <span class="ai-edr-panel__snapshot-value">${safe(snapshot.recommendationScore)}</span>
        </div>
        <div class="ai-edr-panel__snapshot-metric">
          <span class="ai-edr-panel__snapshot-label">Kalite</span>
          <span class="ai-edr-panel__snapshot-value">${safe(snapshot.qualityScore)}</span>
        </div>
        <div class="ai-edr-panel__snapshot-metric">
          <span class="ai-edr-panel__snapshot-label">Güven</span>
          <span class="ai-edr-panel__snapshot-value">${safe(snapshot.trustScore)}</span>
        </div>
        <div class="ai-edr-panel__snapshot-metric">
          <span class="ai-edr-panel__snapshot-label">Açıklama</span>
          <span class="ai-edr-panel__snapshot-value">${safe(snapshot.explanationScore)}</span>
        </div>
      </div>
      <div class="ai-edr-panel__snapshot-row">
        <span class="ai-edr-panel__snapshot-label">Risk seviyesi</span>
        <span class="ai-edr-panel__badge ${riskBadgeClass(String(snapshot.riskLevel))}">${safe(snapshot.riskLevel)}</span>
      </div>
      <div class="ai-edr-panel__snapshot-row">
        <span class="ai-edr-panel__snapshot-label">Önerilen eylem</span>
        <span class="ai-edr-panel__snapshot-value">${safe(snapshot.primaryAction)}</span>
      </div>
    </div>`;
}

/**
 * @param {Record<string, unknown>} riskSummary
 * @returns {string}
 */
function renderRiskSummary(riskSummary) {
  if (!riskSummary || typeof riskSummary !== 'object') {
    return '<p class="ai-edr-panel__empty">Risk özeti üretilemedi.</p>';
  }

  const topRisks = Array.isArray(riskSummary.topRisks) ? riskSummary.topRisks : [];
  const criticalWarnings = Array.isArray(riskSummary.criticalWarnings) ? riskSummary.criticalWarnings : [];

  const risksHtml = topRisks.length
    ? `<ul class="ai-edr-panel__risk-list">${topRisks
        .map(
          (r) => {
            const risk = /** @type {Record<string, unknown>} */ (r);
            return `<li class="ai-edr-panel__risk-item">
            <span class="ai-edr-panel__risk-label">${safe(risk.label)}</span>
            <span class="ai-edr-panel__risk-severity">${safe(risk.severity)}</span>
            <p class="ai-edr-panel__risk-text">${safe(risk.explanation)}</p>
          </li>`;
          }
        )
        .join('')}</ul>`
    : '<p class="ai-edr-panel__empty">Belirgin risk tespit edilmedi.</p>';

  return `
    <div class="ai-edr-panel__risk-wrap">
      <div class="ai-edr-panel__risk-head">
        <span class="ai-edr-panel__badge ${riskBadgeClass(String(riskSummary.riskLevel))}">${safe(riskSummary.riskLevel)}</span>
        <p class="ai-edr-panel__risk-explanation">${safe(riskSummary.riskExplanation)}</p>
      </div>
      ${criticalWarnings.length ? `
      <div class="ai-edr-panel__critical">
        <h5>Kritik uyarılar</h5>
        ${renderList(criticalWarnings, 'ai-edr-panel__list ai-edr-panel__list--warn')}
      </div>` : ''}
      <h5>Öncelikli riskler</h5>
      ${risksHtml}
    </div>`;
}

/**
 * @param {Record<string, unknown>} actionPlan
 * @returns {string}
 */
function renderActionPlan(actionPlan) {
  if (!actionPlan || typeof actionPlan !== 'object') {
    return '<p class="ai-edr-panel__empty">Eylem planı üretilemedi.</p>';
  }

  const categories = [
    { key: 'immediateActions', label: 'Hemen yapılacaklar' },
    { key: 'beforeNegotiation', label: 'Pazarlık öncesi' },
    { key: 'beforePurchase', label: 'Satın alma öncesi' },
    { key: 'documentsToCheck', label: 'Kontrol edilecek belgeler' },
    { key: 'finalReview', label: 'Son inceleme' }
  ];

  return categories
    .map(({ key, label }) => {
      const items = Array.isArray(actionPlan[key]) ? actionPlan[key] : [];
      return `
      <div class="ai-edr-panel__action-group">
        <h5>${safe(label)}</h5>
        ${renderList(items, 'ai-edr-panel__list')}
      </div>`;
    })
    .join('');
}

/**
 * @param {Record<string, unknown>} result
 * @param {{ title?: string, recordId?: string }} [meta]
 * @returns {string}
 */
export function buildExecutiveReportPanelHtml(result, meta = {}) {
  if (!result || typeof result !== 'object' || result.reportScore == null) {
    return `
    <aside class="ai-edr-panel" role="dialog" aria-modal="true" aria-label="Yönetici Karar Raporu">
      <header class="ai-edr-panel__head">
        <div>
          <p class="ai-edr-panel__eyebrow">Yönetici Karar Raporu</p>
          <h3 class="ai-edr-panel__title">${safe(meta.title ?? 'Yönetici Raporu')}</h3>
        </div>
        <button type="button" class="ai-edr-panel__close" data-edr-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-edr-panel__body">
        <p class="ai-edr-panel__empty">Bu öneri için yönetici karar raporu üretilemedi.</p>
      </div>
    </aside>
    <div class="ai-edr-panel__backdrop" data-edr-backdrop></div>`;
  }

  const levelLabel = REPORT_LEVEL_LABELS[String(result.reportLevel)] ?? safe(result.reportLabel);

  return `
    <aside class="ai-edr-panel" role="dialog" aria-modal="true" aria-label="Yönetici Karar Raporu" data-edr-record-id="${safe(meta.recordId ?? '')}">
      <header class="ai-edr-panel__head">
        <div>
          <p class="ai-edr-panel__eyebrow">Yönetici Karar Raporu</p>
          <h3 class="ai-edr-panel__title">${safe(meta.title ?? 'Yönetici Raporu')}</h3>
        </div>
        <button type="button" class="ai-edr-panel__close" data-edr-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-edr-panel__body">
        <section class="ai-edr-panel__hero">
          <div class="ai-edr-panel__hero-score">
            <span class="ai-edr-panel__hero-value">${safe(result.reportScore)}</span>
            <span class="ai-edr-panel__hero-label">Rapor Skoru</span>
          </div>
          <span class="ai-edr-panel__hero-level">${safe(levelLabel)}</span>
        </section>

        <section class="ai-edr-panel__section">
          <h4>Yönetici özeti</h4>
          <p class="ai-edr-panel__summary">${safe(result.executiveSummary)}</p>
        </section>

        <section class="ai-edr-panel__section">
          <h4>Karar özeti</h4>
          ${renderDecisionSnapshot(/** @type {Record<string, unknown>} */ (result.decisionSnapshot))}
        </section>

        <section class="ai-edr-panel__section">
          <h4>Skorlar</h4>
          <div class="ai-edr-panel__scores-grid">
            <div class="ai-edr-panel__score-item"><span>Rapor</span><strong>${safe(result.reportScore)}</strong></div>
            <div class="ai-edr-panel__score-item"><span>Öneri</span><strong>${safe(result.decisionSnapshot?.recommendationScore)}</strong></div>
            <div class="ai-edr-panel__score-item"><span>Karar</span><strong>${safe(result.decisionSnapshot?.decisionScore)}</strong></div>
            <div class="ai-edr-panel__score-item"><span>Güven</span><strong>${safe(result.decisionSnapshot?.confidenceScore)}</strong></div>
            <div class="ai-edr-panel__score-item"><span>Kalite</span><strong>${safe(result.decisionSnapshot?.qualityScore)}</strong></div>
            <div class="ai-edr-panel__score-item"><span>Açıklama</span><strong>${safe(result.decisionSnapshot?.explanationScore)}</strong></div>
          </div>
        </section>

        <section class="ai-edr-panel__section">
          <h4>Öneri</h4>
          ${renderSection(/** @type {Record<string, unknown>} */ (result.recommendationSection))}
        </section>

        <section class="ai-edr-panel__section">
          <h4>Sahip olma maliyeti</h4>
          ${renderSection(/** @type {Record<string, unknown>} */ (result.ownershipCostSection))}
        </section>

        <section class="ai-edr-panel__section">
          <h4>Kalite ve güven</h4>
          ${renderSection(/** @type {Record<string, unknown>} */ (result.qualityTrustSection))}
        </section>

        <section class="ai-edr-panel__section">
          <h4>Pazarlık zekâsı</h4>
          ${renderSection(/** @type {Record<string, unknown>} */ (result.negotiationSection))}
        </section>

        <section class="ai-edr-panel__section">
          <h4>Satın alma kararı</h4>
          ${renderSection(/** @type {Record<string, unknown>} */ (result.purchaseDecisionSection))}
        </section>

        <section class="ai-edr-panel__section">
          <h4>Karar açıklaması</h4>
          ${renderSection(/** @type {Record<string, unknown>} */ (result.explainabilitySection))}
        </section>

        <section class="ai-edr-panel__section">
          <h4>Risk özeti</h4>
          ${renderRiskSummary(/** @type {Record<string, unknown>} */ (result.riskSummary))}
        </section>

        <section class="ai-edr-panel__section">
          <h4>Eylem planı</h4>
          ${renderActionPlan(/** @type {Record<string, unknown>} */ (result.actionPlan))}
        </section>

        <section class="ai-edr-panel__section">
          <h4>Veri sınırlamaları</h4>
          ${renderList(result.dataLimitations, 'ai-edr-panel__list ai-edr-panel__list--gap')}
        </section>

        <section class="ai-edr-panel__section">
          <h4>Doğrulama kontrol listesi</h4>
          ${renderList(result.verificationChecklist, 'ai-edr-panel__list')}
        </section>

        <section class="ai-edr-panel__section ai-edr-panel__section--pdf">
          <h4>PDF dışa aktarım</h4>
          <p class="ai-edr-panel__pdf-ready">PDF payload hazır — dışa aktarım için normalize edilmiş veri mevcut.</p>
          <p class="ai-edr-panel__pdf-meta">Başlık: ${safe(result.pdfPayload?.title)} · Kategori: ${safe(result.pdfPayload?.category)}</p>
        </section>
      </div>
    </aside>
    <div class="ai-edr-panel__backdrop" data-edr-backdrop></div>`;
}

/**
 * @returns {string}
 */
export function buildExecutiveReportShellHtml() {
  return '<div id="ai-edr-panel-host" class="ai-edr-panel-host" hidden></div>';
}
