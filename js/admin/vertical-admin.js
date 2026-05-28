/**
 * Konut & Finans vertical leads (vertical_leads table).
 */
export function initVerticalAdmin({ sb, adminAction, toast }) {
  async function loadVerticalLeads(vertical = '') {
    const mount = document.getElementById('vertical-leads-list');
    if (!mount) return;
    mount.innerHTML = '<div class="empty">Yükleniyor…</div>';

    const search = document.getElementById('vertical-leads-search')?.value?.trim() || '';
    const filterVertical = document.getElementById('vertical-leads-vertical-filter')?.value || vertical;

    const res = await adminAction({
      action: 'list',
      table: 'vertical_leads',
      order: 'created_at',
      ascending: false,
      limit: 80
    });

    if (!res?.ok || !Array.isArray(res.data)) {
      mount.innerHTML = '<div class="empty">Lead listesi yüklenemedi.</div>';
      return;
    }

    let rows = res.data;
    if (filterVertical) rows = rows.filter((r) => r.vertical === filterVertical);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.full_name || '').toLowerCase().includes(q) ||
          String(r.email || '').toLowerCase().includes(q) ||
          String(r.phone || '').includes(q)
      );
    }

    if (!rows.length) {
      mount.innerHTML = '<div class="empty">Kayıt bulunamadı.</div>';
      return;
    }

    mount.innerHTML = rows
      .map(
        (r) => `
      <article class="admin-card">
        <header>
          <strong>${escape(r.vertical)} · ${escape(r.selected_option || '—')}</strong>
          <span class="badge">${escape(r.status)}</span>
        </header>
        <p>${escape(r.full_name || '—')} · ${escape(r.email || '—')} · ${escape(r.phone || '—')}</p>
        <p>Skor: ${r.decision_score ?? '—'} · ${escape(r.result_summary || '')}</p>
        <time>${escape(new Date(r.created_at).toLocaleString('tr-TR'))}</time>
      </article>`
      )
      .join('');
  }

  function escape(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { loadVerticalLeads };
}
