/**
 * P16-3B — LinkedIn haftalık plan read-only admin özeti.
 */

const DAY_LABELS_TR = Object.freeze({
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
  sunday: 'Pazar'
});

const ACCOUNT_LABELS_TR = Object.freeze({
  ceo: 'CEO',
  company: 'Şirket',
  ceo_or_company: 'CEO veya Şirket',
  both: 'CEO veya Şirket'
});

const ACTION_LABELS_TR = Object.freeze({
  post: 'Paylaşım',
  comment_opportunity: 'Yorum fırsatı'
});

function defaultEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string | string[] | undefined} dayValue
 */
function formatSlotDays(dayValue) {
  if (!dayValue) return '—';
  const days = Array.isArray(dayValue) ? dayValue : [dayValue];
  return days.map((day) => DAY_LABELS_TR[day] || day).join(', ');
}

/**
 * @param {object | null | undefined} plan
 * @param {(value: unknown) => string} escapeHtml
 */
export function buildLinkedInPlanSectionHtml(plan, escapeHtml = defaultEscapeHtml) {
  if (!plan || typeof plan !== 'object') {
    return `
      <div class="linkedin-ops-section-inner linkedin-ops-plan-panel">
        <h3 class="linkedin-ops-section-title" id="linkedin-ops-plan-heading">Haftalık LinkedIn Planı</h3>
        <p class="linkedin-ops-empty">Haftalık plan verisi henüz yüklenmedi. Production build sonrası görünür.</p>
      </div>`;
  }

  const policy = plan.automationPolicy || {};
  const workflow = plan.manualWorkflow || {};
  const timezone = plan.timezone || 'Europe/Istanbul';
  const slots = Array.isArray(plan.slots) ? plan.slots : [];

  const safetyNotes = [
    policy.linkedinApi === false ? 'LinkedIn API yok' : null,
    policy.autoPost === false && policy.autoComment === false
      ? 'Otomatik paylaşım/yorum yok'
      : null,
    policy.manualCopyPasteWorkflow ? 'Manuel kopyala-yapıştır modeli' : null,
    policy.manualReviewRequired ? 'Manuel operatör kontrolü zorunlu' : null
  ].filter(Boolean);

  const slotRows = slots
    .map((slot) => {
      const dayLabel = formatSlotDays(slot.daysOfWeek || slot.dayOfWeek);
      const account = ACCOUNT_LABELS_TR[slot.accountType] || slot.accountType || '—';
      const action = ACTION_LABELS_TR[slot.actionType] || slot.actionType || '—';
      return `
        <tr>
          <td>${escapeHtml(dayLabel)}</td>
          <td>${escapeHtml(slot.localTime || '—')}</td>
          <td>${escapeHtml(account)}</td>
          <td>${escapeHtml(action)}</td>
          <td><code class="linkedin-ops-code">${escapeHtml(slot.themeId || '—')}</code></td>
          <td>${escapeHtml(slot.titleTr || '—')}</td>
          <td class="linkedin-ops-cell-objective">${escapeHtml(slot.objectiveTr || '—')}</td>
        </tr>`;
    })
    .join('');

  const safetyHtml = safetyNotes.length
    ? `<ul class="linkedin-ops-safety-list">${safetyNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`
    : '';

  const disclosure = workflow.disclosureTr
    ? `<p class="linkedin-ops-disclosure">${escapeHtml(workflow.disclosureTr)}</p>`
    : '';

  return `
    <div class="linkedin-ops-section-inner linkedin-ops-plan-panel">
      <h3 class="linkedin-ops-section-title" id="linkedin-ops-plan-heading">Haftalık LinkedIn Planı</h3>
      <p class="linkedin-ops-section-meta">Saat dilimi: ${escapeHtml(timezone)} · ${escapeHtml(slots.length)} slot</p>
      ${disclosure}
      ${safetyHtml}
      <div class="linkedin-ops-table-wrap">
        <table class="linkedin-ops-table linkedin-ops-plan-table">
          <thead>
            <tr>
              <th>Gün</th>
              <th>Saat</th>
              <th>Hesap</th>
              <th>Tür</th>
              <th>Tema</th>
              <th>Başlık</th>
              <th>Hedef</th>
            </tr>
          </thead>
          <tbody>
            ${slotRows || '<tr><td colspan="7" class="linkedin-ops-empty-cell">Slot tanımı yok</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

/**
 * @param {HTMLElement | null} container
 * @param {object | null | undefined} plan
 * @param {{ escapeHtml?: (value: unknown) => string }} [options]
 */
export function renderLinkedInPlanSection(container, plan, options = {}) {
  if (!container) return;
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  container.innerHTML = buildLinkedInPlanSectionHtml(plan, escapeHtml);
}
