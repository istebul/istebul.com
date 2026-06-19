/**
 * Tercih Profili — admin panel HTML builder (Sprint-32 / Faz E).
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
 * @param {Record<string, unknown>} profileResult
 * @param {Record<string, unknown>} [personalizationResult]
 * @returns {string}
 */
export function buildPreferenceProfilePanelHtml(profileResult, personalizationResult = {}) {
  const items = /** @type {Array<Record<string, unknown>>} */ (profileResult.items ?? []);
  const disclaimer = safe(
    profileResult.disclaimer ??
      'Bu tercihler kullanım davranışlarınızdan ve açık seçimlerinizden türetilmiştir. Tercihlerinizi istediğiniz zaman değiştirebilirsiniz.'
  );
  const styleLabel = safe(
    /** @type {Record<string, unknown>} */ (personalizationResult.style ?? {}).primaryStyleLabel ?? ''
  );
  const summary = /** @type {Record<string, unknown>} */ (
    /** @type {Record<string, unknown>} */ (personalizationResult.personalization ?? {}).display ?? {}
  ).summary ?? {};

  const itemsHtml = items.length
    ? `<ul class="ai-pref-panel__list">${items
        .map(
          (item) => `
        <li class="ai-pref-panel__item">
          <span class="ai-pref-panel__label">${safe(item.label)}</span>
          <div class="ai-pref-panel__bar" role="progressbar" aria-valuenow="${safe(item.value)}" aria-valuemin="0" aria-valuemax="100">
            <span class="ai-pref-panel__bar-fill" style="width:${safe(item.value)}%"></span>
          </div>
          <span class="ai-pref-panel__value">${safe(item.value)}</span>
        </li>`
        )
        .join('')}</ul>`
    : '<p class="ai-pref-panel__empty">Tercih profili henüz oluşturulmadı.</p>';

  const bullets = /** @type {string[]} */ (summary.bullets ?? []);
  const bulletsHtml = bullets.length
    ? `<ul class="ai-pref-panel__bullets">${bullets.map((b) => `<li>${safe(b)}</li>`).join('')}</ul>`
    : '';

  return `
    <section class="ai-pref-panel" aria-labelledby="ai-pref-panel-title">
      <header class="ai-pref-panel__header">
        <h3 id="ai-pref-panel-title">Tercih Profili</h3>
        ${styleLabel ? `<p class="ai-pref-panel__style">${styleLabel}</p>` : ''}
      </header>
      ${itemsHtml}
      ${bulletsHtml}
      <p class="ai-pref-panel__disclaimer">${disclaimer}</p>
    </section>`;
}
