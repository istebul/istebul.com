import { escapeHtml, safeAttr } from '../core/dom-safe.js';
import { fetchAdminTable, renderAdminDataSourceNotices } from './admin-query.js';
import {
  formatPartnerEndpointTestError,
  healthStatusBadge,
  isPartnerEndpointUuid,
  maskAuthSecret,
  renderRouteTypeOptions,
  routeTypeLabel,
  sanitizePartnerEndpointRow
} from '../features/admin/partner-endpoints.js';

function getSupabaseEdgeConfig() {
  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: String(url).replace(/\/$/, ''), key };
}

export function initPartnerEndpointsAdmin(ctx) {
  const { sb, adminAction, toast } = ctx;

  async function testPartnerEndpoint(endpointId) {
    const normalizedId = String(endpointId || '').trim();
    if (!normalizedId) {
      toast(formatPartnerEndpointTestError({ error: 'endpoint_id_required' }), 'error');
      return;
    }
    if (!isPartnerEndpointUuid(normalizedId)) {
      toast(`Geçersiz endpoint ID: ${normalizedId}`, 'error');
      return;
    }

    const config = getSupabaseEdgeConfig();
    if (!config) {
      toast('SUPABASE yapılandırması eksik', 'error');
      return;
    }

    const { data: localRow, error: localError } = await sb
      .from('partner_endpoints')
      .select('id,name')
      .eq('id', normalizedId)
      .maybeSingle();

    if (localError) {
      toast(`Endpoint sorgusu başarısız: ${localError.message}`, 'error');
      return;
    }
    if (!localRow) {
      toast(formatPartnerEndpointTestError({ error: 'endpoint_stale_list' }), 'error');
      await loadPartnerEndpoints();
      return;
    }

    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      toast('Oturum bulunamadı', 'error');
      return;
    }

    let data = {};
    try {
      const response = await fetch(`${config.url}/functions/v1/partner-endpoint-test`, {
        method: 'POST',
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint_id: normalizedId })
      });
      data = await response.json().catch(() => ({}));
      if (response.ok && data?.ok) {
        toast(`Test OK — HTTP ${data.status || response.status}`, 'success');
      } else if (data?.error === 'endpoint_not_found') {
        toast(formatPartnerEndpointTestError({ error: 'endpoint_edge_mismatch', endpoint_id: normalizedId }), 'error');
      } else {
        toast(formatPartnerEndpointTestError(data), 'error');
      }
    } catch (err) {
      toast(err?.message || 'Test gönderimi başarısız', 'error');
    }
    loadPartnerEndpoints();
  }

  async function createPartnerEndpoint() {
    const name = document.getElementById('partner-name')?.value?.trim();
    const routeType = document.getElementById('partner-route-type')?.value;
    const webhookUrl = document.getElementById('partner-webhook-url')?.value?.trim();
    const priorityWeight = Number(document.getElementById('partner-priority-weight')?.value || 100);
    const dailyCapRaw = document.getElementById('partner-daily-cap')?.value;
    const authSecret = document.getElementById('partner-auth-secret')?.value?.trim();
    const notes = document.getElementById('partner-notes')?.value || '';
    const isActive = document.getElementById('partner-is-active')?.checked !== false;

    if (!name || !routeType || !webhookUrl) {
      toast('Partner adı, route type ve webhook URL zorunlu.', 'error');
      return;
    }

    const values = {
      name,
      route_type: routeType,
      webhook_url: webhookUrl,
      is_active: isActive,
      priority_weight: priorityWeight,
      daily_cap: dailyCapRaw ? Number(dailyCapRaw) : null,
      notes
    };
    if (authSecret) values.shared_secret = authSecret;

    await adminAction({
      action: 'insert',
      table: 'partner_endpoints',
      id: 'new',
      values
    });

    toast('Partner endpoint eklendi');
    ['partner-name', 'partner-webhook-url', 'partner-daily-cap', 'partner-notes', 'partner-auth-secret'].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      }
    );
    loadPartnerEndpoints();
  }

  async function togglePartnerEndpoint(id, active) {
    await adminAction({
      action: 'update',
      table: 'partner_endpoints',
      id,
      values: { is_active: active === 'true' }
    });
    toast('Partner endpoint güncellendi');
    loadPartnerEndpoints();
  }

  async function updatePartnerEndpointSecret(id) {
    const secret = window.prompt('Yeni auth secret (boş bırakırsanız iptal):');
    if (!secret) return;
    await adminAction({
      action: 'update',
      table: 'partner_endpoints',
      id,
      values: { shared_secret: secret.trim() }
    });
    toast('Auth secret güncellendi');
    loadPartnerEndpoints();
  }

  async function loadPartnerEndpoints() {
    const el = document.getElementById('partner-endpoints-list');
    if (!el) return;

    const res = await fetchAdminTable(sb, {
      table: 'partner_endpoints',
      limit: 200,
      order: { column: 'created_at', ascending: false },
      direct: () =>
        sb
          .from('partner_endpoints')
          .select(
            'id,name,route_type,webhook_url,is_active,priority_weight,daily_cap,sent_today,health_status,last_success_at,last_failure_at,consecutive_failures,notes,created_at'
          )
          .order('priority_weight', { ascending: false })
    });

    if (res.error && !(res.data || []).length) {
      el.innerHTML = `${renderAdminDataSourceNotices([res])}<p class="empty">Hata: ${escapeHtml(res.error.message)}</p>`;
      return;
    }

    const data = (res.data || []).map(sanitizePartnerEndpointRow);
    if (!data.length) {
      el.innerHTML = '<p class="empty">Partner endpoint yok. Webhook.site URL ile test endpoint ekleyebilirsiniz.</p>';
      return;
    }

    el.innerHTML = `
      ${renderAdminDataSourceNotices([res])}
      <table class="table">
        <thead>
          <tr>
            <th>Ad</th>
            <th>Route</th>
            <th>Webhook</th>
            <th>Secret</th>
            <th>Aktif</th>
            <th>Öncelik</th>
            <th>Günlük limit</th>
            <th>Bugün</th>
            <th>Sağlık</th>
            <th>Son başarı</th>
            <th>Son hata</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map((row) => {
              const health = healthStatusBadge(row.health_status);
              return `<tr>
                <td><strong>${escapeHtml(row.name)}</strong></td>
                <td>${escapeHtml(routeTypeLabel(row.route_type))}</td>
                <td class="cell-nowrap" title="${safeAttr(row.webhook_url || '')}">${escapeHtml((row.webhook_url || '—').slice(0, 42))}${(row.webhook_url || '').length > 42 ? '…' : ''}</td>
                <td>${row.has_auth_secret ? escapeHtml(maskAuthSecret('configured')) : '<span class="text-muted-sm">yok</span>'}</td>
                <td>${row.is_active ? '✓' : '—'}</td>
                <td>${row.priority_weight || 0}</td>
                <td>${row.daily_cap ?? '∞'}</td>
                <td>${row.sent_today || 0}</td>
                <td><span class="badge ${health.badge}">${escapeHtml(health.label)}</span></td>
                <td class="cell-nowrap">${row.last_success_at ? escapeHtml(new Date(row.last_success_at).toLocaleString('tr-TR')) : '—'}</td>
                <td class="cell-nowrap">${row.last_failure_at ? escapeHtml(new Date(row.last_failure_at).toLocaleString('tr-TR')) : '—'}</td>
                <td class="table-actions">
                  <button type="button" class="btn btn-ghost btn-sm" data-action="test-partner-endpoint" data-id="${safeAttr(row.id)}">Test gönder</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-partner-endpoint" data-id="${safeAttr(row.id)}" data-active="${row.is_active ? 'false' : 'true'}">${row.is_active ? 'Pasif' : 'Aktif'}</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-action="rotate-partner-secret" data-id="${safeAttr(row.id)}">Secret</button>
                </td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>`;
  }

  function mountRouteTypeSelect() {
    const select = document.getElementById('partner-route-type');
    if (!select || select.dataset.mounted === '1') return;
    const current = select.value;
    select.innerHTML = renderRouteTypeOptions(current);
    select.dataset.mounted = '1';
  }

  async function handlePartnerEndpointsAction(event, el) {
    const action = el?.dataset?.action;
    const id = el?.dataset?.id;
    if (action === 'create-partner-endpoint') {
      await createPartnerEndpoint();
      return true;
    }
    if (action === 'test-partner-endpoint' && id) {
      await testPartnerEndpoint(id);
      return true;
    }
    if (action === 'toggle-partner-endpoint' && id) {
      await togglePartnerEndpoint(id, el.dataset.active);
      return true;
    }
    if (action === 'rotate-partner-secret' && id) {
      await updatePartnerEndpointSecret(id);
      return true;
    }
    return false;
  }

  return {
    loadPartnerEndpoints,
    mountRouteTypeSelect,
    handlePartnerEndpointsAction,
    testPartnerEndpoint
  };
}
