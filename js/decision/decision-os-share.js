/**
 * Decision OS v2 — shareable decision card (1080×1350 layout).
 */
import { escapeHtml } from '../core/security.js';

function esc(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {object} model
 */
export function buildShareCardModel(model = {}) {
  const verdict = model.verdict || { label: 'BEKLE', emoji: '🟡', color: '#F59E0B' };
  return {
    brand: 'isteBul AI',
    verdict: verdict.label,
    verdictEmoji: verdict.emoji,
    verdictColor: verdict.color,
    decisionScore: Number(model.decisionScore) || 0,
    confidencePercent: Number(model.confidencePercent) || 0,
    verticalLabel: model.verticalLabel || model.vertical || 'Karar',
    title: model.title || 'Karar Özeti',
    qrPlaceholder: true
  };
}

/**
 * @param {object} model
 */
export function renderShareCardHtml(model = {}) {
  const card = buildShareCardModel(model);

  return `
    <section class="dos-share" data-dos-share aria-label="Paylaşım kartı">
      <div class="dos-share__preview" data-dos-share-preview>
        <article class="dos-share__card" data-dos-share-card style="--dos-share-verdict: ${esc(card.verdictColor)}">
          <header class="dos-share__card-head">
            <span class="dos-share__brand">${esc(card.brand)}</span>
            <span class="dos-share__vertical">${esc(card.verticalLabel)}</span>
          </header>
          <div class="dos-share__verdict">
            <span class="dos-share__emoji" aria-hidden="true">${esc(card.verdictEmoji)}</span>
            <strong>${esc(card.verdict)}</strong>
          </div>
          <dl class="dos-share__stats">
            <div>
              <dt>Skor</dt>
              <dd>${esc(String(card.decisionScore))}/100</dd>
            </div>
            <div>
              <dt>Güven</dt>
              <dd>%${esc(String(card.confidencePercent))}</dd>
            </div>
          </dl>
          <div class="dos-share__qr" aria-label="QR kod alanı">
            <span class="dos-share__qr-placeholder">QR</span>
          </div>
        </article>
      </div>
      <button type="button" class="dos-btn dos-btn--primary" data-dos-share-copy>
        Kartı Paylaş
      </button>
      <p class="dos-share__feedback" data-dos-share-feedback hidden aria-live="polite"></p>
    </section>`;
}

/**
 * Build plain-text share payload for clipboard / Web Share API.
 * @param {object} model
 */
export function buildShareCardText(model = {}) {
  const card = buildShareCardModel(model);
  return [
    `${card.brand}`,
    `Karar: ${card.verdictEmoji} ${card.verdict}`,
    `Skor: ${card.decisionScore}/100`,
    `Güven: %${card.confidencePercent}`,
    '',
    'https://istebul.com'
  ].join('\n');
}

/**
 * @param {object} model
 */
export async function copyShareCard(model = {}) {
  const text = buildShareCardText(model);

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: 'clipboard' };
    }
  } catch {
    // fall through
  }

  return { ok: false, method: 'none', text };
}
