/**
 * Executive Decision Engine — builder preview HTML (Sprint-8).
 */

import { escapeHtml } from '../../core/dom-safe.js';

/**
 * @param {Record<string, unknown>|null|undefined} executive
 * @returns {string}
 */
export function buildExecutivePreviewHtml(executive) {
  if (!executive || typeof executive !== 'object') {
    return '';
  }

  const label = escapeHtml(String(executive.executive_label ?? '—'));
  const confidence = Number(executive.executive_confidence);
  const confidenceLabel = Number.isFinite(confidence) ? `%${Math.round(confidence)}` : '—';

  return `
    <section class="ai-listings-builder__executive-preview" data-executive-preview>
      <h4>AI Ön Kararı</h4>
      <dl class="ai-listings-builder__fields ai-listings-builder__fields--compact">
        <dt>Karar</dt><dd>${label}</dd>
        <dt>Karar Güveni</dt><dd>${escapeHtml(confidenceLabel)}</dd>
      </dl>
      <p class="ai-listings-builder__executive-note">Deterministik analiz ön değerlendirmesidir.</p>
    </section>`;
}
