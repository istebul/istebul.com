/**
 * Konut & Finans vertical leads (vertical_leads table).
 */
import { escapeHtml } from '../core/dom-safe.js';
import {
  fetchAdminTable,
  renderAdminDataSourceNotices
} from './admin-query.js';
import { setAdminRootLoading } from './admin-page-routing.js';

function renderVerticalLoadError(mount, res, label) {
  const msg = res?.error?.message || res?.error || 'Veri yüklenemedi';
  mount.innerHTML = `
    <div class="empty">${escapeHtml(label)}: ${escapeHtml(String(msg))}</div>
    <p class="text-muted-sm" style="margin-top:8px">Edge: <code>supabase functions deploy admin-action</code></p>
  `;
}

export function initVerticalAdmin({ sb }) {
  async function loadVerticalLeads(vertical = '') {
    const mount = document.getElementById('vertical-leads-list');
    if (!mount) return;

    setAdminRootLoading('vertical-leads-list');

    try {
      const search = document.getElementById('vertical-leads-search')?.value?.trim() || '';
      const filterVertical =
        document.getElementById('vertical-leads-vertical-filter')?.value || vertical;

      const res = await fetchAdminTable(sb, {
        table: 'vertical_leads',
        limit: 500,
        order: { column: 'created_at', ascending: false },
        direct: () =>
          sb
            .from('vertical_leads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500)
      });

      if (res.error && !res.data?.length) {
        renderVerticalLoadError(mount, res, 'Dikey lead listesi');
        return;
      }

      const banner = renderAdminDataSourceNotices([res]);
      let rows = res.data || [];
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
        mount.innerHTML = `${banner}<div class="empty">${(res.data || []).length ? 'Filtreye uygun kayıt yok.' : 'Henüz dikey lead kaydı yok.'}</div>`;
        return;
      }

      mount.innerHTML = `${banner}${rows
        .map(
          (r) => `
      <article class="admin-card">
        <header>
          <strong>${escapeHtml(r.vertical)} · ${escapeHtml(r.selected_option || '—')}</strong>
          <span class="badge">${escapeHtml(r.status)}</span>
        </header>
        <p>${escapeHtml(r.full_name || '—')} · ${escapeHtml(r.email || '—')} · ${escapeHtml(r.phone || '—')}</p>
        <p>Skor: ${escapeHtml(String(r.decision_score ?? '—'))} · ${escapeHtml(r.result_summary || '')}</p>
        <time>${escapeHtml(new Date(r.created_at).toLocaleString('tr-TR'))}</time>
      </article>`
        )
        .join('')}`;
    } catch (err) {
      renderVerticalLoadError(mount, { error: err }, 'Dikey lead listesi');
    }
  }

  return { loadVerticalLeads };
}
