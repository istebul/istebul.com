import { adminList } from '../core/admin-client.js';
import { escapeHtml, safeAttr, safeJsonParse } from '../core/dom-safe.js';
import { normalizePhoneForWhatsapp } from '../core/phone.js';
import {
  fetchAdminTable,
  collectAdminWarnings,
  renderAdminWarningBanner
} from './admin-query.js';
import { setAdminRootLoading } from './admin-page-routing.js';

const VACATION_SETTING_KEYS = [
  'vacation_enabled',
  'vacation_ai_enabled',
  'vacation_partner_cta_enabled',
  'vacation_default_budget_note',
  'vacation_disclaimer_text'
];

const VACATION_SETTING_DEFAULTS = {
  vacation_enabled: 'true',
  vacation_ai_enabled: 'true',
  vacation_partner_cta_enabled: 'false',
  vacation_default_budget_note: 'Tahminler sezon ve doluluğa göre değişebilir.',
  vacation_disclaimer_text:
    'Fiyatlar ve uygunluk tahminidir; sezon, doluluk ve partner bilgilerine göre değişebilir.'
};

function vacationLeadsDirect(sb, limit = 1000) {
  return sb
    .from('vacation_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

function vacationEventsDirect(sb, limit = 5000) {
  return sb
    .from('vacation_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

function vacationScenariosDirect(sb, limit = 500) {
  return sb
    .from('vacation_scenarios')
    .select('*')
    .order('sort_order', { ascending: true })
    .limit(limit);
}

function renderVacationLoadError(el, res, label) {
  const msg = res?.error?.message || res?.error || 'Veri yüklenemedi';
  el.innerHTML = `
    <p class="empty">${escapeHtml(label)}: ${escapeHtml(String(msg))}</p>
    <p class="text-muted-sm" style="margin-top:8px">Tablolar yoksa: <code>supabase db push</code> · Edge: <code>supabase functions deploy admin-action</code></p>
  `;
}

export function initVacationAdmin(ctx) {
  const { sb, adminAction, toast } = ctx;
  return {
    loadVacationAnalytics: () => loadVacationAnalytics(sb),
    loadVacationLeads: () => loadVacationLeads(sb, adminAction, toast),
    loadVacationScenarios: () => loadVacationScenarios(sb, adminAction, toast),
    loadVacationSettings: () => loadVacationSettings(sb, toast),
    saveVacationSettings: () => saveVacationSettings(sb, adminAction, toast),
    handleVacationAction: (event, el) =>
      handleVacationAction(event, el, { adminAction, toast, sb, adminList })
  };
}

async function loadVacationAnalytics(sb) {
  const el = document.getElementById('vacation-analytics-root');
  if (!el) return;

  setAdminRootLoading('vacation-analytics-root');

  const [eventsRes, leadsRes] = await Promise.all([
    fetchAdminTable(sb, {
      table: 'vacation_events',
      limit: 5000,
      order: { column: 'created_at', ascending: false },
      direct: () => vacationEventsDirect(sb, 5000)
    }),
    fetchAdminTable(sb, {
      table: 'vacation_leads',
      limit: 2000,
      order: { column: 'created_at', ascending: false },
      direct: () => vacationLeadsDirect(sb, 2000)
    })
  ]);

  const warnings = collectAdminWarnings([eventsRes, leadsRes]);
  const fatal = eventsRes.error && leadsRes.error;
  if (fatal) {
    renderVacationLoadError(el, eventsRes.error ? eventsRes : leadsRes, 'Analytics yüklenemedi');
    return;
  }

  const events = eventsRes.data || [];
  const leads = leadsRes.data || [];

  const sessions = new Set(events.map((e) => e.session_id).filter(Boolean));
  const pageViews = events.filter((e) => e.event_type === 'vacation_page_view').length;
  const totalLeads = leads.length;
  const conversion = sessions.size ? Math.round((totalLeads / sessions.size) * 100) : 0;

  const countField = (rows, field) => {
    const map = {};
    rows.forEach((row) => {
      const val = row[field];
      if (!val) return;
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  };

  const avgScore =
    leads.length > 0
      ? Math.round(
          leads.reduce((sum, l) => sum + (Number(l.decision_score) || 0), 0) / leads.length
        )
      : 0;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const leads7d = leads.filter((l) => new Date(l.created_at).getTime() >= weekAgo).length;

  const cards = [
    ['Toplam tatil oturumu', sessions.size],
    ['Toplam lead', totalLeads],
    ['Lead dönüşüm oranı', `${conversion}%`],
    ['En çok seçilen tatil amacı', countField(leads, 'vacation_goal')],
    ['En çok seçilen bütçe', countField(leads, 'budget_range')],
    ['En çok seçilen tatil tipi', countField(leads, 'vacation_type')],
    ['Ortalama karar skoru', avgScore || '—'],
    ['Son 7 gün lead', leads7d],
    ['Sayfa görüntüleme', pageViews]
  ];

  el.innerHTML = `
    ${renderAdminWarningBanner(warnings)}
    <div class="stat-grid">
      ${cards
        .map(
          ([label, value]) => `
        <div class="stat-card">
          <div class="stat-label">${escapeHtml(label)}</div>
          <div class="stat-value">${escapeHtml(String(value))}</div>
        </div>
      `
        )
        .join('')}
    </div>
    <p class="text-muted-sm" style="margin-top:12px">Kaynak: vacation_events · vacation_leads</p>
  `;
}

async function loadVacationLeads(sb, adminAction, toast) {
  const el = document.getElementById('vacation-leads-list');
  if (!el) return;

  setAdminRootLoading('vacation-leads-list');

  const res = await fetchAdminTable(sb, {
    table: 'vacation_leads',
    limit: 1000,
    order: { column: 'created_at', ascending: false },
    direct: () => vacationLeadsDirect(sb, 1000)
  });

  if (res.error && !res.data?.length) {
    renderVacationLoadError(el, res, 'Lead listesi');
    return;
  }

  const data = res.data || [];
  const banner = renderAdminWarningBanner(collectAdminWarnings([res]));

  const search = (document.getElementById('vacation-leads-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('vacation-leads-status-filter')?.value || '';

  const filtered = data.filter((lead) => {
    if (statusFilter && lead.status !== statusFilter) return false;
    if (!search) return true;
    const hay = [lead.full_name, lead.email, lead.phone, lead.vacation_goal, lead.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(search);
  });

  if (!filtered.length) {
    el.innerHTML = `${banner}<p class="empty">${data.length ? 'Filtreye uygun kayıt yok.' : 'Henüz tatil lead kaydı yok.'}</p>`;
    return;
  }

  el.innerHTML = `
    ${banner}
    <table class="table">
      <thead>
        <tr>
          <th>Tarih</th>
          <th>Ad Soyad</th>
          <th>Telefon</th>
          <th>E-posta</th>
          <th>Tatil amacı</th>
          <th>Bütçe</th>
          <th>Tatil tipi</th>
          <th>Seçilen seçenek</th>
          <th>Skor</th>
          <th>Durum</th>
          <th>Takip</th>
          <th>Aksiyonlar</th>
        </tr>
      </thead>
      <tbody>
        ${filtered
          .map(
            (lead) => `
          <tr>
            <td class="cell-nowrap">${new Date(lead.created_at).toLocaleString('tr-TR')}</td>
            <td>${escapeHtml(lead.full_name || '—')}</td>
            <td>${escapeHtml(lead.phone || '—')}</td>
            <td>${lead.email ? `<a href="mailto:${safeAttr(lead.email)}">${escapeHtml(lead.email)}</a>` : '—'}</td>
            <td>${escapeHtml(lead.vacation_goal || '—')}</td>
            <td>${escapeHtml(lead.budget_range || '—')}</td>
            <td>${escapeHtml(lead.vacation_type || '—')}</td>
            <td>${escapeHtml(lead.selected_option || '—')}</td>
            <td><strong>${lead.decision_score ?? '—'}</strong></td>
            <td>
              <select class="status-select" data-action="vacation-update-status" data-id="${safeAttr(lead.id)}">
                ${['new', 'called', 'interested', 'closed', 'rejected']
                  .map(
                    (s) =>
                      `<option value="${s}" ${lead.status === s ? 'selected' : ''}>${s}</option>`
                  )
                  .join('')}
              </select>
            </td>
            <td class="cell-nowrap">
              <input type="datetime-local" data-action="vacation-follow-up" data-id="${safeAttr(lead.id)}"
                value="${lead.follow_up_at ? new Date(lead.follow_up_at).toISOString().slice(0, 16) : ''}">
              <label style="display:block;margin-top:4px;font-size:11px">
                <input type="checkbox" data-action="vacation-follow-done" data-id="${safeAttr(lead.id)}" ${lead.follow_up_done ? 'checked' : ''}>
                Tamamlandı
              </label>
            </td>
            <td>
              <div class="table-actions">
                <button type="button" class="btn btn-ghost btn-sm" data-action="vacation-edit-notes" data-id="${safeAttr(lead.id)}" data-notes="${safeAttr(lead.notes || '')}">Not</button>
                ${lead.phone ? `<a class="btn btn-success btn-sm" target="_blank" rel="noopener" href="https://wa.me/${normalizePhoneForWhatsapp(lead.phone)}">WhatsApp</a>` : ''}
              </div>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;

  el.querySelectorAll('[data-action="vacation-update-status"]').forEach((select) => {
    select.addEventListener('change', async () => {
      await adminAction({
        action: 'update',
        table: 'vacation_leads',
        id: select.dataset.id,
        values: { status: select.value }
      });
      toast('Durum güncellendi');
    });
  });

  el.querySelectorAll('[data-action="vacation-follow-up"]').forEach((input) => {
    input.addEventListener('change', async () => {
      await adminAction({
        action: 'update',
        table: 'vacation_leads',
        id: input.dataset.id,
        values: { follow_up_at: input.value ? new Date(input.value).toISOString() : null }
      });
      toast('Takip tarihi kaydedildi');
    });
  });

  el.querySelectorAll('[data-action="vacation-follow-done"]').forEach((input) => {
    input.addEventListener('change', async () => {
      await adminAction({
        action: 'update',
        table: 'vacation_leads',
        id: input.dataset.id,
        values: { follow_up_done: input.checked }
      });
      toast('Takip işaretlendi');
    });
  });
}

async function loadVacationScenarios(sb, adminAction, toast) {
  const el = document.getElementById('vacation-scenarios-list');
  if (!el) return;

  setAdminRootLoading('vacation-scenarios-list');

  const res = await fetchAdminTable(sb, {
    table: 'vacation_scenarios',
    limit: 500,
    order: { column: 'sort_order', ascending: true },
    direct: () => vacationScenariosDirect(sb, 500)
  });

  if (res.error && !res.data?.length) {
    renderVacationLoadError(el, res, 'Senaryolar');
    return;
  }

  const data = res.data || [];
  const banner = renderAdminWarningBanner(collectAdminWarnings([res]));

  if (!data.length) {
    el.innerHTML = `${banner}<p class="empty">Henüz senaryo yok. Yukarıdaki formdan ekleyebilirsiniz.</p>`;
    return;
  }

  el.innerHTML = `
    ${banner}
    <table class="table">
      <thead>
        <tr>
          <th>Sıra</th>
          <th>Başlık</th>
          <th>Slug</th>
          <th>Durum</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) => `
          <tr>
            <td><input class="form-input" style="width:70px" data-action="vacation-scenario-sort" data-id="${safeAttr(row.id)}" value="${row.sort_order ?? 0}"></td>
            <td><strong>${escapeHtml(row.title)}</strong></td>
            <td>${escapeHtml(row.slug)}</td>
            <td><span class="badge ${row.is_active ? 'badge-green' : 'badge-red'}">${row.is_active ? 'Aktif' : 'Pasif'}</span></td>
            <td>
              <button type="button" class="btn btn-ghost btn-sm" data-action="vacation-edit-scenario" data-id="${safeAttr(row.id)}">Düzenle</button>
              <button type="button" class="btn btn-ghost btn-sm" data-action="vacation-toggle-scenario" data-id="${safeAttr(row.id)}" data-active="${row.is_active}">${row.is_active ? 'Pasifleştir' : 'Aktifleştir'}</button>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;

  el.querySelectorAll('[data-action="vacation-scenario-sort"]').forEach((input) => {
    input.addEventListener('change', async () => {
      await adminAction({
        action: 'update',
        table: 'vacation_scenarios',
        id: input.dataset.id,
        values: { sort_order: Number(input.value) || 0 }
      });
      toast('Sıra güncellendi');
      loadVacationScenarios(sb, adminAction, toast);
    });
  });
}

async function loadVacationSettings(sb, toast) {
  const res = await fetchAdminTable(sb, {
    table: 'site_settings',
    limit: 500,
    direct: () => sb.from('site_settings').select('key, value')
  });

  const map = { ...VACATION_SETTING_DEFAULTS };
  if (res.error) {
    toast?.(`Tatil ayarları yüklenemedi: ${res.error.message || res.error}`, 'error');
  } else {
    (res.data || []).forEach((row) => {
      if (VACATION_SETTING_KEYS.includes(row.key)) map[row.key] = row.value;
    });
  }

  VACATION_SETTING_KEYS.forEach((key) => {
    const el = document.getElementById(`vs-${key}`);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = map[key] === 'true';
    } else {
      el.value = map[key] ?? '';
    }
  });
}

async function saveVacationSettings(sb, adminAction, toast) {
  const rows = VACATION_SETTING_KEYS.map((key) => {
    const el = document.getElementById(`vs-${key}`);
    if (!el) return { key, value: VACATION_SETTING_DEFAULTS[key] };
    const value = el.type === 'checkbox' ? (el.checked ? 'true' : 'false') : el.value || '';
    return { key, value };
  });

  await adminAction({
    action: 'upsert_settings',
    table: 'site_settings',
    id: 'vacation-settings',
    values: rows
  });
  toast('Tatil ayarları kaydedildi');
}

async function fetchVacationScenarios(sb) {
  const res = await fetchAdminTable(sb, {
    table: 'vacation_scenarios',
    limit: 500,
    order: { column: 'sort_order', ascending: true },
    direct: () => vacationScenariosDirect(sb, 500)
  });
  if (res.error && !res.data?.length) {
    throw res.error;
  }
  return res.data || [];
}

async function handleVacationAction(event, el, ctx) {
  const { adminAction, toast, sb, adminList } = ctx;
  const { action, id } = el.dataset;

  if (action === 'vacation-save-scenario') {
    const formId = document.getElementById('vacation-scenario-form-id')?.value || 'new';
    const title = document.getElementById('vacation-scenario-title')?.value?.trim();
    const slug = document.getElementById('vacation-scenario-slug')?.value?.trim();
    if (!title || !slug) {
      toast('Başlık ve slug zorunlu', 'error');
      return true;
    }
    const values = {
      title,
      slug,
      description: document.getElementById('vacation-scenario-description')?.value?.trim() || '',
      image_url: document.getElementById('vacation-scenario-image')?.value?.trim() || '',
      is_active: document.getElementById('vacation-scenario-active')?.checked ?? true,
      sort_order: Number(document.getElementById('vacation-scenario-sort')?.value) || 0,
      config: safeJsonParse(document.getElementById('vacation-scenario-config')?.value || '{}', {})
    };
    if (formId && formId !== 'new') {
      await adminAction({ action: 'update', table: 'vacation_scenarios', id: formId, values });
      toast('Senaryo güncellendi');
    } else {
      await adminAction({ action: 'insert', table: 'vacation_scenarios', id: 'new', values });
      toast('Senaryo eklendi');
      document.getElementById('vacation-scenario-form-id').value = 'new';
    }
    loadVacationScenarios(sb, adminAction, toast);
    return true;
  }

  if (action === 'vacation-edit-notes' && id) {
    const notes = prompt('Not', el.dataset.notes || '');
    if (notes === null) return true;
    await adminAction({
      action: 'update',
      table: 'vacation_leads',
      id,
      values: { notes }
    });
    toast('Not kaydedildi');
    loadVacationLeads(sb, adminAction, toast);
    return true;
  }

  if (action === 'vacation-toggle-scenario' && id) {
    await adminAction({
      action: 'update',
      table: 'vacation_scenarios',
      id,
      values: { is_active: el.dataset.active !== 'true' }
    });
    toast('Senaryo durumu güncellendi');
    loadVacationScenarios(sb, adminAction, toast);
    return true;
  }

  if (action === 'vacation-edit-scenario' && id) {
    let rows = [];
    try {
      rows = await fetchVacationScenarios(sb);
    } catch {
      rows = await adminList(sb, { table: 'vacation_scenarios', limit: 500 });
    }
    const row = rows.find((r) => r.id === id);
    if (!row) return true;
    document.getElementById('vacation-scenario-form-id').value = row.id;
    document.getElementById('vacation-scenario-title').value = row.title || '';
    document.getElementById('vacation-scenario-slug').value = row.slug || '';
    document.getElementById('vacation-scenario-description').value = row.description || '';
    document.getElementById('vacation-scenario-image').value = row.image_url || '';
    document.getElementById('vacation-scenario-sort').value = row.sort_order ?? 0;
    document.getElementById('vacation-scenario-active').checked = row.is_active !== false;
    document.getElementById('vacation-scenario-config').value = JSON.stringify(row.config || {}, null, 2);
    return true;
  }

  if (action === 'save-vacation-settings') {
    await saveVacationSettings(sb, adminAction, toast);
    return true;
  }

  return false;
}
