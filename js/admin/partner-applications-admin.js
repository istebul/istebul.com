/**
 * Partner başvuruları CRM — admin CRUD (soft archive, no auto endpoint).
 */
import {
  normalizePartnerCrmStatus,
  partnerCrmStatusOptions,
  renderPartnerPipelineBoardHtml,
  getPartnerCrmWinProbability
} from '../features/sales/partner-crm-pipeline.js';
import {
  computeOnboardingVelocity,
  velocityBadgeClass,
  scorePartnerApplication,
  recommendNextSalesAction,
  logPartnerCrmStageChange,
  logPartnerSalesTouch,
  SALES_TOUCH_TYPES
} from '../features/sales/partner-sales-machine.js';

export const PARTNER_APP_CATEGORIES = [
  { value: 'auto', label: 'Araç (auto)' },
  { value: 'housing', label: 'Konut (housing)' },
  { value: 'finance', label: 'Finans (finance)' },
  { value: 'travel', label: 'Tatil (travel)' },
  { value: 'insurance', label: 'Sigorta (insurance)' },
  { value: 'general', label: 'Genel (general)' }
];

export const PARTNER_APP_STATUS_LABELS = {
  lead: 'İlk Temas',
  qualified: 'Yanıt Geldi',
  demo: 'Görüşme',
  pilot: 'Pilot',
  negotiation: 'Ticari Görüşme',
  won: 'Aktif Partner',
  lost: 'Kapandı',
  inactive: 'Pasif'
};

export const PARTNER_APP_SOURCE_CHANNELS = [
  { value: 'manual', label: 'Manuel (admin)' },
  { value: 'web', label: 'Web formu' },
  { value: 'import', label: 'Import' },
  { value: 'test', label: 'Test' }
];

const FORM_IDS = [
  'pa-company-name',
  'pa-category',
  'pa-contact-name',
  'pa-email',
  'pa-phone',
  'pa-website',
  'pa-source-channel',
  'pa-status',
  'pa-is-active',
  'pa-notes',
  'pa-next-action',
  'pa-contacted-at',
  'pa-follow-up-at'
];

let cachedRows = [];
let editingId = null;
let showArchived = false;

