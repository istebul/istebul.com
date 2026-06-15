/**
 * P16-3A — Admin loader for LinkedIn operasyon asistanı (lint-only MVP).
 */
import {
  renderLinkedInLintPanel,
  bindLinkedInLintPanel
} from '../features/ops/linkedin-ops-lint-views.js';

/**
 * @param {(value: unknown) => string} escapeHtml
 */
export async function loadLinkedInOpsAssistant(escapeHtml) {
  const root = document.getElementById('linkedin-ops-assistant-root');
  if (!root) return;

  try {
    renderLinkedInLintPanel(root, { escapeHtml });
    bindLinkedInLintPanel(root, { escapeHtml });
  } catch (err) {
    root.innerHTML = `<p class="empty" role="alert">LinkedIn operasyon paneli yüklenemedi: ${escapeHtml(err?.message || String(err))}</p>`;
  }
}
