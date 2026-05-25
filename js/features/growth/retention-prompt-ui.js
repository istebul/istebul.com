/**
 * P5.4 — Lightweight revisit / reactivation banner.
 */
import { escapeHtml } from '../../core/dom-safe.js';

let bannerEl = null;

/**
 * @param {ReturnType<import('./retention-revisit.js').evaluateRevisitTrigger>} trigger
 */
export function renderRetentionPrompt(trigger) {
  if (typeof document === 'undefined' || !trigger || trigger.level === 'none' || trigger.level === 'cooldown') {
    removeRetentionPrompt();
    return;
  }

  removeRetentionPrompt();

  bannerEl = document.createElement('aside');
  bannerEl.className = 'retention-revisit-banner';
  bannerEl.setAttribute('role', 'status');
  bannerEl.dataset.retentionLevel = trigger.level;
  bannerEl.innerHTML = `
    <div class="retention-revisit-inner">
      <p class="retention-revisit-text">${escapeHtml(trigger.message)}</p>
      <div class="retention-revisit-actions">
        <a class="btn btn-primary btn-sm" href="${escapeHtml(trigger.ctaPath || '/auto/')}" data-retention-cta="primary">Devam et</a>
        <button type="button" class="btn btn-ghost btn-sm" data-retention-dismiss aria-label="Kapat">Kapat</button>
      </div>
    </div>
  `;

  bannerEl.querySelector('[data-retention-dismiss]')?.addEventListener('click', () => {
    removeRetentionPrompt();
  });

  const host = document.getElementById('main-content') || document.body;
  host.insertAdjacentElement('afterbegin', bannerEl);
}

export function removeRetentionPrompt() {
  bannerEl?.remove();
  bannerEl = null;
}
