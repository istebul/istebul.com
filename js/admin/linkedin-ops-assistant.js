/**
 * P16-4A-2 — Admin loader for LinkedIn operasyon asistanı (plan + templates + comments + lint).
 */
import { OPS_JSON_EMBED } from './ops-json-embed.js';
import { renderLinkedInPlanSection } from '../features/ops/linkedin-ops-plan-views.js';
import { renderLinkedInTemplateSection } from '../features/ops/linkedin-ops-template-views.js';
import {
  renderLinkedInCommentPanel,
  bindLinkedInCommentPanel
} from '../features/ops/linkedin-ops-comment-views.js';
import {
  renderLinkedInLintPanel,
  bindLinkedInLintPanel
} from '../features/ops/linkedin-ops-lint-views.js';

/**
 * @param {string} embedKey
 * @returns {object | null}
 */
function readOpsEmbedDoc(embedKey) {
  const data = OPS_JSON_EMBED[embedKey];
  if (!data || typeof data !== 'object') return null;
  return structuredClone(data);
}

/**
 * @param {(value: unknown) => string} escapeHtml
 */
export async function loadLinkedInOpsAssistant(escapeHtml) {
  const root = document.getElementById('linkedin-ops-assistant-root');
  if (!root) return;

  try {
    const weeklyPlan = readOpsEmbedDoc('linkedin-weekly-plan');
    const templatesDoc = readOpsEmbedDoc('linkedin-templates');

    root.innerHTML = `
      <div class="linkedin-ops-layout">
        <section id="linkedin-ops-plan-section" class="linkedin-ops-section" aria-labelledby="linkedin-ops-plan-heading"></section>
        <section id="linkedin-ops-template-section" class="linkedin-ops-section" aria-labelledby="linkedin-ops-template-heading"></section>
        <section id="linkedin-ops-comment-section" class="linkedin-ops-section" aria-labelledby="linkedin-ops-comment-heading"></section>
        <section id="linkedin-ops-lint-section" class="linkedin-ops-section" aria-labelledby="linkedin-ops-lint-heading"></section>
      </div>
    `;

    renderLinkedInPlanSection(root.querySelector('#linkedin-ops-plan-section'), weeklyPlan, {
      escapeHtml
    });
    renderLinkedInTemplateSection(root.querySelector('#linkedin-ops-template-section'), templatesDoc, {
      escapeHtml
    });

    const commentSection = root.querySelector('#linkedin-ops-comment-section');
    renderLinkedInCommentPanel(commentSection, { escapeHtml });
    bindLinkedInCommentPanel(commentSection, {
      escapeHtml,
      templatesDoc,
      weeklyPlanDoc: weeklyPlan
    });

    const lintSection = root.querySelector('#linkedin-ops-lint-section');
    renderLinkedInLintPanel(lintSection, { escapeHtml });
    bindLinkedInLintPanel(lintSection, { escapeHtml });
  } catch (err) {
    root.innerHTML = `<p class="empty" role="alert">LinkedIn operasyon paneli yüklenemedi: ${escapeHtml(err?.message || String(err))}</p>`;
  }
}