function partnerStatusOptionsHtml(selected = 'lead') {
  return Object.entries(PARTNER_APP_STATUS_LABELS)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`
    )
    .join('');
}

function partnerCategoryOptionsHtml(selected = 'auto') {
  return PARTNER_APP_CATEGORIES.map(
    ({ value, label }) =>
      `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`
  ).join('');
}

function partnerSourceOptionsHtml(selected = 'manual') {
  return PARTNER_APP_SOURCE_CHANNELS.map(
    ({ value, label }) =>
      `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`
  ).join('');
}

function formatPartnerStatusLabel(status) {
  const id = normalizePartnerCrmStatus(status);
  return PARTNER_APP_STATUS_LABELS[id] || id;
}

function formatShortDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR');
}

function toDatetimeLocalValue(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function readPartnerApplicationForm() {
  const get = (id) => document.getElementById(id);
  return {
    company_name: get('pa-company-name')?.value?.trim() || '',
    category: get('pa-category')?.value || 'auto',
    contact_name: get('pa-contact-name')?.value?.trim() || '',
    email: get('pa-email')?.value?.trim() || '',
    phone: get('pa-phone')?.value?.trim() || '',
    website: get('pa-website')?.value?.trim() || '',
    source_channel: get('pa-source-channel')?.value || 'manual',
    status: get('pa-status')?.value || 'lead',
    is_active: Boolean(get('pa-is-active')?.checked),
    notes: get('pa-notes')?.value?.trim() || '',
    next_action: get('pa-next-action')?.value?.trim() || '',
    contacted_at: get('pa-contacted-at')?.value || null,
    follow_up_at: get('pa-follow-up-at')?.value || null
  };
}

function resetPartnerApplicationForm() {
  editingId = null;
  const title = document.getElementById('partner-application-form-title');
  if (title) title.textContent = 'Yeni partner başvurusu';
  for (const id of FORM_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = true;
    else el.value = '';
  }
  const category = document.getElementById('pa-category');
  if (category) category.value = 'auto';
  const source = document.getElementById('pa-source-channel');
  if (source) source.value = 'manual';
  const status = document.getElementById('pa-status');
  if (status) status.value = 'lead';
}

function fillPartnerApplicationForm(row) {
  editingId = row.id;
  const title = document.getElementById('partner-application-form-title');
  if (title) title.textContent = `Düzenle: ${row.company_name || 'Başvuru'}`;
  document.getElementById('pa-company-name').value = row.company_name || '';
  document.getElementById('pa-category').value = row.category || 'auto';
  document.getElementById('pa-contact-name').value = row.contact_name || '';
  document.getElementById('pa-email').value = row.email || '';
  document.getElementById('pa-phone').value = row.phone || '';
  document.getElementById('pa-website').value = row.website || '';
  document.getElementById('pa-source-channel').value = row.source_channel || 'manual';
  document.getElementById('pa-status').value = normalizePartnerCrmStatus(row.status);
  document.getElementById('pa-is-active').checked = row.is_active !== false;
  document.getElementById('pa-notes').value = row.notes || '';
  document.getElementById('pa-next-action').value = row.next_action || '';
  document.getElementById('pa-contacted-at').value = toDatetimeLocalValue(row.contacted_at);
  document.getElementById('pa-follow-up-at').value = toDatetimeLocalValue(row.follow_up_at);
  document.getElementById('partner-application-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function listPartnerApplications(adminAction) {
  const result = await adminAction({
    action: 'listPartnerApplications',
    includeArchived: showArchived,
    limit: 500
  });
  return result?.data || [];
}

function renderPartnerApplicationsTable(ctx, data) {
  const { escapeHtml, safeAttr } = ctx;
  const crmOptions = partnerCrmStatusOptions().map(({ value }) => ({
    value,
    label: PARTNER_APP_STATUS_LABELS[value] || value
  }));

  return `
    <table class="table">
      <thead>
        <tr>
          <th>Firma</th>
          <th>İletişim</th>
          <th>Kategori</th>
          <th>Kaynak</th>
          <th>Durum</th>
          <th>Aktif</th>
          <th>Takip</th>
          <th>Tarih</th>
          <th>Skor</th>
          <th>İşlem</th>
        </tr>
      </thead>
      <tbody>
        ${data
          .map((row) => {
            const velocity = computeOnboardingVelocity(row);
            const dealScore = scorePartnerApplication(row);
            const nextAction = recommendNextSalesAction(row);
            const archived = row.is_archived === true;
            const inactive = row.is_active === false;
            return `
          <tr class="${archived ? 'is-archived-row' : ''} ${inactive ? 'is-inactive-row' : ''}">
            <td>
              <strong>${escapeHtml(row.company_name)}</strong>
              ${archived ? '<br><span class="badge badge-red">Arşiv</span>' : ''}
              ${row.source_channel === 'test' ? '<br><span class="badge badge-yellow">Test</span>' : ''}
              ${row.partner_endpoint_id ? '<br><span class="badge badge-green">Endpoint var</span>' : ''}
              <br><small class="text-muted">${escapeHtml(nextAction.action)}</small>
            </td>
            <td>
              ${escapeHtml(row.contact_name || '—')}<br>
              ${escapeHtml(row.phone || '—')}<br>
              <small>${escapeHtml(row.email || '—')}</small>
              ${row.website ? `<br><small>${escapeHtml(row.website)}</small>` : ''}
            </td>
            <td>${escapeHtml(row.category || '—')}${row.city ? `<br><small>${escapeHtml(row.city)}</small>` : ''}</td>
            <td>${escapeHtml(row.source_channel || 'web')}</td>
            <td>
              <select class="status-select" data-action="update-partner-application-status" data-id="${safeAttr(row.id)}"
                data-previous-status="${safeAttr(normalizePartnerCrmStatus(row.status))}">
                ${crmOptions
                  .concat([{ value: 'inactive', label: PARTNER_APP_STATUS_LABELS.inactive }])
                  .filter((opt, idx, arr) => arr.findIndex((x) => x.value === opt.value) === idx)
                  .map(({ value, label }) => {
                    const current = normalizePartnerCrmStatus(row.status);
                    const selected = current === value || (current === 'inactive' && value === 'inactive');
                    return `<option value="${value}" ${selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
                  })
                  .join('')}
              </select>
              <small class="text-muted">P(win) ${Math.round(getPartnerCrmWinProbability(row.status) * 100)}%</small>
            </td>
            <td>${row.is_active !== false ? '<span class="badge badge-green">Aktif</span>' : '<span class="badge badge-red">Pasif</span>'}</td>
            <td>
              <small>İletişim: ${formatShortDate(row.contacted_at)}</small><br>
              <small>Takip: ${formatShortDate(row.follow_up_at)}</small>
            </td>
            <td>${formatShortDate(row.created_at)}</td>
            <td><span class="badge badge-blue">${dealScore}</span><br><span class="badge ${velocityBadgeClass(velocity)}">${escapeHtml(velocity.label)}</span></td>
            <td class="table-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-action="edit-partner-application" data-id="${safeAttr(row.id)}">Düzenle</button>
              <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-partner-application-active" data-id="${safeAttr(row.id)}" ${archived ? 'disabled' : ''}>
                ${row.is_active !== false ? 'Pasif yap' : 'Aktif yap'}
              </button>
              <button type="button" class="btn btn-warning btn-sm" data-action="archive-partner-application" data-id="${safeAttr(row.id)}" ${archived ? 'disabled' : ''}>Arşivle</button>
              <button type="button" class="btn btn-ghost btn-sm" data-action="open-partner-application-notes" data-id="${safeAttr(row.id)}">Not</button>
              ${!row.partner_endpoint_id ? `<button type="button" class="btn btn-primary btn-sm" data-action="provision-partner-application" data-id="${safeAttr(row.id)}">Endpoint oluştur</button>` : ''}
              <select class="ib-sales-touch-select" data-action="log-partner-sales-touch" data-id="${safeAttr(row.id)}" data-stage="${safeAttr(row.status || '')}" data-tier="${safeAttr(row.billing_plan || '')}">
                <option value="">Satış dokunuşu</option>
                ${SALES_TOUCH_TYPES.map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join('')}
              </select>
            </td>
          </tr>`;
          })
          .join('')}
      </tbody>
    </table>`;
}

export async function loadPartnerApplications(ctx) {
  const el = document.getElementById('partner-applications-list');
  if (!el) return;

  const { adminAction, escapeHtml, renderAdminDataSourceNotices, toast } = ctx;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  try {
    cachedRows = await listPartnerApplications(adminAction);
  } catch (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message || error)}</p>`;
    return;
  }

  const activeRows = cachedRows.filter((row) => !row.is_archived);
  const pipelineBoard = renderPartnerPipelineBoardHtml(
    activeRows.map((row) => ({ ...row, status: normalizePartnerCrmStatus(row.status) })),
    escapeHtml
  );

  if (!cachedRows.length) {
    el.innerHTML = `
      ${pipelineBoard}
      <p class="empty">Başvuru yok. <strong>Yeni Başvuru Ekle</strong> ile manuel kayıt oluşturabilirsiniz.</p>`;
    return;
  }

  el.innerHTML = `
    ${pipelineBoard}
    ${renderPartnerApplicationsTable(ctx, cachedRows)}
  `;

  const archivedToggle = document.getElementById('partner-applications-show-archived');
  if (archivedToggle) archivedToggle.checked = showArchived;
}

export async function savePartnerApplicationForm(ctx) {
  const { adminAction, toast } = ctx;
  const values = readPartnerApplicationForm();

  if (!values.company_name || !values.contact_name || !values.email || !values.phone) {
    toast('Firma, iletişim, e-posta ve telefon zorunlu', 'error');
    return;
  }

  try {
    if (editingId) {
      await adminAction({
        action: 'updatePartnerApplication',
        id: editingId,
        values
      });
      toast('Başvuru güncellendi');
    } else {
      await adminAction({
        action: 'createPartnerApplication',
        values: { ...values, source_channel: values.source_channel || 'manual' }
      });
      toast('Başvuru eklendi');
    }
    resetPartnerApplicationForm();
    await loadPartnerApplications(ctx);
  } catch (error) {
    toast(error.message || 'Kayıt başarısız', 'error');
  }
}

export async function handlePartnerApplicationAdminAction(ctx, action, el) {
  const { adminAction, toast } = ctx;
  const id = el.dataset.id;
  if (!id) return false;

  if (action === 'edit-partner-application') {
    const row = cachedRows.find((r) => r.id === id);
    if (row) fillPartnerApplicationForm(row);
    return true;
  }

  if (action === 'toggle-partner-application-active') {
    try {
      await adminAction({ action: 'togglePartnerApplicationActive', id });
      toast('Durum güncellendi');
      await loadPartnerApplications(ctx);
    } catch (error) {
      toast(error.message || 'İşlem başarısız', 'error');
    }
    return true;
  }

  if (action === 'archive-partner-application') {
    if (!confirm('Bu başvuruyu arşivlemek istediğinize emin misiniz? (Soft delete)')) return true;
    try {
      await adminAction({ action: 'archivePartnerApplication', id });
      toast('Başvuru arşivlendi');
      await loadPartnerApplications(ctx);
    } catch (error) {
      toast(error.message || 'Arşivleme başarısız', 'error');
    }
    return true;
  }

  if (action === 'open-partner-application-notes') {
    const row = cachedRows.find((r) => r.id === id);
    const current = row?.notes || '';
    const notes = window.prompt('Not güncelle:', current);
    if (notes === null) return true;
    try {
      await adminAction({
        action: 'updatePartnerApplication',
        id,
        values: { notes }
      });
      toast('Not güncellendi');
      await loadPartnerApplications(ctx);
    } catch (error) {
      toast(error.message || 'Not kaydedilemedi', 'error');
    }
    return true;
  }

  return false;
}

export function bindPartnerApplicationsAdminUi(ctx) {
  document.getElementById('partner-application-new-btn')?.addEventListener('click', () => {
    resetPartnerApplicationForm();
    document.getElementById('partner-application-form-panel')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('partner-application-save-btn')?.addEventListener('click', () => {
    savePartnerApplicationForm(ctx);
  });

  document.getElementById('partner-application-cancel-btn')?.addEventListener('click', () => {
    resetPartnerApplicationForm();
  });

  document.getElementById('partner-applications-show-archived')?.addEventListener('change', (event) => {
    showArchived = event.target.checked;
    loadPartnerApplications(ctx);
  });

  document.getElementById('partner-applications-refresh-btn')?.addEventListener('click', () => {
    loadPartnerApplications(ctx);
  });
}

export function renderPartnerApplicationFormShell() {
  return `
    <div class="card" id="partner-application-form-panel">
      <div class="card-title" id="partner-application-form-title">Yeni partner başvurusu</div>
      <p class="text-muted-sm">CRM kaydı — endpoint otomatik oluşturulmaz.</p>
      <div class="form-row">
        <div class="form-group"><label>Firma adı *</label><input id="pa-company-name" type="text" required></div>
        <div class="form-group"><label>Kategori *</label><select id="pa-category">${partnerCategoryOptionsHtml()}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>İletişim kişisi *</label><input id="pa-contact-name" type="text" required></div>
        <div class="form-group"><label>E-posta *</label><input id="pa-email" type="email" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Telefon *</label><input id="pa-phone" type="tel" required></div>
        <div class="form-group"><label>Web sitesi</label><input id="pa-website" type="url" placeholder="https://"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Kaynak kanalı</label><select id="pa-source-channel">${partnerSourceOptionsHtml()}</select></div>
        <div class="form-group"><label>Durum</label><select id="pa-status">${partnerStatusOptionsHtml()}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Sonraki aksiyon</label><input id="pa-next-action" type="text"></div>
        <div class="form-group"><label><input id="pa-is-active" type="checkbox" checked> Aktif kayıt</label></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>İletişim tarihi</label><input id="pa-contacted-at" type="datetime-local"></div>
        <div class="form-group"><label>Takip tarihi</label><input id="pa-follow-up-at" type="datetime-local"></div>
      </div>
      <div class="form-group"><label>Notlar</label><textarea id="pa-notes" rows="3"></textarea></div>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="partner-application-save-btn">Kaydet</button>
        <button type="button" class="btn btn-ghost" id="partner-application-cancel-btn">Formu temizle</button>
      </div>
    </div>`;
}

export function getPartnerApplicationFormMarkup() {
  return `
    <div class="partner-applications-toolbar" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px">
      <button type="button" class="btn btn-primary btn-sm" id="partner-application-new-btn">Yeni Başvuru Ekle</button>
      <button type="button" class="btn btn-ghost btn-sm" id="partner-applications-refresh-btn">Yenile</button>
      <label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--muted)">
        <input type="checkbox" id="partner-applications-show-archived"> Arşivlenmişleri göster
      </label>
    </div>
    ${renderPartnerApplicationFormShell()}`;
}
