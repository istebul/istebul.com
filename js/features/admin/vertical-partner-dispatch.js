/**
 * Admin CRM helpers for vertical partner dispatch status display.
 */

import { escapeHtml } from '../../core/dom-safe.js';

export const VERTICAL_DISPATCH_STATUSES = Object.freeze({
  pending: { label: 'Bekliyor', badge: 'badge-blue' },
  sent: { label: 'Gönderildi', badge: 'badge-green' },
  failed: { label: 'Hata', badge: 'badge-yellow' },
  dead: { label: 'Retry tükendi', badge: 'badge-red' }
});

export function verticalDispatchBadge(status) {
  const meta = VERTICAL_DISPATCH_STATUSES[status];
  if (meta) return meta;
  return { label: status || '—', badge: 'badge-blue' };
}

export function formatVerticalDispatchAt(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatVerticalDispatchError(error) {
  if (!error) return '—';
  return String(error).slice(0, 120);
}

export function renderVerticalDispatchDetail(row, leadTable) {
  const badge = verticalDispatchBadge(row.partner_dispatch_status);
  const endpoint = row.partner_endpoint_id
    ? String(row.partner_endpoint_id).slice(0, 8) + '…'
    : '—';

  return `
    <div class="vertical-dispatch-panel" style="margin-top:8px;padding:10px;background:var(--surface-2,#f6f7f9);border-radius:8px;">
      <div class="text-muted-sm" style="margin-bottom:6px;"><strong>Partner dispatch</strong></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;font-size:13px;">
        <div><span class="text-muted-sm">Endpoint</span><br><code>${escapeHtml(endpoint)}</code></div>
        <div><span class="text-muted-sm">Durum</span><br><span class="badge ${badge.badge}">${escapeHtml(badge.label)}</span></div>
        <div><span class="text-muted-sm">Son gönderim</span><br>${escapeHtml(formatVerticalDispatchAt(row.partner_dispatch_at))}</div>
        <div><span class="text-muted-sm">Retry</span><br>${escapeHtml(String(row.partner_dispatch_retry_count || 0))}/5</div>
      </div>
      ${row.partner_dispatch_error ? `<p class="text-muted-sm" style="margin-top:8px;color:#b45309;">Hata: ${escapeHtml(formatVerticalDispatchError(row.partner_dispatch_error))}</p>` : ''}
      ${['failed', 'pending', 'dead'].includes(String(row.partner_dispatch_status)) ? `
        <button type="button" class="btn btn-sm btn-secondary" style="margin-top:8px"
          data-action="vertical-retry-dispatch"
          data-lead-table="${escapeHtml(leadTable)}"
          data-id="${escapeHtml(String(row.id))}">
          Partner'a gönder
        </button>` : ''}
    </div>`;
}

export async function manualVerticalDispatch(sb, { leadId, leadTable, force = false, toast }) {
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    toast?.('Oturum bulunamadı', 'error');
    return { ok: false };
  }

  const { data, error } = await sb.functions.invoke('partner-dispatch', {
    body: { lead_id: leadId, lead_table: leadTable, force },
    headers: { Authorization: `Bearer ${token}` }
  });

  if (error) {
    toast?.(error.message || 'Dispatch başarısız', 'error');
    return { ok: false, error };
  }

  if (data?.ok) {
    toast?.(`Partner teslimatı: ${data.endpoint || 'OK'}`, 'success');
  } else {
    toast?.(data?.error || data?.reason || 'Dispatch başarısız', 'error');
  }

  return { ok: Boolean(data?.ok), data };
}
