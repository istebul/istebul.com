/**
 * User Decision Center — panel with tabs (Sprint-30–33).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { buildUserDecisionCenterHtml } from './decision-center-builder.js';
import { buildHistoryTimelineHtml } from '../decision-history/history-timeline-builder.js';
import { buildPreferenceProfileHtml } from '../preference-intelligence/preference-profile-builder.js';
import { buildFeedbackFormHtml } from '../decision-feedback/feedback-builder.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

const TABS = Object.freeze([
  { id: 'overview', label: 'Genel Bakış' },
  { id: 'history', label: 'Karar Geçmişi' },
  { id: 'preferences', label: 'Tercih Profili' },
  { id: 'feedback', label: 'Geri Bildirim' }
]);

/**
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
export function buildUserDecisionPanelHtml(data = {}) {
  const activeTab = String(data.activeTab ?? 'overview');

  return `
    <div class="udc-panel" data-udc-panel>
      <nav class="udc-panel__tabs" role="tablist" aria-label="Karar Merkezi sekmeleri">
        ${TABS.map(
          (tab) => `
          <button
            type="button"
            class="udc-panel__tab ${tab.id === activeTab ? 'udc-panel__tab--active' : ''}"
            role="tab"
            aria-selected="${tab.id === activeTab ? 'true' : 'false'}"
            aria-controls="udc-panel-${safe(tab.id)}"
            id="udc-tab-${safe(tab.id)}"
            data-udc-tab="${safe(tab.id)}"
          >${safe(tab.label)}</button>`
        ).join('')}
      </nav>

      <div class="udc-panel__content">
        <div
          class="udc-panel__pane ${activeTab === 'overview' ? 'udc-panel__pane--active' : ''}"
          role="tabpanel"
          id="udc-panel-overview"
          aria-labelledby="udc-tab-overview"
          ${activeTab !== 'overview' ? 'hidden' : ''}
        >
          ${data.decisionContext ? buildUserDecisionCenterHtml(data.decisionContext) : '<p class="udc-muted">Bir ilan seçerek karar analizini görüntüleyin.</p>'}
        </div>

        <div
          class="udc-panel__pane ${activeTab === 'history' ? 'udc-panel__pane--active' : ''}"
          role="tabpanel"
          id="udc-panel-history"
          aria-labelledby="udc-tab-history"
          ${activeTab !== 'history' ? 'hidden' : ''}
        >
          ${buildHistoryTimelineHtml(data.history ?? {})}
        </div>

        <div
          class="udc-panel__pane ${activeTab === 'preferences' ? 'udc-panel__pane--active' : ''}"
          role="tabpanel"
          id="udc-panel-preferences"
          aria-labelledby="udc-tab-preferences"
          ${activeTab !== 'preferences' ? 'hidden' : ''}
        >
          ${buildPreferenceProfileHtml(data.preferences ?? {})}
        </div>

        <div
          class="udc-panel__pane ${activeTab === 'feedback' ? 'udc-panel__pane--active' : ''}"
          role="tabpanel"
          id="udc-panel-feedback"
          aria-labelledby="udc-tab-feedback"
          ${activeTab !== 'feedback' ? 'hidden' : ''}
        >
          ${buildFeedbackFormHtml(data.feedback ?? {})}
        </div>
      </div>
    </div>`;
}

/**
 * @param {HTMLElement} root
 * @param {{ onTabChange?: (tab: string) => void }} [handlers]
 */
export function bindUserDecisionPanel(root, handlers = {}) {
  if (!root) return;

  root.addEventListener('click', (event) => {
    const tabBtn = event.target.closest('[data-udc-tab]');
    if (!tabBtn || !root.contains(tabBtn)) return;

    const tabId = tabBtn.getAttribute('data-udc-tab');
    if (!tabId) return;

    root.querySelectorAll('[data-udc-tab]').forEach((btn) => {
      const isActive = btn.getAttribute('data-udc-tab') === tabId;
      btn.classList.toggle('udc-panel__tab--active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    root.querySelectorAll('.udc-panel__pane').forEach((pane) => {
      const paneId = pane.id?.replace('udc-panel-', '');
      const isActive = paneId === tabId;
      pane.classList.toggle('udc-panel__pane--active', isActive);
      if (isActive) pane.removeAttribute('hidden');
      else pane.setAttribute('hidden', '');
    });

    if (typeof handlers.onTabChange === 'function') {
      handlers.onTabChange(tabId);
    }
  });
}
