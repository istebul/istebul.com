/**
 * AI Listings Collector — admin preview UI (Sprint-13).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { runCollectorPreview, getCollectorSourceLabelTr } from '../ai-listings-collector/index.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function safeRenderText(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {Array<{ row: number, messages: string[] }>} errors
 * @returns {string}
 */
export function buildCollectorErrorsHtml(errors) {
  if (!errors?.length) {
    return '<p class="ai-listings-admin__muted">Hata yok.</p>';
  }

  return `
    <ul class="ai-collector-errors">
      ${errors
        .map(
          (entry) =>
            `<li><strong>Satır ${safeRenderText(entry.row)}:</strong> ${safeRenderText(entry.messages.join('; '))}</li>`
        )
        .join('')}
    </ul>`;
}

/**
 * @param {Record<string, unknown>} result
 * @returns {string}
 */
export function buildCollectorPreviewStatsHtml(result) {
  const summary = result.summary && typeof result.summary === 'object' ? result.summary : {};
  return `
    <dl class="ai-collector-stats">
      <div><dt>Kaynak tipi</dt><dd>${safeRenderText(summary.source_label ?? getCollectorSourceLabelTr(result.source_type))}</dd></div>
      <div><dt>Toplam kayıt</dt><dd>${safeRenderText(result.total_rows ?? 0)}</dd></div>
      <div><dt>Geçerli kayıt</dt><dd>${safeRenderText(result.valid_rows ?? 0)}</dd></div>
      <div><dt>Hatalı kayıt</dt><dd>${safeRenderText(result.invalid_rows ?? 0)}</dd></div>
      <div><dt>Duplicate adayı</dt><dd>${safeRenderText(result.duplicate_candidates ?? 0)}</dd></div>
      <div><dt>Repository hazır</dt><dd>${safeRenderText(result.repository_ready_rows ?? 0)}</dd></div>
    </dl>`;
}

/**
 * @param {Record<string, unknown>|null} [result]
 * @returns {string}
 */
export function buildCollectorPreviewHtml(result = null) {
  if (!result) {
    return `
      <div class="ai-collector-preview">
        <p class="ai-listings-admin__muted">Kaynak içeriğini yapıştırın ve Önizle'ye tıklayın.</p>
      </div>`;
  }

  return `
    <div class="ai-collector-preview">
      <p class="ai-collector-preview__summary">${safeRenderText(result.summary?.text ?? '')}</p>
      ${buildCollectorPreviewStatsHtml(result)}
      <h4>Hata listesi</h4>
      ${buildCollectorErrorsHtml(/** @type {Array<{ row: number, messages: string[] }>} */ (result.errors ?? []))}
    </div>`;
}

/**
 * @param {Record<string, unknown>|null} [result]
 * @returns {string}
 */
export function buildCollectorDashboardHtml(result = null) {
  return `
    <div class="ai-collector-dashboard">
      <header class="ai-collector-dashboard__head">
        <h2>Collector Preview</h2>
        <p class="ai-listings-admin__muted">CSV, JSON, XML, Partner Feed, Manual ve AI Builder kaynakları</p>
      </header>
      <div class="ai-collector-dashboard__form">
        <label>
          Kaynak formatı
          <select id="ai-collector-format">
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="xml">XML</option>
            <option value="partner_feed">Partner Feed</option>
            <option value="manual">Manual</option>
            <option value="ai_builder">AI Builder</option>
          </select>
        </label>
        <label>
          Kaynak içeriği
          <textarea id="ai-collector-content" rows="10" placeholder="category,title,description,price,currency,location,source_url"></textarea>
        </label>
        <div class="ai-collector-dashboard__actions">
          <button type="button" class="ai-listings-admin__btn ai-listings-admin__btn--ghost" data-collector-action="preview">Önizle</button>
          <button type="button" class="ai-listings-admin__btn ai-listings-admin__btn--primary" data-collector-action="save" disabled>Geçerli kayıtları kaydet</button>
          <button type="button" class="ai-listings-admin__btn" data-collector-action="save-analyze" disabled>Kaydet ve analiz et</button>
          <button type="button" class="ai-listings-admin__btn ai-listings-admin__btn--ghost" data-collector-action="download-errors" disabled>Hataları indir</button>
        </div>
      </div>
      <div id="ai-collector-preview-host">${buildCollectorPreviewHtml(result)}</div>
    </div>`;
}

/**
 * @param {Array<{ row: number, messages: string[] }>} errors
 * @returns {string}
 */
export function buildCollectorErrorsExportText(errors) {
  if (!errors?.length) return '';
  return errors.map((entry) => `Satır ${entry.row}: ${entry.messages.join('; ')}`).join('\n');
}

/**
 * @param {string} format
 * @param {string} content
 * @param {Array<Record<string, unknown>>} existingCandidates
 * @returns {Record<string, unknown>}
 */
export function previewCollectorContent(format, content, existingCandidates = []) {
  return runCollectorPreview(
    { format, content, source_type: format },
    existingCandidates
  );
}
