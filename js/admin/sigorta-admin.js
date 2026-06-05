import { escapeHtml, safeAttr } from '../core/dom-safe.js';
import {
  renderVerticalDispatchDetail,
  verticalDispatchBadge
} from '../features/admin/vertical-partner-dispatch.js';
import { fetchAdminTable, renderAdminDataSourceNotices } from './admin-query.js';
import { setAdminRootLoading } from './admin-page-routing.js';

function renderError(el, res, label) {
  const msg = res?.error?.message || res?.error || 'Veri yüklenemedi';
  el.innerHTML = `<p class="empty">${escapeHtml(label)}: ${escapeHtml(String(msg))}</p>`;
}

export function initSigortaAdmin(ctx) {
  const { sb, adminAction, toast } = ctx;
  return {
    loadSigortaLeads: () => loadSigortaLeads(sb, adminAction, toast),
    handleSigortaAction: (event, el) => handleSigortaAction(event, el, { adminAction, toast })
  };
}

async function loadSigortaLeads(sb, adminAction, toast) {
  const el = document.getElementById('sigorta-leads-list');
  if (!el) return;
  setAdminRootLoading('sigorta-leads-list');
  const res = await fetchAdminTable(sb, {
    table: 'sigorta_leads',
    limit: 1500,
    order: { column: 'created_at', ascending: false },
    direct: () => sb.from('sigorta_leads').select('*').order('created_at', { ascending: false }).limit(1500)
  });
  if (res.error && !res.data?.length) return renderError(el, res, 'Sigorta leadleri');
  const warnings = renderAdminDataSourceNotices([res]);
  const search = (document.getElementById('sigorta-leads-search')?.value || '').toLowerCase().trim();
  const status = document.getElementById('sigorta-leads-status-filter')?.value || '';
  const rows = (res.data || []).filter((row) => {
    if (status && row.status !== status) return false;
    if (!search) return true;
    return [row.full_name, row.email, row.phone, row.insurance_type, row.interest_type, row.ai_summary]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search);
  });
  if (!rows.length) {
    el.innerHTML = `${warnings}<p class="empty">Filtreye uygun sigorta lead kaydı yok.</p>`;
    return;
  }
  el.innerHTML = `${warnings}<table class="table"><thead><tr>
    <th>Tarih</th><th>İlgi</th><th>Tür</th><th>Skor</th><th>Koruma</th><th>Teminat</th><th>Verimlilik</th><th>Risk</th><th>AI özeti</th><th>Partner</th><th>Durum</th>
  </tr></thead><tbody>${
    rows
      .map(
        (r) => {
          const dispatchBadge = verticalDispatchBadge(r.partner_dispatch_status);
          return `<tr>
      <td class="cell-nowrap">${new Date(r.created_at).toLocaleString('tr-TR')}</td>
      <td>${escapeHtml(r.interest_type || '—')}</td>
      <td>${escapeHtml(r.insurance_type || '—')}</td>
      <td><strong>${escapeHtml(String(r.decision_score ?? '—'))}</strong></td>
      <td>${escapeHtml(String(r.protection_score ?? '—'))}</td>
      <td>${escapeHtml(String(r.coverage_score ?? '—'))}</td>
      <td>${escapeHtml(String(r.cost_efficiency_score ?? '—'))}</td>
      <td>${escapeHtml(r.overall_risk || '—')}</td>
      <td>${escapeHtml((r.ai_summary || '—').slice(0, 100))}</td>
      <td><span class="badge ${dispatchBadge.badge}">${escapeHtml(dispatchBadge.label)}</span></td>
      <td><select class="status-select" data-action="sigorta-update-status" data-id="${safeAttr(r.id)}">
        ${['new', 'incelendi', 'arandi', 'uygun', 'partnere_yonlendirildi', 'kapandi', 'reddedildi']
          .map((s) => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`)
          .join('')}
      </select></td>
    </tr>
    <tr><td colspan="11">${renderVerticalDispatchDetail(r, 'sigorta_leads')}</td></tr>`;
        }
      )
      .join('')
  }</tbody></table>`;

  el.querySelectorAll('[data-action="sigorta-update-status"]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await adminAction({ action: 'update', table: 'sigorta_leads', id: sel.dataset.id, values: { status: sel.value } });
      toast('Sigorta lead durumu güncellendi');
    });
  });
}

async function handleSigortaAction(event, el, { adminAction, toast }) {
  if (el?.dataset?.action !== 'sigorta-update-status') return false;
  return true;
}
