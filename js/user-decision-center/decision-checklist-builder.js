/**
 * User Decision Center — checklist builder (Sprint-30).
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
 * @param {Array<Record<string, unknown>>} items
 * @returns {string}
 */
export function buildDecisionChecklistHtml(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return `
      <section class="udc-checklist" aria-label="Kontrol listesi">
        <h4>Kontrol Listesi</h4>
        <p class="udc-muted">Kontrol listesi henüz oluşturulmadı.</p>
      </section>`;
  }

  return `
    <section class="udc-checklist" aria-label="Kontrol listesi">
      <h4>Kontrol Listesi</h4>
      <ul class="udc-checklist__list" role="list">
        ${items
          .map(
            (item) => `
          <li class="udc-checklist__item ${item.done ? 'udc-checklist__item--done' : ''}">
            <span class="udc-checklist__status" aria-hidden="true">${item.done ? '✓' : '○'}</span>
            <div>
              <strong>${safe(item.label)}</strong>
              ${item.note ? `<small>${safe(item.note)}</small>` : ''}
            </div>
          </li>`
          )
          .join('')}
      </ul>
    </section>`;
}
