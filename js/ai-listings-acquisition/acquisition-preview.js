/**
 * Data Acquisition — admin preview renderer (Sprint-9).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { getSourceLabelTr } from '../../supabase/functions/_shared/ai-listings/acquisition/source-detector.js';

/**
 * @param {Array<{ row: number, messages: string[] }>} errors
 * @returns {string}
 */
export function formatAcquisitionErrorsText(errors) {
  if (!Array.isArray(errors) || !errors.length) return '';
  return errors
    .map((entry) => `Satır ${entry.row}: ${entry.messages.join('; ')}`)
    .join('\n');
}

/**
 * @param {Record<string, unknown>} result
 * @param {{ compact?: boolean }} [options]
 * @returns {string}
 */
export function buildAcquisitionPreviewHtml(result, options = {}) {
  const compact = options.compact === true;
  const summary = result.summary && typeof result.summary === 'object' ? result.summary : {};
  const sourceLabel = escapeHtml(String(summary.source_label ?? getSourceLabelTr(String(result.source_type ?? 'manual'))));
  const total = escapeHtml(String(result.total_rows ?? 0));
  const valid = escapeHtml(String(result.valid_rows ?? 0));
  const invalid = escapeHtml(String(result.invalid_rows ?? 0));
  const duplicates = escapeHtml(String(result.duplicate_candidates ?? 0));
  const savable = escapeHtml(String(summary.savable_rows ?? result.valid_rows ?? 0));

  if (compact) {
    return `
      <section class="ai-listings-builder__acquisition-preview" data-acquisition-preview-compact>
        <h4>Veri Alma Özeti</h4>
        <dl class="ai-listings-builder__fields ai-listings-builder__fields--compact">
          <dt>Toplam</dt><dd>${total}</dd>
          <dt>Geçerli</dt><dd>${valid}</dd>
          <dt>Hatalı</dt><dd>${invalid}</dd>
          <dt>Duplicate adayı</dt><dd>${duplicates}</dd>
          <dt>Kaynak</dt><dd>${sourceLabel}</dd>
        </dl>
      </section>`;
  }

  const errorItems = Array.isArray(result.errors)
    ? result.errors
        .map(
          (entry) =>
            `<li><strong>Satır ${escapeHtml(String(entry.row))}:</strong> ${escapeHtml(entry.messages.join('; '))}</li>`
        )
        .join('')
    : '';

  const errorsBlock = errorItems
    ? `<ul class="ai-listings-admin__acquisition-errors">${errorItems}</ul>`
    : '<p class="ai-listings-admin__muted">Satır düzeyinde hata yok.</p>';

  const disabled = Number(result.valid_rows ?? 0) <= 0 ? ' disabled' : '';

  return `
    <section class="ai-listings-admin__acquisition-preview" data-acquisition-preview>
      <h4 class="ai-listings-admin__acquisition-title">Veri Alma Özeti</h4>
      <dl class="ai-listings-admin__acquisition-stats">
        <div><dt>Toplam</dt><dd>${total}</dd></div>
        <div><dt>Geçerli</dt><dd>${valid}</dd></div>
        <div><dt>Hatalı</dt><dd>${invalid}</dd></div>
        <div><dt>Duplicate adayı</dt><dd>${duplicates}</dd></div>
        <div><dt>Kaynak</dt><dd>${sourceLabel}</dd></div>
        <div><dt>Kaydedilebilir</dt><dd>${savable}</dd></div>
      </dl>
      <p class="ai-listings-admin__acquisition-summary-text">${escapeHtml(String(summary.text ?? ''))}</p>
      <div class="ai-listings-admin__acquisition-errors-wrap">
        <h5 class="ai-listings-admin__subsection-title">Hatalar</h5>
        ${errorsBlock}
      </div>
      <div class="ai-listings-admin__acquisition-actions">
        <button type="button" class="ai-listings-admin__btn ai-listings-admin__btn--primary" data-acquisition-action="save"${disabled}>Geçerli kayıtları kaydet</button>
        <button type="button" class="ai-listings-admin__btn" data-acquisition-action="save-analyze"${disabled}>Kaydet ve analiz et</button>
        <button type="button" class="ai-listings-admin__btn ai-listings-admin__btn--ghost" data-acquisition-action="copy-errors">Hataları kopyala</button>
        <button type="button" class="ai-listings-admin__btn ai-listings-admin__btn--ghost" data-acquisition-action="download-errors">Hataları indir</button>
      </div>
    </section>`;
}

/**
 * @param {Record<string, unknown>} createPayload
 * @returns {string}
 */
export function buildAcquisitionBuilderPreviewHtml(createPayload) {
  const row = {
    category: createPayload.category,
    title: createPayload.title,
    description: createPayload.description,
    price: createPayload.price,
    currency: createPayload.currency,
    location: createPayload.location,
    images: createPayload.images,
    attributes: createPayload.attributes,
    source_url: createPayload.source_url,
    source_type: 'ai_builder'
  };

  return buildAcquisitionPreviewHtml({
    source_type: 'ai_builder',
    total_rows: 1,
    valid_rows: row.category && row.title ? 1 : 0,
    invalid_rows: row.category && row.title ? 0 : 1,
    duplicate_candidates: 0,
    errors: row.category && row.title ? [] : [{ row: 1, messages: ['category ve title zorunludur'] }],
    summary: {
      source_label: 'AI Builder',
      savable_rows: row.category && row.title ? 1 : 0,
      text: row.category && row.title ? 'AI Builder kaydı kaydedilebilir.' : 'AI Builder kaydı eksik alan içeriyor.'
    }
  });
}
