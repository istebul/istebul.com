/**
 * Enterprise CRM module for admin panel (leads, pipeline, dashboards, audit).
 */

const PIPELINE_STAGES = [
  { id: 'new', label: 'Yeni', tone: 'muted' },
  { id: 'first_contact', label: 'İlk temas', tone: 'info' },
  { id: 'callback', label: 'Tekrar ara', tone: 'warning' },
  { id: 'proposal_sent', label: 'Teklif', tone: 'warning' },
  { id: 'financing', label: 'Finansman', tone: 'info' },
  { id: 'won', label: 'Kazanıldı', tone: 'success' },
  { id: 'lost', label: 'Kaybedildi', tone: 'danger' }
];

const STATUS_OPTIONS = [
  ['new', 'Yeni'],
  ['first_contact', 'İlk temas'],
  ['unreachable', 'Ulaşılamadı'],
  ['callback', 'Tekrar ara'],
  ['proposal_sent', 'Teklif gönderildi'],
  ['financing', 'Finansman süreci'],
  ['insurance', 'Sigorta süreci'],
  ['won', 'Kazanıldı'],
  ['lost', 'Kaybedildi'],
  ['spam', 'Test/Spam']
];

export function createCrm(deps) {
  const state = {
    view: 'list',
    page: 0,
    pageSize: 30,
    total: 0,
    rows: [],
    loading: false,
    selected: new Set(),
    filters: {
      q: '',
      status: '',
      follow: '',
      priority: '',
      partnerStatus: '',
      dateFrom: '',
      dateTo: '',
      notesOnly: false,
      minScore: ''
    }
  };

  let searchTimer = null;
  let activeDrawerLead = null;

  const el = (id) => document.getElementById(id);

  function normalizeStatus(status) {
    if (status === 'called') return 'first_contact';
    if (status === 'interested') return 'proposal_sent';
    if (status === 'closed') return 'won';
    if (status === 'rejected') return 'lost';
    return status || 'new';
  }

  function readFiltersFromDom() {
    state.filters.q = (el('crm-search')?.value || el('auto-leads-search')?.value || '').trim();
    state.filters.status = el('crm-status-filter')?.value || el('auto-leads-status-filter')?.value || '';
    state.filters.follow = el('crm-follow-filter')?.value || el('auto-leads-follow-filter')?.value || '';
    state.filters.priority = el('crm-priority-filter')?.value || '';
    state.filters.partnerStatus = el('crm-partner-filter')?.value || '';
    state.filters.dateFrom = el('crm-date-from')?.value || '';
    state.filters.dateTo = el('crm-date-to')?.value || '';
    state.filters.notesOnly = Boolean(el('crm-notes-only')?.checked || el('auto-leads-notes-only')?.checked);
    state.filters.minScore = el('crm-min-score')?.value || '';
    state.view = el('crm-view-list')?.classList.contains('is-active') ? 'list' : (
      el('crm-view-pipeline')?.classList.contains('is-active') ? 'pipeline' : state.view
    );
    state.pageSize = Number(el('crm-page-size')?.value || state.pageSize) || 30;
  }

  function applyClientFilters(rows) {
    const f = state.filters;
    const q = f.q.toLowerCase();
    const now = new Date();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return rows.filter((lead) => {
      const status = normalizeStatus(lead.status);

      if (f.status === 'hot_only' && !['hot', 'very_hot'].includes(lead.priority)) return false;
      if (f.status === 'dispatch_failed' && lead.partner_status !== 'dispatch_failed') return false;
      if (f.status === 'dispatch_dead' && lead.partner_status !== 'dispatch_dead') return false;
      if (f.status === 'dispatched' && lead.partner_status !== 'dispatched') return false;
      if (f.status === 'won_only' && lead.partner_status !== 'won') return false;
      if (f.status === 'hide_test' && (status === 'spam' || lead.status === 'test_spam')) return false;
      if (f.status && !['hot_only', 'dispatch_failed', 'dispatch_dead', 'dispatched', 'won_only', 'hide_test'].includes(f.status) && status !== f.status && lead.status !== f.status) {
        return false;
      }

      if (f.priority && lead.priority !== f.priority) return false;
      if (f.partnerStatus && lead.partner_status !== f.partnerStatus) return false;
      if (f.minScore && Number(lead.lead_score || 0) < Number(f.minScore)) return false;
      if (f.notesOnly && !(lead.notes || '').trim() && !(Array.isArray(lead.notes_history) && lead.notes_history.length)) return false;

      if (f.dateFrom) {
        const created = lead.created_at ? new Date(lead.created_at) : null;
        if (!created || created < new Date(`${f.dateFrom}T00:00:00`)) return false;
      }
      if (f.dateTo) {
        const created = lead.created_at ? new Date(lead.created_at) : null;
        if (!created || created > new Date(`${f.dateTo}T23:59:59`)) return false;
      }

      const followDate = lead.follow_up_at ? new Date(lead.follow_up_at) : null;
      const isFollowDone = lead.follow_up_done === true;
      if (f.follow === 'today' && !(followDate && followDate <= todayEnd && !isFollowDone)) return false;
      if (f.follow === 'overdue' && !(followDate && followDate < now && !isFollowDone)) return false;
      if (f.follow === 'open' && !(followDate && !isFollowDone)) return false;
      if (f.follow === 'done' && !isFollowDone) return false;

      if (!q) return true;
      const haystack = [
        lead.email,
        lead.phone,
        lead.notes,
        lead.contact_name,
        lead.interest_type,
        lead.vehicle,
        lead.city,
        lead.district,
        lead.priority,
        lead.partner_route
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  async function fetchLeadPage() {
    readFiltersFromDom();
    state.loading = true;
    renderLoading();

    const from = state.page * state.pageSize;
    const to = from + state.pageSize - 1;
    const f = state.filters;

    let query = deps.sb
      .from('auto_leads')
      .select('*', { count: 'exact' })
      .order('lead_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (f.priority) query = query.eq('priority', f.priority);
    if (f.partnerStatus) query = query.eq('partner_status', f.partnerStatus);
    if (f.dateFrom) query = query.gte('created_at', `${f.dateFrom}T00:00:00.000Z`);
    if (f.dateTo) query = query.lte('created_at', `${f.dateTo}T23:59:59.999Z`);
    if (f.minScore) query = query.gte('lead_score', Number(f.minScore));

    if (f.status && !['hot_only', 'dispatch_failed', 'dispatch_dead', 'dispatched', 'won_only', 'hide_test'].includes(f.status)) {
      query = query.in('status', [f.status, f.status === 'first_contact' ? 'called' : '', f.status === 'proposal_sent' ? 'interested' : '', f.status === 'won' ? 'closed' : '', f.status === 'lost' ? 'rejected' : ''].filter(Boolean));
    }

    if (f.q.length >= 2) {
      const term = f.q.replace(/[%_,]/g, ' ').trim();
      query = query.or(`email.ilike.%${term}%,phone.ilike.%${term}%,notes.ilike.%${term}%,vehicle.ilike.%${term}%,contact_name.ilike.%${term}%`);
    }

    const needsClientPass = Boolean(
      f.follow ||
      ['hot_only', 'dispatch_failed', 'dispatch_dead', 'dispatched', 'won_only', 'hide_test'].includes(f.status) ||
      f.notesOnly
    );

    if (needsClientPass) {
      const { data, error } = await query.limit(2000);
      if (error) throw error;
      const filtered = applyClientFilters(data || []);
      state.total = filtered.length;
      state.rows = filtered.slice(from, to + 1);
    } else {
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      state.total = count || 0;
      state.rows = data || [];
    }

    state.loading = false;
    renderLeads();
    renderPagination();
    updateResultSummary();
  }

  function renderLoading() {
    const target = el('auto-leads-list');
    if (target) {
      target.innerHTML = '<div class="crm-loading"><div class="crm-spinner"></div><p>Leadler yükleniyor…</p></div>';
    }
  }

  function updateResultSummary() {
    const summary = el('crm-results-summary');
    if (!summary) return;
    const from = state.total ? state.page * state.pageSize + 1 : 0;
    const to = Math.min((state.page + 1) * state.pageSize, state.total);
    summary.textContent = state.total
      ? `${from}–${to} / ${state.total} lead`
      : 'Sonuç yok';
  }

  function renderPagination() {
    const wrap = el('crm-pagination');
    if (!wrap) return;
    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    const page = state.page;

    wrap.innerHTML = `
      <button type="button" class="btn btn-ghost btn-sm" data-crm-page="prev" ${page <= 0 ? 'disabled' : ''}>Önceki</button>
      <span class="crm-page-indicator">Sayfa ${page + 1} / ${totalPages}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-crm-page="next" ${page >= totalPages - 1 ? 'disabled' : ''}>Sonraki</button>
    `;
  }

  function renderLeads() {
    const listEl = el('auto-leads-list');
    const pipelineEl = el('crm-pipeline-board');
    if (!listEl) return;

    if (!state.rows.length) {
      listEl.innerHTML = '<p class="empty">Filtreye uygun lead bulunamadı.</p>';
      if (pipelineEl) pipelineEl.innerHTML = '<p class="empty">Pipeline boş.</p>';
      return;
    }

    if (state.view === 'pipeline' && pipelineEl) {
      listEl.innerHTML = '';
      pipelineEl.innerHTML = renderPipelineBoard(state.rows);
      return;
    }

    if (pipelineEl) pipelineEl.innerHTML = '';

    listEl.innerHTML = `
      <div class="crm-table-wrap">
        <table class="table crm-table">
          <thead>
            <tr>
              <th><input type="checkbox" data-crm-select-all aria-label="Tümünü seç"></th>
              <th>Lead</th>
              <th>Skor</th>
              <th>Öncelik</th>
              <th>Durum</th>
              <th>Partner</th>
              <th>Takip</th>
              <th>Gelir</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${state.rows.map((lead) => renderLeadRow(lead)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderLeadRow(lead) {
    const overdue = lead.follow_up_at && !lead.follow_up_done && new Date(lead.follow_up_at) < new Date();
    const followLabel = deps.formatFollowUpLabel?.(lead) || '—';
    const followClass = deps.getFollowUpBadgeClass?.(deps.formatFollowUpLabel?.(lead)) || '';
    const selected = state.selected.has(lead.id) ? 'checked' : '';

    return `
      <tr class="crm-lead-row ${overdue ? 'lead-overdue' : ''}" data-lead-id="${deps.safeAttr(lead.id)}">
        <td><input type="checkbox" data-crm-select="${deps.safeAttr(lead.id)}" ${selected} aria-label="Seç"></td>
        <td>
          <button type="button" class="crm-lead-link" data-action="view-auto-lead" data-lead='${deps.safeAttr(JSON.stringify(lead))}'>
            <strong>${deps.escapeHtml(lead.contact_name || lead.phone || lead.email || 'Lead')}</strong>
            <span>${deps.escapeHtml(lead.phone || '—')} · ${deps.escapeHtml(lead.email || '—')}</span>
          </button>
        </td>
        <td><strong>${lead.lead_score || 0}</strong></td>
        <td>${renderPriorityBadge(lead.priority)}</td>
        <td>${renderStatusSelect(lead)}</td>
        <td>${deps.renderPartnerStatusSelect?.(lead) || deps.escapeHtml(lead.partner_status || '—')}</td>
        <td>${followClass ? `<span class="badge ${followClass}">${followLabel}</span>` : followLabel}</td>
        <td class="cell-nowrap">${formatRevenueCell(lead)}</td>
        <td>
          <div class="table-actions">
            ${lead.phone ? `<a class="btn btn-success btn-sm" href="https://wa.me/${deps.normalizePhoneForWhatsapp?.(lead.phone)}?text=Merhaba" target="_blank" rel="noopener">WA</a>` : ''}
            ${['dispatch_failed', 'dispatch_dead'].includes(lead.partner_status) ? `<button class="btn btn-warning btn-sm" data-action="retry-dispatch" data-id="${lead.id}">Retry</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  function formatRevenueCell(lead) {
    const est = lead.estimated_revenue ? Number(lead.estimated_revenue).toLocaleString('tr-TR') : '—';
    const act = lead.actual_revenue ? Number(lead.actual_revenue).toLocaleString('tr-TR') : '—';
    return `<span title="Tahmini / Gerçek">${est} / ${act} ₺</span>`;
  }

  function renderPriorityBadge(priority) {
    const cls = priority === 'very_hot' ? 'badge-red' : priority === 'hot' ? 'badge-yellow' : priority === 'warm' ? 'badge-blue' : 'badge-green';
    return `<span class="badge ${cls}">${deps.escapeHtml(priority || 'cold')}</span>`;
  }

  function renderStatusSelect(lead) {
    const status = normalizeStatus(lead.status);
    const options = STATUS_OPTIONS.map(([value, label]) =>
      `<option value="${value}" ${status === value || lead.status === value ? 'selected' : ''}>${label}</option>`
    ).join('');
    return `<select class="status-select status-${status}" data-action="update-auto-status" data-id="${lead.id}">${options}</select>`;
  }

  function renderPipelineBoard(rows) {
    const grouped = PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage.id] = [];
      return acc;
    }, {});

    rows.forEach((lead) => {
      const key = normalizeStatus(lead.status);
      const bucket = grouped[key] ? key : 'new';
      grouped[bucket].push(lead);
    });

    return `
      <div class="crm-pipeline">
        ${PIPELINE_STAGES.map((stage) => `
          <div class="crm-pipeline-col">
            <div class="crm-pipeline-col-head">
              <strong>${stage.label}</strong>
              <span class="badge badge-blue">${(grouped[stage.id] || []).length}</span>
            </div>
            <div class="crm-pipeline-cards">
              ${(grouped[stage.id] || []).map((lead) => `
                <article class="crm-pipeline-card" data-action="view-auto-lead" data-lead='${deps.safeAttr(JSON.stringify(lead))}'>
                  <div class="crm-pipeline-card-top">
                    <strong>${deps.escapeHtml(lead.contact_name || lead.phone || 'Lead')}</strong>
                    ${renderPriorityBadge(lead.priority)}
                  </div>
                  <p>${deps.escapeHtml(lead.phone || lead.email || '—')}</p>
                  <div class="crm-pipeline-meta">
                    <span>Skor ${lead.lead_score || 0}</span>
                    <span>${lead.estimated_revenue ? Number(lead.estimated_revenue).toLocaleString('tr-TR') + ' ₺' : '—'}</span>
                  </div>
                </article>
              `).join('') || '<p class="empty">—</p>'}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTimeline(lead) {
    const activity = Array.isArray(lead.activity_log) ? lead.activity_log : [];
    const notes = Array.isArray(lead.notes_history) ? lead.notes_history : [];
    const merged = [
      ...activity.map((item) => ({
        at: item.at,
        type: item.type || 'update',
        text: item.fields ? Object.entries(item.fields).map(([k, v]) => `${k}: ${v}`).join(', ') : 'Güncelleme',
        actor: item.actor
      })),
      ...notes.map((item) => ({
        at: item.at,
        type: 'note',
        text: item.text,
        actor: item.by
      }))
    ].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

    if (!merged.length) {
      return '<p class="empty">Henüz aktivite kaydı yok.</p>';
    }

    return `
      <ul class="crm-timeline">
        ${merged.slice(0, 40).map((item) => `
          <li>
            <div class="crm-timeline-dot"></div>
            <div>
              <div class="crm-timeline-meta">
                <span class="badge badge-blue">${deps.escapeHtml(item.type)}</span>
                <time>${item.at ? new Date(item.at).toLocaleString('tr-TR') : '—'}</time>
                ${item.actor ? `<span>${deps.escapeHtml(item.actor)}</span>` : ''}
              </div>
              <p>${deps.escapeHtml(item.text || '')}</p>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function openLeadDrawer(lead) {
    activeDrawerLead = lead;
    const drawer = el('lead-drawer');
    const overlay = el('lead-drawer-overlay');
    const content = el('lead-drawer-content');
    if (!drawer || !overlay || !content || !lead) return;

    const fmt = (v) => deps.escapeHtml(v || '—');
    const notesHistory = Array.isArray(lead.notes_history) ? lead.notes_history : [];

    content.innerHTML = `
      <div class="crm-drawer-tabs">
        <button type="button" class="is-active" data-drawer-tab="details">Detay</button>
        <button type="button" data-drawer-tab="timeline">Zaman çizelgesi</button>
        <button type="button" data-drawer-tab="followup">Takip</button>
      </div>
      <div class="crm-drawer-panel is-active" data-drawer-panel="details">
        <div class="table-actions crm-drawer-actions">
          ${lead.phone ? `<a class="btn btn-success btn-sm" href="tel:${lead.phone}">Ara</a>` : ''}
          ${['dispatch_failed', 'dispatch_dead'].includes(lead.partner_status) ? `<button class="btn btn-warning btn-sm" data-action="retry-dispatch" data-id="${lead.id}">Partner retry</button>` : ''}
        </div>
        <div class="lead-detail-grid">
          <div class="lead-detail-item"><div class="lead-detail-label">Ad</div><div class="lead-detail-value">${fmt(lead.contact_name)}</div></div>
          <div class="lead-detail-item"><div class="lead-detail-label">E-posta</div><div class="lead-detail-value">${fmt(lead.email)}</div></div>
          <div class="lead-detail-item"><div class="lead-detail-label">Telefon</div><div class="lead-detail-value">${fmt(lead.phone)}</div></div>
          <div class="lead-detail-item"><div class="lead-detail-label">Bütçe</div><div class="lead-detail-value">${lead.budget ? Number(lead.budget).toLocaleString('tr-TR') + ' ₺' : '—'}</div></div>
          <div class="lead-detail-item"><div class="lead-detail-label">Skor / Öncelik</div><div class="lead-detail-value">${fmt(lead.lead_score)} / ${fmt(lead.priority)}</div></div>
          <div class="lead-detail-item"><div class="lead-detail-label">Partner</div><div class="lead-detail-value">${fmt(lead.partner_route)} · ${fmt(lead.partner_status)}</div></div>
          <div class="lead-detail-item"><div class="lead-detail-label">Şehir</div><div class="lead-detail-value">${fmt(lead.city)} ${lead.district ? '/ ' + fmt(lead.district) : ''}</div></div>
          <div class="lead-detail-item"><div class="lead-detail-label">Araç</div><div class="lead-detail-value">${fmt(lead.vehicle)}</div></div>
        </div>
        <div class="lead-detail-item" style="margin-top:12px;">
          <div class="lead-detail-label">Yeni not</div>
          <textarea id="new-lead-note" class="form-input" rows="3" placeholder="Görüşme notu…"></textarea>
          <div style="height:8px"></div>
          <button class="btn btn-primary btn-sm" data-action="add-lead-note" data-id="${lead.id}" data-history='${deps.safeAttr(JSON.stringify(notesHistory))}'>Not ekle</button>
        </div>
      </div>
      <div class="crm-drawer-panel" data-drawer-panel="timeline">
        ${renderTimeline(lead)}
      </div>
      <div class="crm-drawer-panel" data-drawer-panel="followup">
        <div class="form-group">
          <label>Takip tarihi</label>
          <input type="datetime-local" class="form-input" id="follow-up-date" value="${lead.follow_up_at ? new Date(lead.follow_up_at).toISOString().slice(0, 16) : ''}">
        </div>
        <div class="crm-follow-presets">
          <button type="button" class="btn btn-ghost btn-sm" data-follow-preset="today">Bugün</button>
          <button type="button" class="btn btn-ghost btn-sm" data-follow-preset="tomorrow">Yarın</button>
          <button type="button" class="btn btn-ghost btn-sm" data-follow-preset="week">+7 gün</button>
        </div>
        <div class="actions">
          <button class="btn btn-primary btn-sm" data-action="save-follow-up" data-id="${lead.id}">Takibi kaydet</button>
          <button class="btn btn-outline btn-sm" data-action="complete-follow-up" data-id="${lead.id}">Tamamlandı</button>
        </div>
      </div>
    `;

    drawer.classList.add('open');
    overlay.classList.add('open');
  }

  function closeLeadDrawer() {
    el('lead-drawer')?.classList.remove('open');
    el('lead-drawer-overlay')?.classList.remove('open');
    activeDrawerLead = null;
  }

  async function loadCrmDashboard() {
    const target = el('crm-dashboard-metrics');
    if (!target) return;

    const { data: leads, error } = await deps.sb
      .from('auto_leads')
      .select('status, partner_status, lead_score, priority, estimated_revenue, actual_revenue, follow_up_at, follow_up_done, created_at');

    if (error) {
      target.innerHTML = `<p class="empty">CRM metrikleri yüklenemedi.</p>`;
      return;
    }

    const rows = leads || [];
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const newThisWeek = rows.filter((l) => l.created_at && new Date(l.created_at) >= weekAgo).length;
    const won = rows.filter((l) => ['won', 'closed'].includes(normalizeStatus(l.status)) || l.partner_status === 'won').length;
    const pipeline = rows.filter((l) => !['won', 'lost', 'spam'].includes(normalizeStatus(l.status))).length;
    const expected = rows.reduce((s, l) => s + Number(l.estimated_revenue || 0), 0);
    const actual = rows.reduce((s, l) => s + Number(l.actual_revenue || 0), 0);
    const hot = rows.filter((l) => ['hot', 'very_hot'].includes(l.priority)).length;
    const overdue = rows.filter((l) => l.follow_up_at && !l.follow_up_done && new Date(l.follow_up_at) < now).length;
    const conversion = rows.length ? Math.round((won / rows.length) * 100) : 0;

    target.innerHTML = `
      <div class="stat-grid crm-dashboard-grid">
        <div class="stat-card"><div class="stat-label">Bu hafta yeni</div><div class="stat-value">${newThisWeek}</div><div class="stat-sub">lead</div></div>
        <div class="stat-card"><div class="stat-label">Açık pipeline</div><div class="stat-value">${pipeline}</div><div class="stat-sub">aktif</div></div>
        <div class="stat-card"><div class="stat-label">Sıcak lead</div><div class="stat-value">${hot}</div><div class="stat-sub">hot / very_hot</div></div>
        <div class="stat-card"><div class="stat-label">Dönüşüm</div><div class="stat-value">${conversion}%</div><div class="stat-sub">kazanılan / toplam</div></div>
        <div class="stat-card"><div class="stat-label">Beklenen gelir</div><div class="stat-value">${Math.round(expected / 1000)}K</div><div class="stat-sub">₺ pipeline</div></div>
        <div class="stat-card"><div class="stat-label">Gerçekleşen</div><div class="stat-value">${Math.round(actual / 1000)}K</div><div class="stat-sub">₺ cash</div></div>
        <div class="stat-card"><div class="stat-label">Geciken takip</div><div class="stat-value">${overdue}</div><div class="stat-sub">acil</div></div>
      </div>
    `;
  }

  async function loadAuditLogs() {
    const target = el('crm-audit-list');
    if (!target) return;

    const { data, error } = await deps.sb
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      target.innerHTML = `<p class="empty">Audit log yüklenemedi: ${deps.escapeHtml(error.message)}</p>`;
      return;
    }

    if (!data?.length) {
      target.innerHTML = '<p class="empty">Henüz audit kaydı yok.</p>';
      return;
    }

    target.innerHTML = `
      <table class="table">
        <thead><tr><th>Zaman</th><th>Kullanıcı</th><th>İşlem</th><th>Özet</th></tr></thead>
        <tbody>
          ${data.map((row) => `
            <tr>
              <td class="cell-nowrap">${row.created_at ? new Date(row.created_at).toLocaleString('tr-TR') : '—'}</td>
              <td>${deps.escapeHtml(row.actor_email || '—')}</td>
              <td><span class="badge badge-blue">${deps.escapeHtml(row.action)}</span> ${deps.escapeHtml(row.entity_table || '')}</td>
              <td>${deps.escapeHtml(row.summary || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async function exportFilteredCsv() {
    readFiltersFromDom();
    const { data, error } = await deps.sb.from('auto_leads').select('*').order('created_at', { ascending: false }).limit(5000);
    if (error) {
      deps.toast(`CSV hata: ${error.message}`, 'error');
      return;
    }
    const rows = applyClientFilters(data || []);
    if (!rows.length) {
      deps.toast('Dışa aktarılacak lead yok', 'error');
      return;
    }
    deps.exportAutoLeadsCsv?.(rows);
  }

  function bindEvents() {
    document.getElementById('crm-view-list')?.addEventListener('click', () => {
      state.view = 'list';
      document.getElementById('crm-view-list')?.classList.add('is-active');
      document.getElementById('crm-view-pipeline')?.classList.remove('is-active');
      renderLeads();
    });

    document.getElementById('crm-view-pipeline')?.addEventListener('click', () => {
      state.view = 'pipeline';
      document.getElementById('crm-view-pipeline')?.classList.add('is-active');
      document.getElementById('crm-view-list')?.classList.remove('is-active');
      renderLeads();
    });

    document.getElementById('crm-apply-filters')?.addEventListener('click', () => {
      state.page = 0;
      fetchLeadPage();
    });

    document.getElementById('crm-reset-filters')?.addEventListener('click', () => {
      ['crm-search', 'crm-status-filter', 'crm-follow-filter', 'crm-priority-filter', 'crm-partner-filter', 'crm-date-from', 'crm-date-to', 'crm-min-score'].forEach((id) => {
        const node = el(id);
        if (node) node.value = '';
      });
      if (el('crm-notes-only')) el('crm-notes-only').checked = false;
      state.page = 0;
      fetchLeadPage();
    });

    el('crm-pagination')?.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-crm-page]');
      if (!btn || btn.disabled) return;
      if (btn.dataset.crmPage === 'prev') state.page = Math.max(0, state.page - 1);
      if (btn.dataset.crmPage === 'next') state.page += 1;
      fetchLeadPage();
    });

    const debounceFilter = () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.page = 0;
        fetchLeadPage();
      }, 320);
    };

    ['crm-search', 'crm-status-filter', 'crm-follow-filter', 'crm-priority-filter', 'crm-partner-filter', 'crm-date-from', 'crm-date-to', 'crm-min-score', 'crm-page-size', 'crm-notes-only'].forEach((id) => {
      const node = el(id);
      node?.addEventListener('input', debounceFilter);
      node?.addEventListener('change', debounceFilter);
    });

    el('lead-drawer-content')?.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-drawer-tab]');
      if (!tab) return;
      const name = tab.dataset.drawerTab;
      el('lead-drawer-content')?.querySelectorAll('[data-drawer-tab]').forEach((b) => b.classList.toggle('is-active', b === tab));
      el('lead-drawer-content')?.querySelectorAll('[data-drawer-panel]').forEach((p) => {
        p.classList.toggle('is-active', p.dataset.drawerPanel === name);
      });
    });

    el('lead-drawer-content')?.addEventListener('click', (event) => {
      const preset = event.target.closest('[data-follow-preset]');
      if (!preset) return;
      const input = el('follow-up-date');
      if (!input) return;
      const date = new Date();
      if (preset.dataset.followPreset === 'tomorrow') date.setDate(date.getDate() + 1);
      if (preset.dataset.followPreset === 'week') date.setDate(date.getDate() + 7);
      input.value = date.toISOString().slice(0, 16);
    });

    document.addEventListener('change', (event) => {
      if (event.target.matches('[data-crm-select-all]')) {
        const checked = event.target.checked;
        state.rows.forEach((lead) => {
          if (checked) state.selected.add(lead.id);
          else state.selected.delete(lead.id);
        });
        document.querySelectorAll('[data-crm-select]').forEach((box) => {
          box.checked = checked;
        });
      }
      if (event.target.matches('[data-crm-select]')) {
        const id = event.target.dataset.crmSelect;
        if (event.target.checked) state.selected.add(id);
        else state.selected.delete(id);
      }
    });
  }

  return {
    state,
    fetchLeadPage,
    openLeadDrawer,
    closeLeadDrawer,
    loadCrmDashboard,
    loadAuditLogs,
    exportFilteredCsv,
    bindEvents,
    getActiveDrawerLead: () => activeDrawerLead
  };
}
