/**
 * P16-4A-2 — LinkedIn üçüncü taraf yorum önerisi admin view (deterministic, manuel onay).
 */
import { suggestLinkedInComments } from './linkedin-ops-comment-suggestions.js';

const MANUAL_DISCLOSURE_TR =
  "Bu öneriler yalnızca manuel inceleme içindir; sistem LinkedIn'e otomatik yorum göndermez.";

const SEVERITY_LABELS = Object.freeze({
  pass: 'Geçti',
  warning: 'Uyarı',
  fail: 'Başarısız'
});

const CONFIDENCE_LABELS = Object.freeze({
  high: 'yüksek',
  medium: 'orta',
  fallback: 'genel'
});

function defaultEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} [options]
 * @returns {string}
 */
export function buildLinkedInCommentPanelHtml(options = {}) {
  const disclosure = options.disclosureTr || MANUAL_DISCLOSURE_TR;
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;

  return `
    <div class="linkedin-ops-section-inner linkedin-comment-panel">
      <h3 class="linkedin-ops-section-title" id="linkedin-ops-comment-heading">Üçüncü Taraf Yorum Önerisi</h3>
      <p class="linkedin-comment-intro">Üçüncü taraf LinkedIn gönderi metnini yapıştırın; deterministic şablonlardan yorum önerisi alın. Öneriler yalnızca manuel inceleme içindir.</p>
      <p class="linkedin-ops-disclosure linkedin-comment-disclosure">${escapeHtml(disclosure)}</p>
      <div class="linkedin-lint-field">
        <label class="linkedin-lint-label" for="linkedin-comment-post-text">Üçüncü taraf LinkedIn gönderisi</label>
        <textarea id="linkedin-comment-post-text" class="linkedin-lint-textarea linkedin-comment-textarea" rows="8" placeholder="Üçüncü taraf gönderi metnini buraya yapıştırın…"></textarea>
      </div>
      <div class="linkedin-comment-controls">
        <div class="linkedin-lint-field linkedin-comment-control">
          <label class="linkedin-lint-label" for="linkedin-comment-account-type">Hesap türü</label>
          <select id="linkedin-comment-account-type" class="linkedin-lint-select">
            <option value="ceo" selected>CEO</option>
            <option value="company">Şirket</option>
          </select>
        </div>
        <div class="linkedin-lint-field linkedin-comment-control">
          <label class="linkedin-lint-label" for="linkedin-comment-language">Dil</label>
          <select id="linkedin-comment-language" class="linkedin-lint-select">
            <option value="tr" selected>Türkçe</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
      <div class="linkedin-lint-actions">
        <button type="button" id="linkedin-comment-generate" class="linkedin-lint-run-btn">Yorum önerisi oluştur</button>
      </div>
      <div id="linkedin-comment-results" class="linkedin-comment-results" aria-live="polite"></div>
    </div>
  `;
}

/**
 * @param {import('./linkedin-ops-comment-suggestions.js').LinkedInCommentSuggestionsResult | null | undefined} result
 * @param {(value: unknown) => string} [escapeHtml]
 * @returns {string}
 */
export function buildLinkedInCommentSuggestionsHtml(result, escapeHtml = defaultEscapeHtml) {
  if (!result || typeof result !== 'object') {
    return '<p class="linkedin-ops-empty">Yorum önerisi oluşturulamadı.</p>';
  }

  const disclosure = result.manualWorkflow?.disclosureTr || MANUAL_DISCLOSURE_TR;
  const category = result.category || {};
  const confidence = CONFIDENCE_LABELS[category.confidence] || category.confidence || 'genel';
  const suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];

  const categoryHtml = category.labelTr
    ? `<p class="linkedin-comment-category">Kategori: <strong>${escapeHtml(category.labelTr)}</strong> · güven: ${escapeHtml(confidence)}</p>`
    : '';

  if (!suggestions.length) {
    return `
      <div class="linkedin-comment-suggestions">
        <p class="linkedin-ops-disclosure">${escapeHtml(disclosure)}</p>
        ${categoryHtml}
        <p class="linkedin-ops-empty">Uygun yorum şablonu bulunamadı. Şablon kataloğu yüklü mü kontrol edin veya gönderi metnini genişletin.</p>
      </div>`;
  }

  const cardsHtml = suggestions
    .map((suggestion) => {
      const lint = suggestion.lintResult || {};
      const severity = lint.severity || 'pass';
      const severityLabel = SEVERITY_LABELS[severity] || severity;
      const severityClass = `linkedin-lint-result--${severity}`;

      return `
        <article class="linkedin-comment-card ${severityClass}">
          <div class="linkedin-comment-card-head">
            <h4 class="linkedin-comment-card-title">${escapeHtml(suggestion.titleTr || 'Yorum önerisi')}</h4>
            <span class="linkedin-lint-result-badge linkedin-comment-lint-badge">${escapeHtml(severityLabel)}</span>
          </div>
          <p class="linkedin-comment-body">${escapeHtml(suggestion.body || '')}</p>
          <p class="linkedin-comment-meta">
            Kategori: ${escapeHtml(suggestion.categoryKey || category.key || '—')}
            · Şablon: <code class="linkedin-ops-code">${escapeHtml(suggestion.sourceTemplateId || '—')}</code>
          </p>
        </article>`;
    })
    .join('');

  return `
    <div class="linkedin-comment-suggestions">
      <p class="linkedin-ops-disclosure">${escapeHtml(disclosure)}</p>
      ${categoryHtml}
      <div class="linkedin-comment-cards">${cardsHtml}</div>
    </div>`;
}

/**
 * @param {HTMLElement | null} root
 * @param {{ escapeHtml?: (value: unknown) => string, disclosureTr?: string }} [options]
 */
export function renderLinkedInCommentPanel(root, options = {}) {
  if (!root) return;
  root.innerHTML = buildLinkedInCommentPanelHtml(options);
}

/**
 * @param {HTMLElement | null} root
 * @param {{ escapeHtml?: (value: unknown) => string, templatesDoc?: object | null, weeklyPlanDoc?: object | null }} [options]
 */
export function bindLinkedInCommentPanel(root, options = {}) {
  if (!root) return;

  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const generateBtn = root.querySelector('#linkedin-comment-generate');
  const postTextarea = root.querySelector('#linkedin-comment-post-text');
  const accountSelect = root.querySelector('#linkedin-comment-account-type');
  const languageSelect = root.querySelector('#linkedin-comment-language');
  const resultsEl = root.querySelector('#linkedin-comment-results');

  if (!generateBtn || !postTextarea || !accountSelect || !languageSelect || !resultsEl) return;

  generateBtn.addEventListener('click', () => {
    try {
      const result = suggestLinkedInComments({
        postText: postTextarea.value,
        accountType: accountSelect.value,
        language: languageSelect.value,
        templatesDoc: options.templatesDoc,
        weeklyPlanDoc: options.weeklyPlanDoc
      });
      resultsEl.innerHTML = buildLinkedInCommentSuggestionsHtml(result, escapeHtml);
    } catch {
      resultsEl.innerHTML = `<p class="linkedin-ops-empty" role="alert">Yorum önerileri oluşturulamadı. Lütfen metni kontrol edip tekrar deneyin.</p>`;
    }
  });
}
