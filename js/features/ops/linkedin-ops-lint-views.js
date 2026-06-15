/**
 * P16-3A — LinkedIn brand lint panel (admin, client-side only).
 */
import { lintLinkedInText } from './linkedin-brand-lint.js';

const SEVERITY_LABELS = Object.freeze({
  pass: 'Geçti',
  warning: 'Uyarı',
  fail: 'Başarısız'
});

const ISSUE_SEVERITY_LABELS = Object.freeze({
  warning: 'Uyarı',
  fail: 'Hata'
});

function defaultEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {HTMLElement | null} root
 * @param {{ escapeHtml?: (value: unknown) => string }} [options]
 */
export function renderLinkedInLintPanel(root, options = {}) {
  if (!root) return;

  root.innerHTML = `
    <div class="linkedin-lint-panel">
      <p class="linkedin-lint-intro">LinkedIn paylaşım veya yorum metnini yapıştırın. Kontrol yalnızca tarayıcıda çalışır; metin sunucuya gönderilmez.</p>
      <div class="linkedin-lint-field">
        <label class="linkedin-lint-label" for="linkedin-lint-action-type">İçerik türü</label>
        <select id="linkedin-lint-action-type" class="linkedin-lint-select">
          <option value="post">Paylaşım (post)</option>
          <option value="comment_opportunity">Yorum fırsatı (comment)</option>
        </select>
      </div>
      <div class="linkedin-lint-field">
        <label class="linkedin-lint-label" for="linkedin-lint-input">Metin</label>
        <textarea id="linkedin-lint-input" class="linkedin-lint-textarea" rows="10" placeholder="LinkedIn metnini buraya yapıştırın…"></textarea>
      </div>
      <div class="linkedin-lint-actions">
        <button type="button" id="linkedin-lint-run" class="linkedin-lint-run-btn">Kontrol Et</button>
      </div>
      <div id="linkedin-lint-results" class="linkedin-lint-results" aria-live="polite"></div>
    </div>
  `;
}

/**
 * @param {import('./linkedin-brand-lint.js').LinkedInLintResult} result
 * @param {(value: unknown) => string} escapeHtml
 */
function renderLintResult(result, escapeHtml) {
  const severityClass = `linkedin-lint-result--${result.severity}`;
  const severityLabel = SEVERITY_LABELS[result.severity] || result.severity;

  const issuesHtml = result.issues.length
    ? `<ul class="linkedin-lint-issues">
        ${result.issues
          .map(
            (issue) => `
          <li class="linkedin-lint-issue linkedin-lint-issue--${escapeHtml(issue.severity)}">
            <span class="linkedin-lint-issue-badge">${escapeHtml(ISSUE_SEVERITY_LABELS[issue.severity] || issue.severity)}</span>
            <span class="linkedin-lint-issue-code">${escapeHtml(issue.code)}</span>
            <span class="linkedin-lint-issue-message">${escapeHtml(issue.messageTr)}</span>
            ${issue.matched ? `<span class="linkedin-lint-issue-matched">(${escapeHtml(issue.matched)})</span>` : ''}
          </li>`
          )
          .join('')}
      </ul>`
    : '<p class="linkedin-lint-no-issues">Sorun bulunamadı.</p>';

  return `
    <div class="linkedin-lint-result ${severityClass}">
      <div class="linkedin-lint-result-head">
        <span class="linkedin-lint-result-badge">${escapeHtml(severityLabel)}</span>
        <p class="linkedin-lint-result-summary">${escapeHtml(result.summaryTr)}</p>
      </div>
      ${issuesHtml}
    </div>
  `;
}

/**
 * @param {HTMLElement | null} root
 * @param {{ escapeHtml?: (value: unknown) => string }} [options]
 */
export function bindLinkedInLintPanel(root, options = {}) {
  if (!root) return;

  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const runBtn = root.querySelector('#linkedin-lint-run');
  const textarea = root.querySelector('#linkedin-lint-input');
  const actionSelect = root.querySelector('#linkedin-lint-action-type');
  const resultsEl = root.querySelector('#linkedin-lint-results');

  if (!runBtn || !textarea || !actionSelect || !resultsEl) return;

  runBtn.addEventListener('click', () => {
    const text = textarea.value;
    const actionType = actionSelect.value;
    const result = lintLinkedInText(text, { actionType });
    resultsEl.innerHTML = renderLintResult(result, escapeHtml);
  });
}
