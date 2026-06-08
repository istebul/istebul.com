import { escapeHtml, safeAttr } from '../core/dom-safe.js';
import { optionLabel } from '../kasko/kasko-config.js';
import {
  enrichVerticalLeadsDispatch,
  renderVerticalDispatchDetail,
  verticalDispatchBadge
} from '../features/admin/vertical-partner-dispatch.js';
import { fetchAdminTable, renderAdminDataSourceNotices } from './admin-query.js';
import { setAdminRootLoading } from './admin-page-routing.js';

function renderError(el, res, label) {
  const msg = res?.error?.message || res?.error || 'Veri yüklenemedi';
  el.innerHTML = `<p class="empty">${escapeHtml(label)}: ${escapeHtml(String(msg))}</p>`;
}

function kaskoVehicleCategory(row) {
  const profile =
    row?.profile_json && typeof row.profile_json === 'object' ? row.profile_json : {};
  return String(profile.vehicle_category || row.vehicle_info || '').trim();
}

function kaskoCoverageLabel(row) {
  const profile =
    row?.profile_json && typeof row.profile_json === 'object' ? row.profile_json : {};
  const level = profile.coverage_level || row.coverage_preference || '';
  if (!level) return '—';
  return optionLabel('coverage_level', level) || level;
}

export function initKaskoAdmin(ctx) {
  const { sb, adminAction, toast } = ctx;
  return {
    loadKaskoLeads: () => loadKaskoLeads(sb, adminAction, toast),
    handleKaskoAction: (event, el) => handleKaskoAction(event, el, { adminAction, toast })
  };
}

async function loadKaskoLeads(sb, adminAction, toast) {
  const el = document.getElementById('kasko-leads-list');
  if (!el) return;
  setAdminRootLoading('kasko-leads-list');
  const res = await fetchAdminTable(sb, {
    table: 'kasko_leads',
    limit: 1500,
    order: { column: 'created_at', ascending: false },
    direct: () => sb.from('kasko_leads').select('*').order('created_at', { ascending: false }).limit(1500)
  });
  if (res.error && !res.data?.length) return renderError(el, res, 'Kasko leadleri');
  const warnings = renderAdminDataSourceNotices([res]);
  const search = (document.getElementById('kasko-leads-search')?.value || '').toLowerCase().trim();
  const status = document.getElementById('kasko-leads-status-filter')?.value || '';
  const category = document.getElementById('kasko-leads-category-filter')?.value || '';
  const rows = (res.data || []).filter((row) => {
    if (status && row.status !== status) return false;
    if (category && kaskoVehicleCategory(row) !== category) return false;
    if (!search) return true;
    const vehicleCategory = kaskoVehicleCategory(row);
    return [row.full_name, row.email, row.phone, row.vehicle_info, row.coverage_preference, row.ai_summary, vehicleCategory]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search);
  });
  if (!rows.length) {
    el.innerHTML = `${warnings}<p class="empty">Filtreye uygun kasko lead kaydı yok.</p>`;
    return;
  }
  const enrichedRows = await enrichVerticalLeadsDispatch(sb, rows);
  el.innerHTML = `${warnings}<table class="table"><thead><tr>
    <th>Tarih</th><th>Araç kategorisi</th><th>Teminat</th><th>Skor</th><th>İletişim</th><th>AI özeti</th><th>Partner</th><th>Durum</th>
  </tr></thead><tbody>${
    enrichedRows
      .map((r) => {
        const dispatchBadge = verticalDispatchBadge(r.partner_dispatch_status);
        const vehicleCategory = kaskoVehicleCategory(r);
        const vehicleLabel = vehicleCategory
          ? optionLabel('vehicle_category', vehicleCategory) || vehicleCategory
          : '—';
        return `<tr>
      <td class="cell-nowrap">${new Date(r.created_at).toLocaleString('tr-TR')}</td>
      <td>${escapeHtml(vehicleLabel)}</td>
      <td>${escapeHtml(kaskoCoverageLabel(r))}</td>
      <td><strong>${escapeHtml(String(r.decision_score ?? '—'))}</strong></td>
      <td>${escapeHtml(r.full_name || '—')}<br><span class="text-muted-sm">${escapeHtml(r.phone || r.email || '—')}</span></td>
      <td>${escapeHtml((r.ai_summary || '—').slice(0, 100))}</td>
      <td><span class="badge ${dispatchBadge.badge}">${escapeHtml(dispatchBadge.label)}</span></td>
      <td><select class="status-select" data-action="kasko-update-status" data-id="${safeAttr(r.id)}">
        ${['new', 'incelendi', 'arandi', 'uygun', 'partnere_yonlendirildi', 'kapandi', 'reddedildi']
          .map((s) => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`)
          .join('')}
      </select></td>
    </tr>
    <tr><td colspan="8">${renderVerticalDispatchDetail(r, 'kasko_leads')}</td></tr>`;
      })
      .join('')
  }</tbody></table>`;

  el.querySelectorAll('[data-action="kasko-update-status"]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await adminAction({ action: 'update', table: 'kasko_leads', id: sel.dataset.id, values: { status: sel.value } });
      toast('Kasko lead durumu güncellendi');
    });
  });
}

async function handleKaskoAction(event, el, { adminAction, toast }) {
  if (el?.dataset?.action !== 'kasko-update-status') return false;
  return true;
}
