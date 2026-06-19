/**
 * P16-3B — LinkedIn template katalog read-only admin özeti.
 */

function defaultEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object[]} templates
 * @param {string} field
 */
function countByField(templates, field) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const template of templates) {
    const value = String(template?.[field] ?? '—');
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

/**
 * @param {Record<string, number>} counts
 */
function formatDistribution(counts) {
  return Object.entries(counts)
    .map(([key, count]) => `${key}: ${count}`)
    .join(' · ');
}

/**
 * @param {string} text
 * @param {number} maxLen
 */
function truncatePreview(text, maxLen = 140) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}…`;
}

/**
 * @param {object | null | undefined} templatesDoc
 * @param {(value: unknown) => string} escapeHtml
 */
export function buildLinkedInTemplateSectionHtml(templatesDoc, escapeHtml = defaultEscapeHtml) {
  if (!templatesDoc || typeof templatesDoc !== 'object') {
    return `
      <div class="linkedin-ops-section-inner linkedin-ops-template-panel">
        <h3 class="linkedin-ops-section-title" id="linkedin-ops-template-heading">LinkedIn Template Kataloğu</h3>
        <p class="linkedin-ops-empty">Şablon kataloğu henüz yüklenmedi. Production build sonrası görünür.</p>
      </div>`;
  }

  const catalog = templatesDoc.templateCatalog || {};
  const entries = Object.entries(catalog);

  if (!entries.length) {
    return `
      <div class="linkedin-ops-section-inner linkedin-ops-template-panel">
        <h3 class="linkedin-ops-section-title" id="linkedin-ops-template-heading">LinkedIn Template Kataloğu</h3>
        <p class="linkedin-ops-empty">Şablon kataloğu boş.</p>
      </div>`;
  }

  const rows = entries
    .map(([catalogId, group]) => {
      const templates = Array.isArray(group?.templates) ? group.templates : [];
      const accountDist = formatDistribution(countByField(templates, 'accountType'));
      const actionDist = formatDistribution(countByField(templates, 'actionType'));
      const languageDist = formatDistribution(countByField(templates, 'language'));
      const themeId = group?.slotThemeId || catalogId;

      const previewItems = templates
        .slice(0, 4)
        .map((template) => {
          const preview = truncatePreview(template.bodyTemplate);
          return `
            <details class="linkedin-ops-template-preview">
              <summary>${escapeHtml(template.titleTr || template.id || 'Şablon')}</summary>
              <p class="linkedin-ops-template-preview-meta">
                <code class="linkedin-ops-code">${escapeHtml(template.id || '—')}</code>
                · ${escapeHtml(template.accountType || '—')}
                · ${escapeHtml(template.actionType || '—')}
                · ${escapeHtml(template.language || '—')}
              </p>
              <p class="linkedin-ops-template-preview-body">${escapeHtml(preview || 'Önizleme yok')}</p>
            </details>`;
        })
        .join('');

      return `
        <tr>
          <td><code class="linkedin-ops-code">${escapeHtml(catalogId)}</code></td>
          <td><code class="linkedin-ops-code">${escapeHtml(themeId)}</code></td>
          <td>${escapeHtml(group?.labelTr || '—')}</td>
          <td>${templates.length}</td>
          <td class="linkedin-ops-cell-dist">${escapeHtml(accountDist)}</td>
          <td class="linkedin-ops-cell-dist">${escapeHtml(actionDist)}</td>
          <td class="linkedin-ops-cell-dist">${escapeHtml(languageDist)}</td>
        </tr>
        <tr class="linkedin-ops-template-preview-row">
          <td colspan="7">${previewItems}</td>
        </tr>`;
    })
    .join('');

  return `
    <div class="linkedin-ops-section-inner linkedin-ops-template-panel">
      <h3 class="linkedin-ops-section-title" id="linkedin-ops-template-heading">LinkedIn Template Kataloğu</h3>
      <p class="linkedin-ops-section-meta">${escapeHtml(entries.length)} katalog grubu · salt okunur özet</p>
      <div class="linkedin-ops-table-wrap">
        <table class="linkedin-ops-table linkedin-ops-template-table">
          <thead>
            <tr>
              <th>Katalog</th>
              <th>Tema ID</th>
              <th>Etiket</th>
              <th>Şablon</th>
              <th>Hesap dağılımı</th>
              <th>Tür dağılımı</th>
              <th>Dil dağılımı</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

/**
 * @param {HTMLElement | null} container
 * @param {object | null | undefined} templatesDoc
 * @param {{ escapeHtml?: (value: unknown) => string }} [options]
 */
export function renderLinkedInTemplateSection(container, templatesDoc, options = {}) {
  if (!container) return;
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  container.innerHTML = buildLinkedInTemplateSectionHtml(templatesDoc, escapeHtml);
}
